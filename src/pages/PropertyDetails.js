import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import GalleryCarousel  from "../components/GalleryCarousel";
import VideoModal       from "../components/VideoModal";
import Amenities        from "../components/Amenities";
import ImageZoomModal   from "../components/ImageZoomModal";
import NearbyLocations  from "../components/NearbyLocations";
import { BadgeCheck, Share2, Heart, Download } from "lucide-react";
import "../styles/PropertyDetails.css";
import AskDiscoverWidget from "./AskDiscoverWidget";

/* ─── API base ───────────────────────────────────────────────────────────────
   Set  REACT_APP_API_BASE=http://localhost:8080  in your .env.development
   Set  REACT_APP_API_BASE=https://your-prod-url  in your .env.production    */
const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:8080";

/* ─── JaaS App ID — set REACT_APP_JAAS_APP_ID in .env ───────────────────────
   Get yours free at https://jaas.8x8.vc
   Format: vpaas-magic-cookie-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx              */
const JAAS_APP_ID = process.env.REACT_APP_JAAS_APP_ID || "";

/* ─── Google Maps key ────────────────────────────────────────────────────────
   FIX (Critical): Removed hardcoded API key fallback. Key must be set in .env.
   Restrict key to your domain in GCP Console → Credentials.               */
const GMAPS_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
if (!GMAPS_KEY) {
  console.error("[Config] REACT_APP_GOOGLE_MAPS_API_KEY is not set. Map features will be disabled.");
}

/* ─── Allowed origins for brochure download URL validation ──────────────────
   FIX (Security): Prevent open redirect via untrusted API-returned URLs.
   Add your CDN / S3 bucket origin here.                                   */
const ALLOWED_DOWNLOAD_ORIGINS = [
  window.location.origin,
  // e.g. "https://your-bucket.s3.amazonaws.com",
];

/* ─── Safe localStorage wrapper ─────────────────────────────────────────────
   FIX: Handles iOS Safari private mode QuotaExceededError and ITP silently. */
const safeStorage = {
  get:    (key) => { try { return localStorage.getItem(key); }    catch { return null; } },
  set:    (key, val) => { try { localStorage.setItem(key, val); } catch {} },
  remove: (key) => { try { localStorage.removeItem(key); }        catch {} },
};

/* ─── HTML escape helper ─────────────────────────────────────────────────────
   FIX (XSS): Sanitize API strings before injecting into Maps InfoWindow HTML. */
function escHtml(str) {
  return String(str ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
}

/* ─── Price formatter — defined OUTSIDE component so it's never recreated ── */
function formatIndianPrice(price) {
  if (!price) return "";
  if (price >= 10_000_000) return `₹ ${(price / 10_000_000).toFixed(2)} Cr`;
  if (price >= 100_000)    return `₹ ${(price / 100_000).toFixed(2)} L`;
  return `₹ ${price.toLocaleString("en-IN")}`;
}

/* ─── SEO helpers — set document meta tags ──────────────────────────────────
   FIX (SEO): Inject title, Open Graph tags, and JSON-LD structured data.   */
function setMetaTag(property, content) {
  let el = document.querySelector(`meta[property="${property}"]`)
      || document.querySelector(`meta[name="${property}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(property.startsWith("og:") ? "property" : "name", property);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content || "");
}

function injectPropertySchema(prop) {
  const existing = document.getElementById("property-schema");
  if (existing) existing.remove();
  const schema = {
    "@context": "https://schema.org",
    "@type": "RealEstateListing",
    "name": prop.title,
    "description": prop.description,
    "url": window.location.href,
    "image": prop.mainImages?.[0] || prop.images?.[0],
    "address": {
      "@type": "PostalAddress",
      "streetAddress": prop.location || prop.address,
      "addressCountry": "IN",
    },
    "offers": {
      "@type": "Offer",
      "price": prop.price,
      "priceCurrency": "INR",
    },
  };
  const script = document.createElement("script");
  script.id = "property-schema";
  script.type = "application/ld+json";
  script.textContent = JSON.stringify(schema);
  document.head.appendChild(script);
}

/* ─── Google Maps SDK loader — singleton Promise, no polling interval ────────
   FIX (Performance): Replaced setInterval polling with a stored Promise.
   Added 10-second timeout so a failed load rejects cleanly.               */
let _mapsPromise = null;
function loadGoogleMaps() {
  if (!GMAPS_KEY) return Promise.reject(new Error("Maps API key not configured"));

  if (_mapsPromise) return _mapsPromise;

  if (typeof window.google?.maps?.Map === "function") {
    _mapsPromise = Promise.resolve();
    return _mapsPromise;
  }

  _mapsPromise = new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error("Google Maps load timeout after 10s"));
    }, 10000);

    const existingScript = document.getElementById("gmaps-sdk");
    if (existingScript) {
      // Script tag already appended by a previous render — wait for it
      existingScript.addEventListener("load", () => { clearTimeout(timeoutId); resolve(); }, { once: true });
      existingScript.addEventListener("error", () => { clearTimeout(timeoutId); reject(new Error("Maps SDK load error")); }, { once: true });
      return;
    }

    const script   = document.createElement("script");
    script.id      = "gmaps-sdk";
    script.src     = `https://maps.googleapis.com/maps/api/js?key=${GMAPS_KEY}&libraries=places`;
    script.async   = true;
    script.defer   = true;
    script.onload  = () => { clearTimeout(timeoutId); resolve(); };
    script.onerror = () => { clearTimeout(timeoutId); reject(new Error("Failed to load Google Maps")); };
    document.head.appendChild(script);
  });

  // Reset cached promise on failure so retries work
  _mapsPromise.catch(() => { _mapsPromise = null; });
  return _mapsPromise;
}

/* ─── JaaS JWT fetch ─────────────────────────────────────────────────────── */
async function fetchJaasToken(userName, roomName, isModerator = false) {
  try {
    const res = await fetch(`${API_BASE}/api/live-tour/jaas-token`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ userName, roomName, moderator: String(isModerator) }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.token || null;
  } catch {
    return null;
  }
}

/* ─── Loading skeleton ───────────────────────────────────────────────────────
   FIX (UX / CLS): Replace plain <p>Loading…</p> with a layout-accurate skeleton
   that prevents cumulative layout shift.                                   */
function PropertyDetailsSkeleton() {
  return (
      <div className="details-container">
        <div className="details-topbar">
          <div className="skel" style={{ height: 34, width: 140, borderRadius: 8 }} />
          <div style={{ display: "flex", gap: 8 }}>
            {[1, 2, 3, 4].map(i => (
                <div key={i} className="skel" style={{ width: 42, height: 42, borderRadius: "50%" }} />
            ))}
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, gap: 20 }}>
          <div style={{ flex: 1 }}>
            <div className="skel" style={{ height: 32, width: "72%", marginBottom: 10 }} />
            <div className="skel" style={{ height: 16, width: "40%", marginBottom: 14 }} />
            <div style={{ display: "flex", gap: 8 }}>
              <div className="skel" style={{ height: 26, width: 110, borderRadius: 20 }} />
              <div className="skel" style={{ height: 26, width: 120, borderRadius: 20 }} />
              <div className="skel" style={{ height: 26, width: 90, borderRadius: 20 }} />
            </div>
          </div>
          <div className="skel" style={{ height: 52, width: 160, borderRadius: 50 }} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "3fr 2fr", gap: 14, marginBottom: 18 }}>
          <div className="skel" style={{ height: 430, borderRadius: 16 }} />
          <div className="skel" style={{ height: 430, borderRadius: 14 }} />
        </div>
        <div className="skel" style={{ height: 60, borderRadius: 12, marginBottom: 24 }} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 28 }}>
          {[1, 2, 3, 4].map(i => <div key={i} className="skel" style={{ height: 80, borderRadius: 14 }} />)}
        </div>
      </div>
  );
}

/* ─── Property not found / error screen ────────────────────────────────────
   FIX (UX): Differentiates 404 vs server/network errors and shows retry.  */
function PropertyErrorScreen({ errorType, onRetry }) {
  const config = {
    not_found:    { icon: "🏚", title: "Property Not Found",    msg: "This listing is no longer available or the link may be incorrect." },
    server_error: { icon: "⚠️", title: "Something Went Wrong",  msg: "Our server had a hiccup. Please try again in a moment." },
    network_error:{ icon: "📡", title: "No Connection",          msg: "Check your internet connection and try again." },
  };
  const { icon, title, msg } = config[errorType] || config.network_error;
  return (
      <div style={{ textAlign: "center", padding: "80px 24px", fontFamily: "Inter, sans-serif" }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>{icon}</div>
        <h2 style={{ fontWeight: 800, fontSize: 22, color: "#0f172a", marginBottom: 8 }}>{title}</h2>
        <p style={{ color: "#64748b", margin: "0 auto 28px", maxWidth: 360, lineHeight: 1.7 }}>{msg}</p>
        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
          {errorType !== "not_found" && (
              <button onClick={onRetry}
                      style={{ padding: "11px 28px", background: "#059669", color: "#fff", border: "none", borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
                Try Again
              </button>
          )}
          <Link to="/"
                style={{ padding: "11px 28px", background: "#f1f5f9", color: "#374151", borderRadius: 10, fontWeight: 600, fontSize: 14, textDecoration: "none", display: "inline-block" }}>
            ← Back to Listings
          </Link>
        </div>
      </div>
  );
}

/* ─── Jitsi helper — JaaS powered ───────────────────────────────────────────
   FIX: Added Jitsi script deduplication to prevent multiple appends.
   FIX: Added name + roomName to useEffect deps to avoid stale closures.   */
function LiveJitsi({ containerRef, apiRef, name, roomName }) {
  useEffect(() => {
    const load = async () => {
      if (!containerRef.current) return;

      const jwt = await fetchJaasToken(name || "Guest", roomName, false);

      const jaasRoom = JAAS_APP_ID ? `${JAAS_APP_ID}/${roomName}` : roomName;

      const initApi = () => {
        if (!containerRef.current) return;
        const apiOptions = {
          roomName:   jaasRoom,
          parentNode: containerRef.current,
          userInfo:   { displayName: name || "Guest" },
          configOverwrite: {
            startWithAudioMuted:     false,
            startWithVideoMuted:     false,
            prejoinPageEnabled:      false,
            prejoinConfig:           { enabled: false },
            disableDeepLinking:      true,
            disableAudioLevels:      false,
            enableNoisyMicDetection: false,
            enableNoAudioDetection:  false,
            p2p:                     { enabled: false },
          },
          interfaceConfigOverwrite: {
            SHOW_JITSI_WATERMARK:              false,
            SHOW_BRAND_WATERMARK:              false,
            SHOW_POWERED_BY:                   false,
            DISABLE_JOIN_LEAVE_NOTIFICATIONS:  true,
            TOOLBAR_ALWAYS_VISIBLE:            true,
            SHOW_CHROME_EXTENSION_BANNER:      false,
            MOBILE_APP_PROMO:                  false,
            HIDE_INVITE_MORE_HEADER:           true,
            GENERATE_ROOMNAMES_ON_WELCOME_PAGE: false,
          },
        };
        if (jwt) apiOptions.jwt = jwt;

        const domain = JAAS_APP_ID ? "8x8.vc" : "meet.jit.si";
        apiRef.current = new window.JitsiMeetExternalAPI(domain, apiOptions);

        apiRef.current.addEventListeners({
          readyToClose: () => apiRef.current?.dispose(),
        });

        apiRef.current.addListener("videoConferenceJoined", () => {
          try {
            const iframe = containerRef.current?.querySelector("iframe");
            if (!iframe?.contentDocument) return;
            const style = iframe.contentDocument.createElement("style");
            style.textContent = `.subject, [class*="subject"], #subject { display: none !important; }`;
            iframe.contentDocument.head.appendChild(style);
          } catch { /* cross-origin — silent */ }
        });
      };

      // FIX: Deduplicate Jitsi script tag
      const scriptSrc = JAAS_APP_ID
          ? `https://8x8.vc/${JAAS_APP_ID}/external_api.js`
          : "https://meet.jit.si/external_api.js";

      if (window.JitsiMeetExternalAPI) {
        initApi();
      } else if (document.getElementById("jitsi-sdk")) {
        // Script tag exists but API not ready yet — wait for load
        document.getElementById("jitsi-sdk").addEventListener("load", initApi, { once: true });
      } else {
        const s   = document.createElement("script");
        s.id      = "jitsi-sdk";
        s.src     = scriptSrc;
        s.async   = true;
        s.onload  = initApi;
        document.body.appendChild(s);
      }
    };

    load();
    return () => { apiRef.current?.dispose(); };
    // FIX: Include name and roomName in deps to prevent stale room on re-join
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, roomName]);

  return <div ref={containerRef} style={{ width: "100%", height: "100%" }} />;
}

/* ══════════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ══════════════════════════════════════════════════════════════════════════════ */
export default function PropertyDetails() {
  const { slug }  = useParams();
  const navigate  = useNavigate();

  /* ── Fetch state ── */
  const [property,   setProperty]   = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [fetchError, setFetchError] = useState(null); // FIX: differentiated error type
  const [retryKey,   setRetryKey]   = useState(0);

  /* ── UI state ── */
  const [isVideoOpen,      setIsVideoOpen]      = useState(false);
  const [copyToast,        setCopyToast]        = useState(false);
  const [zoomOpen,         setZoomOpen]         = useState(false);
  const [zoomImage,        setZoomImage]        = useState("");

  /* ── Live tour state ── */
  const [liveTourOpen,     setLiveTourOpen]     = useState(false);
  const [liveTourName,     setLiveTourName]     = useState("");
  const [liveTourJoined,   setLiveTourJoined]   = useState(false);
  const [liveTourEnded,    setLiveTourEnded]    = useState(false);
  const [liveTourRoomName, setLiveTourRoomName] = useState("");

  /* ── Recording state ── */
  const [isRecording,      setIsRecording]      = useState(false);
  const [recDuration,      setRecDuration]      = useState(0);

  /* ── Refs ── */
  const liveTourJitsiRef = useRef(null);
  const liveTourApiRef   = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recChunksRef     = useRef([]);
  const recTimerRef      = useRef(null);
  const copyToastTimer   = useRef(null);  // FIX: track toast timeout for cleanup
  const mapContainerRef  = useRef(null);
  const mapInstanceRef   = useRef(null);

  /* ── Map state ── */
  const [mapsReady, setMapsReady] = useState(typeof window.google?.maps?.Map === "function");
  const [mapError,  setMapError]  = useState(false);

  /* ── Favorites — FIX: use safeStorage utility ── */
  const [favorite, setFavorite] = useState(
      () => safeStorage.get(`fav-${slug}`) === "true"
  );

  /* ── Brochure modal ── */
  const [showBrochureModal, setShowBrochureModal] = useState(false);
  const [brochureStatus,    setBrochureStatus]    = useState("");
  const [brochureForm,      setBrochureForm]      = useState({ name: "", mobile: "", email: "" });

  /* ═══════════════════════════════════════════════════
     FIX (Memory Leak): Single cleanup useEffect — clears
     all timers, intervals, and external APIs on unmount.
     ═══════════════════════════════════════════════════ */
  useEffect(() => {
    return () => {
      clearInterval(recTimerRef.current);
      clearTimeout(copyToastTimer.current);
      if (mediaRecorderRef.current?.state !== "inactive") {
        try { mediaRecorderRef.current.stop(); } catch {}
      }
      liveTourApiRef.current?.dispose();
      // Clean up schema tag
      document.getElementById("property-schema")?.remove();
    };
  }, []);

  /* ═══════════════════════════════════════════════════
     FIX (Accessibility): Close modals on Escape key
     ═══════════════════════════════════════════════════ */
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key !== "Escape") return;
      if (showBrochureModal) { setShowBrochureModal(false); return; }
      if (liveTourOpen && !liveTourJoined) { setLiveTourOpen(false); return; }
      if (zoomOpen) { setZoomOpen(false); return; }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [showBrochureModal, liveTourOpen, liveTourJoined, zoomOpen]);

  /* ═══════════════════════════════════════════════════
     FETCH PROPERTY
     FIX: Differentiated error types (not_found / server_error / network_error)
     ═══════════════════════════════════════════════════ */
  useEffect(() => {
    if (!slug) return;
    let cancelled = false;

    setLoading(true);
    setFetchError(null);

    const fetchProperty = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/properties/slug/${slug}`);
        if (res.status === 404) {
          if (!cancelled) setFetchError("not_found");
          return;
        }
        if (!res.ok) {
          if (!cancelled) setFetchError("server_error");
          return;
        }
        const data = await res.json();
        if (!cancelled) setProperty(data);
      } catch {
        if (!cancelled) setFetchError("network_error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchProperty();
    return () => { cancelled = true; };
  }, [slug, retryKey]);

  /* ═══════════════════════════════════════════════════
     SEO: Inject meta tags and JSON-LD when property loads
     FIX (SEO): title, OG tags, structured data, canonical
     ═══════════════════════════════════════════════════ */
  useEffect(() => {
    if (!property) return;
    const originalTitle = document.title;

    document.title = `${property.title} | ${formatIndianPrice(property.price)} | OGM Real Estate`;
    setMetaTag("description",       property.description?.slice(0, 160) || "");
    setMetaTag("og:title",          property.title);
    setMetaTag("og:description",    property.description?.slice(0, 160) || "");
    setMetaTag("og:image",          property.mainImages?.[0] || property.images?.[0] || "");
    setMetaTag("og:url",            window.location.href);
    setMetaTag("og:type",           "website");
    setMetaTag("twitter:card",      "summary_large_image");
    setMetaTag("twitter:title",     property.title);
    setMetaTag("twitter:image",     property.mainImages?.[0] || property.images?.[0] || "");

    injectPropertySchema(property);

    return () => {
      document.title = originalTitle;
      document.getElementById("property-schema")?.remove();
    };
  }, [property]);

  /* ═══════════════════════════════════════════════════
     LOAD GOOGLE MAPS SDK
     ═══════════════════════════════════════════════════ */
  useEffect(() => {
    if (mapsReady || !GMAPS_KEY) return;
    loadGoogleMaps()
        .then(() => setMapsReady(true))
        .catch(() => setMapError(true));
  }, [mapsReady]);

  /* ═══════════════════════════════════════════════════
     BUILD PROPERTY MAP
     FIX (XSS): All property strings escaped before HTML injection
     ═══════════════════════════════════════════════════ */
  useEffect(() => {
    if (!mapsReady || !mapContainerRef.current || mapInstanceRef.current || !property) return;

    const G = window.google.maps;

    const map = new G.Map(mapContainerRef.current, {
      zoom:              15,
      center:            { lat: 12.9716, lng: 77.5946 },
      mapTypeControl:    false,
      streetViewControl: false,
      fullscreenControl: true,
      zoomControl:       true,
      styles: [
        { featureType: "poi.business", stylers: [{ visibility: "off" }] },
      ],
    });
    mapInstanceRef.current = map;

    map.addListener("click", () => {
      const c = map.getCenter();
      window.open(`https://www.google.com/maps/@${c.lat()},${c.lng()},16z`, "_blank", "noopener,noreferrer");
    });

    const geocoder   = new G.Geocoder();
    const address    = property.location || property.address || "";

    const pinPosition = (property.latitude && property.longitude)
        ? new G.LatLng(parseFloat(property.latitude), parseFloat(property.longitude))
        : null;

    const mapsUrl = pinPosition
        ? `https://www.google.com/maps/search/?api=1&query=${pinPosition.lat()},${pinPosition.lng()}`
        : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address + ", India")}`;

    const placePin = (pos) => {
      map.setCenter(pos);
      map.setZoom(15);

      const marker = new G.Marker({
        position:  pos,
        map,
        title:     property.title || "Property Location",
        animation: G.Animation.BOUNCE,
      });
      setTimeout(() => marker.setAnimation(null), 2100);

      // FIX (XSS): Escape all property strings before injecting into InfoWindow HTML
      const iw = new G.InfoWindow({
        content: `
          <div style="font-family:sans-serif;padding:6px 4px;min-width:210px;">
            <strong style="font-size:14px;display:block;margin-bottom:2px;">
              ${escHtml(property.title)}
            </strong>
            <span style="color:#6b7280;font-size:12px;">${escHtml(address)}</span><br/>
            <span style="color:#2563eb;font-weight:700;font-size:14px;">
              ${escHtml(formatIndianPrice(property.price))}
            </span>
            <a href="${escHtml(mapsUrl)}"
               target="_blank" rel="noopener noreferrer"
               style="display:inline-flex;align-items:center;gap:4px;margin-top:10px;
                      color:#2563eb;font-size:12px;font-weight:600;text-decoration:none;
                      background:#eff6ff;padding:5px 12px;border-radius:20px;border:1px solid #bfdbfe;">
              &#x1F5FA; Open in Google Maps &rarr;
            </a>
          </div>`,
      });

      iw.open(map, marker);
      marker.addListener("click", () => iw.open(map, marker));
    };

    if (pinPosition) {
      placePin(pinPosition);
    } else if (address) {
      const geocodeQuery = address.toLowerCase().includes("india") ? address : `${address}, India`;
      geocoder.geocode({ address: geocodeQuery }, (results, status) => {
        if (status === "OK" && results[0]) {
          placePin(results[0].geometry.location);
        } else {
          console.warn("[PropertyDetails] Geocoding failed:", status, address);
        }
      });
    }

    setTimeout(() => G.event.trigger(map, "resize"), 400);

    return () => { mapInstanceRef.current = null; };
  }, [mapsReady, property]);

  /* ═══════════════════════════════════════════════════
     MEMOIZED DERIVED VALUES
     ═══════════════════════════════════════════════════ */
  const galleryImages = useMemo(() => {
    if (!property) return [];
    if (property.images?.length     > 0) return property.images;
    if (property.mainImages?.length > 0) return property.mainImages;
    return [property.image].filter(Boolean);
  }, [property]);

  const videoThumbnail = useMemo(() => {
    if (!property) return "/images/default-video-thumb.jpg";
    return (
        property.mainImages?.[0] ||
        property.images?.[0]     ||
        property.image           ||
        "/images/default-video-thumb.jpg"
    );
  }, [property]);

  // FIX: isBrochureValid as useMemo rather than useCallback — avoids regex re-run on every render
  const isBrochureFormValid = useMemo(() => {
    const { name, mobile } = brochureForm;
    return !!(name.trim() && mobile && /^[0-9]{10,15}$/.test(mobile));
  }, [brochureForm]);

  /* ═══════════════════════════════════════════════════
     LIVE TOUR HELPERS
     ═══════════════════════════════════════════════════ */
  const generateLiveTourRoom = useCallback(() => {
    const uid = crypto.randomUUID
        ? crypto.randomUUID().replace(/-/g, "").slice(0, 16)
        : Math.random().toString(36).slice(2, 18);
    return `ogm${property?.id}${uid}`;
  }, [property?.id]);

  // FIX: wrapped in useCallback with proper deps
  const handleJoinLiveTour = useCallback(async () => {
    if (!liveTourName.trim()) return;
    try {
      await fetch(`${API_BASE}/api/live-tour/join-queue`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId: property?.id,
          name:       liveTourName.trim(),
          mobile:     "",
          roomName:   liveTourRoomName,
        }),
      });
    } catch {
      // Non-critical — proceed to call even if this fails
    }
    setLiveTourJoined(true);
  }, [liveTourName, liveTourRoomName, property?.id]);

  /* ═══════════════════════════════════════════════════
     RECORDING
     FIX: recTimerRef is cleared inside onstop AND in the
     global unmount cleanup effect above.
     ═══════════════════════════════════════════════════ */
  const startRecording = useCallback(async () => {
    try {
      const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
          ? "video/webm;codecs=vp9,opus"
          : "video/webm";

      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { displaySurface: "browser", cursor: "always" },
        audio: { echoCancellation: false, noiseSuppression: false },
        preferCurrentTab: true,
      });

      recChunksRef.current = [];
      const mr = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 2_500_000 });
      mr.ondataavailable = (e) => { if (e.data.size > 0) recChunksRef.current.push(e.data); };
      mr.onstop = () => {
        const blob = new Blob(recChunksRef.current, { type: "video/webm" });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement("a");
        const now  = new Date().toISOString().slice(0, 19).replace(/[T:]/g, "-");
        a.href     = url;
        a.download = `ogm-live-tour-${property?.id}-${now}.webm`;
        a.rel      = "noopener";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 5000);
        stream.getTracks().forEach((t) => t.stop());
        clearInterval(recTimerRef.current);
        setIsRecording(false);
        setRecDuration(0);
      };
      stream.getVideoTracks()[0].onended = () => mr.stop();
      mr.start(1000);
      mediaRecorderRef.current = mr;
      setIsRecording(true);
      setRecDuration(0);
      recTimerRef.current = setInterval(() => setRecDuration((s) => s + 1), 1000);
    } catch (err) {
      if (err.name !== "AbortError" && err.name !== "NotAllowedError") {
        console.warn("Recording failed:", err);
      }
    }
  }, [property?.id]);

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop();
  }, []);

  /* ═══════════════════════════════════════════════════
     CALLBACKS
     ═══════════════════════════════════════════════════ */
  const toggleFavorite = useCallback(() => {
    setFavorite((prev) => {
      const next = !prev;
      safeStorage.set(`fav-${slug}`, String(next)); // FIX: use safeStorage
      return next;
    });
  }, [slug]);

  // FIX: copyToastTimer ref prevents leak on unmount
  const handleShare = useCallback(async () => {
    const shareData = {
      title: property?.title,
      text:  "Check out this property!",
      url:   window.location.href,
    };
    if (navigator.share) {
      try { await navigator.share(shareData); return; } catch {}
    }
    try { await navigator.clipboard.writeText(window.location.href); } catch {}
    clearTimeout(copyToastTimer.current);
    setCopyToast(true);
    copyToastTimer.current = setTimeout(() => setCopyToast(false), 1500);
  }, [property?.title]);

  const openBrochure = useCallback(() => {
    setBrochureForm({ name: "", mobile: "", email: "" });
    setBrochureStatus("");
    setShowBrochureModal(true);
  }, []);

  const handleBrochureChange = useCallback((e) => {
    const { name, value } = e.target;
    setBrochureForm((prev) => ({ ...prev, [name]: value }));
  }, []);

  // FIX (Security + UX): Validate download URL origin; use anchor download instead of location.href
  const handleBrochureSubmit = useCallback(async (e) => {
    e.preventDefault();
    if (!property?.id) { setBrochureStatus("error"); return; }

    setBrochureStatus("sending");
    try {
      const res = await fetch(`${API_BASE}/api/brochure/request`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name:       brochureForm.name,
          mobile:     brochureForm.mobile,
          email:      brochureForm.email || null,
          propertyId: property.id,
        }),
      });

      let data;
      try { data = await res.json(); } catch { setBrochureStatus("error"); return; }
      if (!res.ok || !data?.url) { setBrochureStatus("error"); return; }

      // FIX (Security): Validate download URL origin before following
      try {
        const parsed = new URL(data.url, window.location.href);
        const isAllowed = ALLOWED_DOWNLOAD_ORIGINS.some((o) => parsed.origin === o);
        if (!isAllowed && !data.url.startsWith("/")) {
          console.error("[Brochure] Untrusted download URL blocked:", parsed.origin);
          setBrochureStatus("error");
          return;
        }
      } catch {
        setBrochureStatus("error");
        return;
      }

      // FIX (UX): Use anchor download — stays on SPA, user sees success message
      setBrochureStatus("success");
      const a    = document.createElement("a");
      a.href     = data.url;
      a.download = `${(property.title || "brochure").replace(/[^a-z0-9]/gi, "-")}.pdf`;
      a.rel      = "noopener noreferrer";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      setTimeout(() => { setShowBrochureModal(false); setBrochureStatus(""); }, 1800);
    } catch (err) {
      console.error("Brochure error:", err);
      setBrochureStatus("error");
    }
  }, [property?.id, property?.title, brochureForm]);

  const handleImageClick = useCallback((i) => {
    setZoomImage(galleryImages[i]);
    setZoomOpen(true);
  }, [galleryImages]);

  /* ═══════════════════════════════════════════════════
     EARLY RETURNS — placed after ALL hooks (safe)
     ═══════════════════════════════════════════════════ */
  if (loading) return <PropertyDetailsSkeleton />;

  if (fetchError) {
    return (
        <PropertyErrorScreen
            errorType={fetchError}
            onRetry={() => { setRetryKey((k) => k + 1); }}
        />
    );
  }

  if (!property) return <PropertyErrorScreen errorType="not_found" onRetry={null} />;

  /* ═══════════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════════ */
  return (
      <div className="details-container">

        {/* ── TOP ROW: Back + Icon actions ── */}
        <div className="details-topbar">
          <Link to="/" className="back-btn">← Back to Listings</Link>
          <div className="icon-actions">
            {/* Call */}
            <div className="tooltip-wrapper">
              <a href="tel:+918309120616" className="action-btn" aria-label="Call us now">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
                     fill="none" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                     aria-hidden="true">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.6 3.27 2 2 0 0 1 3.58 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.54a16 16 0 0 0 6 6l.91-.91a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
                </svg>
              </a>
              <span className="tooltip" aria-hidden="true">Call Now</span>
            </div>
            {/* Download Brochure — FIX: aria-label added */}
            <div className="tooltip-wrapper">
              <button className="action-btn" onClick={openBrochure} aria-label="Download property brochure">
                <Download strokeWidth={2} size={20} aria-hidden="true" />
              </button>
              <span className="tooltip" aria-hidden="true">Brochure</span>
            </div>
            {/* Share — FIX: aria-label added */}
            <div className="tooltip-wrapper">
              <button className="action-btn" onClick={handleShare} aria-label="Share this property">
                <Share2 strokeWidth={2} size={20} aria-hidden="true" />
              </button>
              <span className="tooltip" aria-hidden="true">Share</span>
            </div>
            {/* Favourite — FIX: aria-label updated dynamically */}
            <div className="tooltip-wrapper">
              <button
                  className="action-btn"
                  onClick={toggleFavorite}
                  aria-label={favorite ? "Remove from wishlist" : "Add to wishlist"}
                  aria-pressed={favorite}
              >
                <Heart
                    size={20} strokeWidth={2} aria-hidden="true"
                    color={favorite ? "red" : "#64748b"}
                    fill={favorite ? "red" : "none"}
                    style={{ transition: "transform 0.18s" }}
                />
              </button>
              <span className="tooltip" aria-hidden="true">{favorite ? "Wishlisted" : "Wishlist"}</span>
            </div>
          </div>
        </div>

        {/* ── HEADER: Title + Live Tour button ── */}
        <div className="details-header-row">
          <div className="details-header-left">
            <h1 className="details-title">{property.title}</h1>
            <p className="details-location">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="#f97316" stroke="none" aria-hidden="true">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
              </svg>
              {property.location}
            </p>
            <div className="header-badges">
            <span className="no-brokerage-badge">
              <BadgeCheck size={14} strokeWidth={2} aria-hidden="true" />
              No Brokerage
            </span>
              {property.reraApproved && (
                  <span className="rera-header-badge">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>
                </svg>
                RERA Approved
              </span>
              )}
              <span className="details-price-inline">{formatIndianPrice(property.price)}</span>
            </div>
          </div>

          {/* ── Live Tour pill ── */}
          <button
              className="live-tour-header-pill"
              aria-label="Open live property tour"
              onClick={() => { setLiveTourRoomName(generateLiveTourRoom()); setLiveTourOpen(true); }}
          >
            <span className="live-tour-pill-dot" aria-hidden="true" />
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
            </svg>
            Live Tour
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>
        </div>

        {/* Copy toast */}
        {copyToast && (
            <div className="copy-toast" role="status" aria-live="polite">
              Link copied to clipboard!
            </div>
        )}

        {/* ── MEDIA: GALLERY + VIDEO ── */}
        <div className="media-wrapper">
          <div className="gallery-left">
            <GalleryCarousel
                images={galleryImages}
                autoplay
                interval={4500}
                onImageClick={handleImageClick}
                // FIX (a11y): pass descriptive alt text generator
                getAlt={(i) => `${property.title} — photo ${i + 1} of ${galleryImages.length}`}
            />
          </div>
          <div className="video-right">
            {property.videoUrl ? (
                <div
                    className="video-card"
                    onClick={() => setIsVideoOpen(true)}
                    role="button"
                    tabIndex={0}
                    aria-label={`Watch video tour of ${property.title}`}
                    onKeyDown={(e) => e.key === "Enter" && setIsVideoOpen(true)}
                >
                  {/* FIX (a11y): descriptive alt text on video thumbnail */}
                  <img
                      src={videoThumbnail}
                      className="video-thumb"
                      alt={`Video tour preview of ${property.title}`}
                      loading="lazy"
                  />
                  <div className="video-dark-overlay" aria-hidden="true" />
                  <div className="video-play-button" aria-hidden="true">▶</div>
                </div>
            ) : (
                <div className="video-card video-card--no-video">
                  <div className="video-no-video-msg">No video available</div>
                </div>
            )}
          </div>
        </div>

        {/* ── ZOOM MODAL ── */}
        <ImageZoomModal open={zoomOpen} image={zoomImage} onClose={() => setZoomOpen(false)} />

        {/* ── BOOK VIRTUAL BRIEFING STRIP ── */}
        <div className="briefing-strip">
          <div className="briefing-strip-left">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#f97316"
                 strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="3" y="4" width="18" height="18" rx="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8"  y1="2" x2="8"  y2="6"/>
              <line x1="3"  y1="10" x2="21" y2="10"/>
            </svg>
            <div>
              <span className="briefing-strip-title">Book Virtual Briefing</span>
              <span className="briefing-strip-desc"> — Pick a slot that best suits your schedule and avoid unexpected calls</span>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button className="briefing-strip-btn" onClick={() => navigate(`/book/${slug}`)}>
              Schedule Now →
            </button>
            <button className="briefing-calendar-icon" onClick={() => navigate(`/book/${slug}`)} aria-label="Open booking calendar">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#059669"
                   strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="3" y="4" width="18" height="18" rx="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8"  y1="2" x2="8"  y2="6"/>
                <line x1="3"  y1="10" x2="21" y2="10"/>
              </svg>
            </button>
          </div>
        </div>

        {/* ── SPECS ── */}
        <div className="spec-grid">
          <div className="spec-box">
            <div className="spec-icon spec-icon-blue" aria-hidden="true">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7v13"/><path d="M21 7v13"/><path d="M3 14h18"/><path d="M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2"/><path d="M5 12V9a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v3"/><path d="M13 12V9a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v3"/></svg>
            </div>
            <div className="spec-text">
              <b>{property.bedrooms}</b>
              <span>Bedrooms</span>
            </div>
            <div className="spec-underline" />
          </div>
          <div className="spec-box">
            <div className="spec-icon spec-icon-orange" aria-hidden="true">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 11h18"/><path d="M3 11V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v6"/><path d="M3 11v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M7 11V9"/></svg>
            </div>
            <div className="spec-text">
              <b>{property.bathrooms}</b>
              <span>Bathrooms</span>
            </div>
            <div className="spec-underline spec-underline-orange" />
          </div>
          <div className="spec-box">
            <div className="spec-icon spec-icon-green" aria-hidden="true">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 3H3v18h18V3z"/><path d="M9 3v18"/><path d="M3 9h18"/><path d="M3 15h18"/><path d="M15 3v18"/></svg>
            </div>
            <div className="spec-text">
              {/* FIX: prefer landArea, fall back to sqft — make intent explicit */}
              <b>{property.landArea || property.sqft}</b>
              <span>Land Area</span>
            </div>
            <div className="spec-underline spec-underline-green" />
          </div>
          <div className="spec-box">
            <div className="spec-icon spec-icon-blue" aria-hidden="true">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M5 17H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v9a2 2 0 0 1-2 2h-2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/></svg>
            </div>
            <div className="spec-text">
              <b>{property.parking}</b>
              <span>Parking</span>
            </div>
            <div className="spec-underline" />
          </div>
        </div>

        {/* ── PROPERTY DETAILS TABLE ── */}
        <div className="details-section">
          <h2>Property Details</h2>
          <div className="pd-table">
            {[
              ["Type",          property.type],
              ["Built-up Area", property.builtupArea],
              ["Facing",        property.facing],
              ["Furnishing",    property.furnishing],
              ["Maintenance",   property.maintenance],
              ["Carpet Area",   property.carpetArea],
            ].filter(([, v]) => v).map(([label, value]) => (
                <div key={label} className="pd-row">
                  <span className="pd-label">{label}</span>
                  <b className="pd-value">{value}</b>
                </div>
            ))}
          </div>
        </div>

        {/* ── OVERVIEW ── */}
        {property.description && (
            <div className="details-section">
              <h2>Property Overview</h2>
              <p className="property-overview-text">{property.description}</p>
            </div>
        )}

        {/* ── NEARBY LOCATIONS ── */}
        <NearbyLocations
            locations={property.nearby || []}
            propertyLocation={property.location || ""}
        />

        {/* ── AMENITIES ── */}
        <div className="details-section">
          <h2>Features &amp; Amenities</h2>
          <Amenities amenities={property.amenities || []} />
        </div>

        {/* ── LOCATION MAP (uncomment to restore) ── */}
        {/*
      <div className="details-section">
        <h2>Location Map</h2>
        <div className="map-wrapper">
          {mapError ? (
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(property.location)}`}
              target="_blank" rel="noreferrer" className="map-fallback-link"
            >
              📍 Open {property.location} in Google Maps →
            </a>
          ) : (
            <>
              {!mapsReady && (
                <div className="map-loading-overlay">
                  <span className="map-spinner" /> Loading map…
                </div>
              )}
              <div ref={mapContainerRef} className="map-canvas" style={{ opacity: mapsReady ? 1 : 0 }} />
            </>
          )}
        </div>
      </div>
      */}

        {/* ── VIDEO MODAL ── */}
        <VideoModal
            open={isVideoOpen}
            onClose={() => setIsVideoOpen(false)}
            videoUrl={property.videoUrl}
        />

        {/* ── BROCHURE MODAL ── */}
        {showBrochureModal && (
            <div
                className="modal-overlay"
                onClick={(e) => { if (e.target === e.currentTarget) setShowBrochureModal(false); }}
                role="dialog"
                aria-modal="true"
                aria-label="Download brochure"
            >
              <div className="modal-content">
                <h3>Download Brochure</h3>
                <p>Please enter your details to download.</p>

                <form onSubmit={handleBrochureSubmit} noValidate>
                  <div className="input-group">
                    <label htmlFor="brochure-name">Name *</label>
                    <input
                        id="brochure-name"
                        name="name" type="text"
                        value={brochureForm.name}
                        onChange={handleBrochureChange}
                        autoComplete="name"
                        required
                    />
                  </div>
                  <div className="input-group">
                    <label htmlFor="brochure-mobile">Mobile *</label>
                    <input
                        id="brochure-mobile"
                        name="mobile" type="tel"
                        value={brochureForm.mobile}
                        onChange={handleBrochureChange}
                        placeholder="10–15 digit number"
                        autoComplete="tel"
                        required
                    />
                    {/* FIX (UX): inline validation feedback */}
                    {brochureForm.mobile && !isBrochureFormValid && (
                        <span className="input-hint input-hint--error">Enter a valid 10–15 digit mobile number</span>
                    )}
                    {brochureForm.mobile && isBrochureFormValid && brochureForm.name.trim() && (
                        <span className="input-hint input-hint--ok">✓ Ready to download</span>
                    )}
                  </div>
                  <div className="input-group">
                    <label htmlFor="brochure-email">Email (optional)</label>
                    <input
                        id="brochure-email"
                        name="email" type="email"
                        value={brochureForm.email}
                        onChange={handleBrochureChange}
                        autoComplete="email"
                    />
                  </div>

                  <div className="modal-btn-group">
                    <button
                        type="submit"
                        className="submit-btn"
                        disabled={!isBrochureFormValid || brochureStatus === "sending"}
                    >
                      {brochureStatus === "sending" ? "Sending…" : "Download"}
                    </button>
                    <button
                        type="button"
                        className="modal-btn"
                        onClick={() => setShowBrochureModal(false)}
                    >
                      Cancel
                    </button>
                  </div>

                  {brochureStatus === "error" && (
                      <p className="brochure-status brochure-status--error" role="alert">
                        Something went wrong. Please check your details and try again.
                      </p>
                  )}
                  {brochureStatus === "success" && (
                      <p className="brochure-status brochure-status--success" role="status">
                        ✓ Brochure downloading…
                      </p>
                  )}
                </form>
              </div>
            </div>
        )}

        {/* AskDiscoverWidget */}
        <AskDiscoverWidget property={property} />

        {/* ── LIVE TOUR MODAL ── */}
        {(liveTourOpen || liveTourEnded) && (
            <div
                className="live-modal-overlay"
                onClick={() => {
                  if (!liveTourJoined) {
                    liveTourApiRef.current?.dispose();
                    setLiveTourJoined(false);
                    setLiveTourOpen(false);
                    setLiveTourEnded(false);
                  }
                }}
            >
              {/* FIX (a11y): role="dialog", aria-modal, aria-label */}
              <div
                  className="live-modal-box"
                  role="dialog"
                  aria-modal="true"
                  aria-label={liveTourEnded ? "Tour ended" : "Join live property tour"}
                  onClick={(e) => e.stopPropagation()}
              >
                {liveTourEnded ? (
                    /* ── THANK YOU SCREEN ── */
                    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"56px 32px", textAlign:"center", background:"linear-gradient(135deg,#f0f4ff,#fff7ed)", minHeight:380, borderRadius:16, gap:14 }}>
                      <div style={{ fontSize:64 }} aria-hidden="true">🏡</div>
                      <h2 style={{ fontSize:24, fontWeight:800, color:"#1e3a8a", margin:0, letterSpacing:"-0.3px" }}>Thank you for your time!</h2>
                      <p style={{ fontSize:14, color:"#6b7280", lineHeight:1.65, maxWidth:320, margin:"4px 0 20px" }}>
                        Our property expert will follow up with you shortly.<br />We hope you enjoyed the live tour of {property?.title}.
                      </p>
                      <div style={{ display:"flex", gap:10, flexWrap:"wrap", justifyContent:"center" }}>
                        <button
                            onClick={() => { setLiveTourEnded(false); setLiveTourOpen(false); setLiveTourName(""); }}
                            style={{ padding:"12px 24px", borderRadius:10, border:"none", background:"linear-gradient(135deg,#f97316,#fb923c)", color:"white", fontSize:14, fontWeight:700, cursor:"pointer", boxShadow:"0 4px 14px rgba(249,115,22,0.4)" }}
                        >
                          📅 Book Another Tour
                        </button>
                        <button
                            onClick={() => { setLiveTourEnded(false); setLiveTourOpen(false); setLiveTourName(""); }}
                            style={{ padding:"12px 24px", borderRadius:10, border:"1.5px solid #d1d5db", background:"white", color:"#6b7280", fontSize:14, fontWeight:600, cursor:"pointer" }}
                        >
                          Close
                        </button>
                      </div>
                    </div>
                ) : !liveTourJoined ? (
                    /* ── PRE-JOIN SCREEN ── */
                    <div className="live-prejoin">
                      <img
                          src={property.mainImages?.[0] || property.images?.[0]}
                          alt=""
                          className="live-prejoin-bg"
                          aria-hidden="true"
                      />
                      <div className="live-prejoin-overlay" aria-hidden="true" />
                      <div className="live-prejoin-content">
                        <div className="live-prejoin-dot" aria-hidden="true" />
                        <h2>Join Live Tour</h2>
                        <p>{property.title}</p>
                        <input
                            type="text"
                            placeholder="Enter your name"
                            value={liveTourName}
                            onChange={(e) => setLiveTourName(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && liveTourName.trim() && handleJoinLiveTour()}
                            className="live-name-input"
                            aria-label="Your name for the live tour"
                            autoFocus
                            autoComplete="name"
                        />
                        <button
                            className="live-join-btn"
                            onClick={handleJoinLiveTour}
                            disabled={!liveTourName.trim()}
                        >
                          Join Live Now →
                        </button>
                        <button className="live-cancel-btn" onClick={() => setLiveTourOpen(false)}>
                          Cancel
                        </button>
                      </div>
                    </div>
                ) : (
                    /* ── JITSI CALL SCREEN ── */
                    <div style={{ display:"flex", flexDirection:"column", height:"100%", borderRadius:18, overflow:"hidden" }}>
                      {/* OGM Header bar */}
                      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", background:"#111827", padding:"0 16px", height:60, flexShrink:0, zIndex:10, position:"relative" }}>
                        {/* Left: brand */}
                        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                          <div style={{ width:34, height:34, borderRadius:9, flexShrink:0, background:"linear-gradient(135deg,#3b82f6,#f97316)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:900, color:"white", boxShadow:"0 2px 8px rgba(59,130,246,0.4)" }}>OG</div>
                          <div style={{ display:"flex", flexDirection:"column", gap:2 }}>
                            <span style={{ color:"white", fontSize:14, fontWeight:800, lineHeight:1, letterSpacing:0.2 }}>OGM Live</span>
                            <span style={{ color:"rgba(255,255,255,0.5)", fontSize:10, lineHeight:1 }}>Live Property Tour</span>
                          </div>
                        </div>
                        {/* Center: live indicator */}
                        <div style={{ position:"absolute", left:"50%", transform:"translateX(-50%)", background:"#111827", padding:"6px 32px", borderRadius:8, pointerEvents:"none" }} aria-hidden="true">
                          <span style={{ color:"rgba(255,255,255,0.3)", fontSize:11, letterSpacing:0.3 }}>🔴 Live</span>
                        </div>
                        {/* Right: REC + close */}
                        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                          <button
                              onClick={isRecording ? stopRecording : startRecording}
                              aria-label={isRecording ? "Stop recording" : "Start recording this tour"}
                              title={isRecording ? "Stop & save recording" : "Record this tour"}
                              style={{ display:"flex", alignItems:"center", gap:5, padding:"5px 12px", borderRadius:6, border:"none", background: isRecording ? "rgba(220,38,38,0.85)" : "rgba(255,255,255,0.1)", color:"white", fontSize:11, fontWeight:700, cursor:"pointer" }}
                          >
                            <span style={{ width:7, height:7, borderRadius:"50%", background:"#ef4444", display:"inline-block" }} aria-hidden="true" />
                            {isRecording
                                ? `REC ${String(Math.floor(recDuration / 60)).padStart(2, "0")}:${String(recDuration % 60).padStart(2, "0")}`
                                : "REC"}
                          </button>
                          <button
                              onClick={() => { stopRecording(); liveTourApiRef.current?.dispose(); setLiveTourJoined(false); setLiveTourEnded(true); }}
                              aria-label="End live tour"
                              style={{ width:34, height:34, borderRadius:"50%", border:"none", background:"rgba(255,255,255,0.12)", color:"white", fontSize:16, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", transition:"background 0.18s" }}
                              onMouseEnter={(e) => { e.currentTarget.style.background = "#dc2626"; }}
                              onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.12)"; }}
                          >
                            ✕
                          </button>
                        </div>
                      </div>

                      {/* Jitsi renders below header */}
                      <div style={{ flex:1, position:"relative", overflow:"hidden" }}>
                        <LiveJitsi
                            containerRef={liveTourJitsiRef}
                            apiRef={liveTourApiRef}
                            name={liveTourName}
                            roomName={liveTourRoomName}
                            onClose={() => { liveTourApiRef.current?.dispose(); setLiveTourJoined(false); setLiveTourEnded(true); }}
                        />
                      </div>
                    </div>
                )}
              </div>
            </div>
        )}

      </div>
  );
}