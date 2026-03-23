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

/* ─── API base — never hardcode localhost in component code ─────────────────
   Set  REACT_APP_API_BASE=http://localhost:8080  in your .env.development
   Set  REACT_APP_API_BASE=https://your-prod-url  in your .env.production    */
const API_BASE =
  process.env.REACT_APP_API_BASE || "http://localhost:8080";

/* ─── Google Maps key ───────────────────────────────────────────────────────*/
const GMAPS_KEY =
  process.env.REACT_APP_GOOGLE_MAPS_API_KEY ||
  "AIzaSyAMOnmpGRW9d36CNRQTjAavV4EjHGlXzO4";

/* ─── Price formatter — defined OUTSIDE component so it's never recreated ── */
function formatIndianPrice(price) {
  if (!price) return "";
  if (price >= 10_000_000) return `₹ ${(price / 10_000_000).toFixed(2)} Cr`;
  if (price >= 100_000)    return `₹ ${(price / 100_000).toFixed(2)} L`;
  return `₹ ${price.toLocaleString("en-IN")}`;
}

/* ─── Load Google Maps SDK once ─────────────────────────────────────────────*/
function loadGoogleMaps() {
  if (typeof window.google?.maps?.Map === "function") return Promise.resolve();

  if (document.getElementById("gmaps-sdk")) {
    return new Promise((resolve) => {
      const t = setInterval(() => {
        if (typeof window.google?.maps?.Map === "function") {
          clearInterval(t); resolve();
        }
      }, 100);
    });
  }

  return new Promise((resolve, reject) => {
    const script   = document.createElement("script");
    script.id      = "gmaps-sdk";
    script.src     = `https://maps.googleapis.com/maps/api/js?key=${GMAPS_KEY}&libraries=places`;
    script.async   = true;
    script.defer   = true;
    script.onload  = resolve;
    script.onerror = () => reject(new Error("Failed to load Google Maps"));
    document.head.appendChild(script);
  });
}

/* ─────────────────────────────────────────────────────────────────────────── */


/* ─── Jitsi helper — mounts when joined ─────────────────────────────────── */
function LiveJitsi({ containerRef, apiRef, name, roomName }) {
  useEffect(() => {
    const load = () => {
      if (!containerRef.current) return;
      apiRef.current = new window.JitsiMeetExternalAPI("meet.jit.si", {
        roomName,
        parentNode: containerRef.current,
        userInfo: { displayName: name || "Guest" },
        configOverwrite: {
          startWithAudioMuted: false,
          startWithVideoMuted: false,
          prejoinPageEnabled: false,
          prejoinConfig: { enabled: false },
          disableDeepLinking: true,
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
      });
      // Intercept Jitsi hang-up → show our thank you screen instead of Jitsi promo
      apiRef.current.addEventListeners({
        readyToClose: () => onClose?.(),
      });

      // Inject CSS to push the self-view pip below our 72px OGM header bar
      apiRef.current.addListener('videoConferenceJoined', () => {
        try {
          const iframe = containerRef.current?.querySelector('iframe');
          if (!iframe?.contentDocument) return;
          const style = iframe.contentDocument.createElement('style');
          style.textContent = `
            /* Push filmstrip / self-view thumbnails below the OGM header */
            .remote-videos, .filmstrip, [class*="filmstrip"],
            .videocontainer.videoContainerFocused { margin-top: 76px !important; }
            /* Hide Jitsi room info bar top-right */
            .subject, [class*="subject"], .subject-info-container,
            #subject, .subject-container { display: none !important; }
            /* Push participant thumbnail away from top */
            .remote-thumbnail, .videocontainer:not(.videoContainerFocused) {
              margin-top: 76px !important;
            }
          `;
          iframe.contentDocument.head.appendChild(style);
        } catch { /* cross-origin may block, silent fail */ }
      });
    };
    if (!window.JitsiMeetExternalAPI) {
      const s = document.createElement("script");
      s.src = "https://meet.jit.si/external_api.js";
      s.async = true;
      s.onload = load;
      document.body.appendChild(s);
    } else { load(); }
    return () => { apiRef.current?.dispose(); };
  }, []);
  return <div ref={containerRef} style={{ width: "100%", height: "100%" }} />;
}

export default function PropertyDetails() {
  const { slug } = useParams();
  const navigate  = useNavigate();

  /* ── Core state ── */
  const [property,          setProperty]          = useState(null);
  const [loading,           setLoading]           = useState(true);
  const [isVideoOpen,       setIsVideoOpen]       = useState(false);
  const [liveTourOpen,      setLiveTourOpen]      = useState(false);
  const [liveTourName,      setLiveTourName]      = useState("");
  const [liveTourJoined,    setLiveTourJoined]    = useState(false);
  const [liveTourEnded,     setLiveTourEnded]     = useState(false);
  const liveTourJitsiRef = useRef(null);
  const liveTourApiRef   = useRef(null);

  /* ─── Notify agent + join Jitsi ────────────────────────────── */
  const handleJoinLiveTour = async () => {
    if (!liveTourName.trim()) return;

    // 1. Notify agent via join-queue → triggers WebSocket popup on agent dashboard
    try {
      await fetch(`${API_BASE}/api/live-tour/join-queue`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId: property?.id,
          name:       liveTourName.trim(),
          mobile:     "",
        }),
      });
    } catch {
      // Non-critical — proceed to call even if this fails
    }

    // 2. Enter Jitsi room
    setLiveTourJoined(true);
  };
  const [copyToast,         setCopyToast]         = useState(false);
  const [zoomOpen,          setZoomOpen]          = useState(false);
  const [zoomImage,         setZoomImage]         = useState("");

  /* ── Favorites ── */
  const [favorite, setFavorite] = useState(() => {
    try { return localStorage.getItem(`fav-${slug}`) === "true"; }
    catch { return false; }
  });

  /* ── Brochure modal ── */
  const [showBrochureModal, setShowBrochureModal] = useState(false);
  const [brochureStatus,    setBrochureStatus]    = useState("");
  const [brochureForm,      setBrochureForm]      = useState({ name: "", mobile: "", email: "" });

  /* ── Map state ── */
  const mapContainerRef = useRef(null);
  const mapInstanceRef  = useRef(null);
  const [mapsReady,     setMapsReady]     = useState(typeof window.google?.maps?.Map === "function");
  const [mapError,      setMapError]      = useState(false);

  /* ═══════════════════════════
     FETCH PROPERTY
     ═══════════════════════════ */
  useEffect(() => {
    if (!slug) return;
    let cancelled = false;

    const fetchProperty = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/properties/slug/${slug}`);
        if (!res.ok) throw new Error("Property not found");
        const data = await res.json();
        if (!cancelled) setProperty(data);
      } catch (err) {
        console.error("Failed to load property:", err.message);
        if (!cancelled) setProperty(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchProperty();
    return () => { cancelled = true; };
  }, [slug]);

  /* ═══════════════════════════
     LOAD GOOGLE MAPS SDK
     ═══════════════════════════ */
  useEffect(() => {
    if (mapsReady) return;
    loadGoogleMaps()
      .then(() => setMapsReady(true))
      .catch(() => setMapError(true));
  }, [mapsReady]);

  /* ═══════════════════════════
     BUILD PROPERTY MAP
     ═══════════════════════════ */
  useEffect(() => {
    if (!mapsReady || !mapContainerRef.current || mapInstanceRef.current || !property) return;

    const G = window.google.maps;

    const map = new G.Map(mapContainerRef.current, {
      zoom:              15,
      center:            { lat: 12.9716, lng: 77.5946 }, // fallback
      mapTypeControl:    false,
      streetViewControl: false,
      fullscreenControl: true,
      zoomControl:       true,
      // Clean up POI clutter so the property pin stands out
      styles: [
        { featureType: "poi.business", stylers: [{ visibility: "off" }] },
      ],
    });
    mapInstanceRef.current = map;

    /* Clicking the map background opens Google Maps at that centre */
    map.addListener("click", () => {
      const c = map.getCenter();
      window.open(
        `https://www.google.com/maps/@${c.lat()},${c.lng()},16z`,
        "_blank",
        "noopener,noreferrer"
      );
    });

    const geocoder = new G.Geocoder();
    const address  = property.location || property.address || "";

    const pinPosition = (property.latitude && property.longitude)
      ? new G.LatLng(parseFloat(property.latitude), parseFloat(property.longitude))
      : null;

    /* Build the Google Maps URL for this property */
    const mapsUrl = pinPosition
      ? `https://www.google.com/maps/search/?api=1&query=${pinPosition.lat()},${pinPosition.lng()}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address + ", India")}`;

    const placePin = (pos) => {
      map.setCenter(pos);
      map.setZoom(15);

      /* Bouncing red pin — stops after 2 s */
      const marker = new G.Marker({
        position:  pos,
        map,
        title:     property.title || "Property Location",
        animation: G.Animation.BOUNCE,
      });
      setTimeout(() => marker.setAnimation(null), 2100);

      /* InfoWindow with title, address, price AND a "Open in Google Maps" link */
      const iw = new G.InfoWindow({
        content: `
          <div style="font-family:sans-serif;padding:6px 4px;min-width:210px;">
            <strong style="font-size:14px;display:block;margin-bottom:2px;">
              ${property.title ?? ""}
            </strong>
            <span style="color:#6b7280;font-size:12px;">${address}</span><br/>
            <span style="color:#2563eb;font-weight:700;font-size:14px;">
              ${formatIndianPrice(property.price)}
            </span>
            <a href="${mapsUrl}"
               target="_blank" rel="noopener noreferrer"
               style="display:inline-flex;align-items:center;gap:4px;margin-top:10px;
                      color:#2563eb;font-size:12px;font-weight:600;text-decoration:none;
                      background:#eff6ff;padding:5px 12px;border-radius:20px;border:1px solid #bfdbfe;">
              🗺 Open in Google Maps →
            </a>
          </div>`,
      });

      /* Open InfoWindow immediately so user sees it on load */
      iw.open(map, marker);

      /* Clicking marker re-opens InfoWindow if closed */
      marker.addListener("click", () => iw.open(map, marker));
    };

    if (pinPosition) {
      placePin(pinPosition);
    } else if (address) {
      const geocodeQuery = address.toLowerCase().includes("india")
        ? address
        : `${address}, India`;
      geocoder.geocode({ address: geocodeQuery }, (results, status) => {
        if (status === "OK" && results[0]) {
          placePin(results[0].geometry.location);
        } else {
          console.warn("[PropertyDetails] Geocoding failed:", status, address);
        }
      });
    }

    setTimeout(() => G.event.trigger(map, "resize"), 400);

    return () => {
      mapInstanceRef.current = null;
    };
  }, [mapsReady, property]);

  /* ═══════════════════════════
     MEMOIZED DERIVED VALUES
     ═══════════════════════════ */
  const galleryImages = useMemo(() => {
    if (!property) return [];
    if (property.images?.length      > 0) return property.images;
    if (property.mainImages?.length  > 0) return property.mainImages;
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

  /* ═══════════════════════════
     CALLBACKS
     ═══════════════════════════ */
  const toggleFavorite = useCallback(() => {
    setFavorite((prev) => {
      const next = !prev;
      try { localStorage.setItem(`fav-${slug}`, next); } catch {}
      return next;
    });
  }, [slug]);

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
    setCopyToast(true);
    setTimeout(() => setCopyToast(false), 1500);
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

  const isBrochureValid = useCallback(() => {
    const { name, mobile } = brochureForm;
    return !!(name && mobile && /^[0-9]{10,15}$/.test(mobile));
  }, [brochureForm]);

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

      setBrochureStatus("success");
      window.location.href = data.url;

      setTimeout(() => { setShowBrochureModal(false); setBrochureStatus(""); }, 1000);
    } catch (err) {
      console.error("Brochure error:", err);
      setBrochureStatus("error");
    }
  }, [property?.id, brochureForm]);

  const handleImageClick = useCallback((i) => {
    setZoomImage(galleryImages[i]);
    setZoomOpen(true);
  }, [galleryImages]);

  /* ═══════════════════════════
     EARLY RETURNS (after hooks)
     ═══════════════════════════ */
  if (loading)   return <p className="loading">Loading…</p>;
  if (!property) return <p className="loading">Property not found</p>;

  /* ═══════════════════════════
     RENDER
     ═══════════════════════════ */
  return (
    <div className="details-container">

      {/* ── TOP ROW: Back + Icon actions (top-right) ── */}
      <div className="details-topbar">
        <Link to="/" className="back-btn">← Back to Listings</Link>
        <div className="icon-actions">
          {/* Call */}
          <div className="tooltip-wrapper">
            <a href="tel:+918309120616" className="action-btn">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.6 3.27 2 2 0 0 1 3.58 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.54a16 16 0 0 0 6 6l.91-.91a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
              </svg>
            </a>
            <span className="tooltip">Call Now</span>
          </div>
          {/* Download */}
          <div className="tooltip-wrapper">
            <button className="action-btn" onClick={openBrochure}>
              <Download strokeWidth={2} size={20} />
            </button>
            <span className="tooltip">Brochure</span>
          </div>
          {/* Share */}
          <div className="tooltip-wrapper">
            <button className="action-btn" onClick={handleShare}>
              <Share2 strokeWidth={2} size={20} />
            </button>
            <span className="tooltip">Share</span>
          </div>
          {/* Favorite */}
          <div className="tooltip-wrapper">
            <button className="action-btn" onClick={toggleFavorite}>
              <Heart size={20} strokeWidth={2}
                color={favorite ? "red" : "#64748b"}
                fill={favorite ? "red" : "none"} />
            </button>
            <span className="tooltip">{favorite ? "Wishlisted" : "Wishlist"}</span>
          </div>
        </div>
      </div>

      {/* ── HEADER: Title + Live Tour button ── */}
      <div className="details-header-row">
        <div className="details-header-left">
          <h1 className="details-title">{property.title}</h1>
          <p className="details-location">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="#f97316" stroke="none"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
            {property.location}
          </p>
          <div className="header-badges">
            <span className="no-brokerage-badge">
              <BadgeCheck size={14} strokeWidth={2} />
              No Brokerage
            </span>
            {property.reraApproved && (
              <span className="rera-header-badge">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>
                RERA Approved
              </span>
            )}
            {/* Price inline with badges */}
            <span className="details-price-inline">{formatIndianPrice(property.price)}</span>
          </div>
        </div>

        {/* ── LIVE TOUR big orange button ── */}
        <button className="live-tour-header-btn" onClick={() => setLiveTourOpen(true)}>
          <span className="live-tour-header-dot" />
          Live Video Tour
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </button>
      </div>

      {/* Copy toast */}
      {copyToast && <div className="copy-toast">Link copied to clipboard!</div>}

      {/* ── MEDIA: GALLERY + VIDEO ── */}
      <div className="media-wrapper">
        <div className="gallery-left">
          <GalleryCarousel
            images={galleryImages}
            autoplay
            interval={4500}
            onImageClick={handleImageClick}
          />
        </div>
        <div className="video-right">
          <div className="video-card" onClick={() => setIsVideoOpen(true)}>
            <img src={videoThumbnail} className="video-thumb" alt="Video preview" />
            <div className="video-dark-overlay" />
            <div className="video-play-button">▶</div>
          </div>
        </div>
      </div>

      {/* ── ZOOM MODAL ── */}
      <ImageZoomModal
        open={zoomOpen}
        image={zoomImage}
        onClose={() => setZoomOpen(false)}
      />

      {/* ── BOOK VIRTUAL BRIEFING STRIP ── */}
      <div className="briefing-strip">
        <div className="briefing-strip-left">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
          <button className="briefing-calendar-icon" onClick={() => navigate(`/book/${slug}`)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8"  y1="2" x2="8"  y2="6"/>
              <line x1="3"  y1="10" x2="21" y2="10"/>
            </svg>
          </button>
        </div>
      </div>

      {/* ── SPECS — horizontal layout ── */}
      <div className="spec-grid">
        <div className="spec-box">
          <div className="spec-icon spec-icon-blue">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7v13"/><path d="M21 7v13"/><path d="M3 14h18"/><path d="M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2"/><path d="M5 12V9a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v3"/><path d="M13 12V9a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v3"/></svg>
          </div>
          <div className="spec-text">
            <b>{property.bedrooms}</b>
            <span>Bedrooms</span>
          </div>
          <div className="spec-underline" />
        </div>
        <div className="spec-box">
          <div className="spec-icon spec-icon-orange">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 11h18"/><path d="M3 11V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v6"/><path d="M3 11v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M7 11V9"/></svg>
          </div>
          <div className="spec-text">
            <b>{property.bathrooms}</b>
            <span>Bathrooms</span>
          </div>
          <div className="spec-underline spec-underline-orange" />
        </div>
        <div className="spec-box">
          <div className="spec-icon spec-icon-green">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 3H3v18h18V3z"/><path d="M9 3v18"/><path d="M3 9h18"/><path d="M3 15h18"/><path d="M15 3v18"/></svg>
          </div>
          <div className="spec-text">
            <b>{property.sqft || property.landArea}</b>
            <span>Land Area</span>
          </div>
          <div className="spec-underline spec-underline-green" />
        </div>
        <div className="spec-box">
          <div className="spec-icon spec-icon-blue">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M5 17H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v9a2 2 0 0 1-2 2h-2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/></svg>
          </div>
          <div className="spec-text">
            <b>{property.parking}</b>
            <span>Parking</span>
          </div>
          <div className="spec-underline" />
        </div>
      </div>

      {/* ── PROPERTY DETAILS ── */}
      <div className="details-section">
        <h2>Property Details</h2>
        <div className="pd-table">
          {[
            ["Type",         property.type],
            ["Built-up Area",property.builtupArea],
            ["Facing",       property.facing],
            ["Furnishing",   property.furnishing],
            ["Maintenance",  property.maintenance],
            ["Carpet Area",  property.carpetArea],
          ].filter(([,v]) => v).map(([label, value]) => (
            <div key={label} className="pd-row">
              <span className="pd-label">{label}</span>
              <b className="pd-value">{value}</b>
            </div>
          ))}
        </div>
      </div>

      {/* ── OVERVIEW ── */}
      <div className="details-section">
        <h2>Property Overview</h2>
        <p className="property-overview-text">{property.description}</p>
      </div>

      {/* ── NEARBY LOCATIONS (includes its own Google Map) ── */}
      <NearbyLocations
        locations={property.nearby || []}
        propertyLocation={property.location || ""}
      />

      {/* ── AMENITIES ── */}
      <div className="details-section">
        <h2>Features & Amenities</h2>
        <Amenities amenities={property.amenities || []} />
      </div>

      {/* ── LOCATION MAP — real Google Map replacing the old iframe ── */}
      <div className="details-section">
        <h2>Location Map</h2>
        <div className="map-wrapper">
          {mapError ? (
            /* Graceful fallback if SDK fails to load */
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(property.location)}`}
              target="_blank"
              rel="noreferrer"
              className="map-fallback-link"
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
              <div
                ref={mapContainerRef}
                className="map-canvas"
                style={{ opacity: mapsReady ? 1 : 0 }}
              />
            </>
          )}
        </div>
      </div>

      {/* ── VIDEO MODAL ── */}
      <VideoModal
        open={isVideoOpen}
        onClose={() => setIsVideoOpen(false)}
        videoUrl={property.videoUrl}
      />

      {/* ── BROCHURE MODAL ── */}
      {showBrochureModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Download Brochure</h3>
            <p>Please enter your details to download.</p>

            <form onSubmit={handleBrochureSubmit}>
              <div className="input-group">
                <label>Name *</label>
                <input
                  name="name" type="text"
                  value={brochureForm.name}
                  onChange={handleBrochureChange}
                  required
                />
              </div>
              <div className="input-group">
                <label>Mobile *</label>
                <input
                  name="mobile" type="tel"
                  value={brochureForm.mobile}
                  onChange={handleBrochureChange}
                  required
                />
              </div>
              <div className="input-group">
                <label>Email (optional)</label>
                <input
                  name="email" type="email"
                  value={brochureForm.email}
                  onChange={handleBrochureChange}
                />
              </div>

              <div className="modal-btn-group">
                <button
                  type="submit"
                  className="submit-btn"
                  disabled={!isBrochureValid() || brochureStatus === "sending"}
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
                <p style={{ color: "red", marginTop: 10 }}>
                  Please check your details and try again.
                </p>
              )}
              {brochureStatus === "success" && (
                <p style={{ color: "green", marginTop: 10 }}>
                  Brochure downloaded successfully!
                </p>
              )}
            </form>
          </div>
        </div>
      )}

      {/* AskDiscoverWidget — rendered at body level to avoid stacking context issues */}
      <AskDiscoverWidget property={property} />

      {/* ── LIVE TOUR MODAL ── */}
      {(liveTourOpen || liveTourEnded) && (
        <div className="live-modal-overlay" onClick={() => { if (!liveTourJoined) { liveTourApiRef.current?.dispose(); setLiveTourJoined(false); setLiveTourOpen(false); setLiveTourEnded(false); } }}>
          <div className="live-modal-box" onClick={e => e.stopPropagation()}>
            {liveTourEnded ? (
              /* ── THANK YOU SCREEN ── */
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'56px 32px', textAlign:'center', background:'linear-gradient(135deg,#f0f4ff,#fff7ed)', minHeight:380, borderRadius:16, gap:14 }}>
                <div style={{ fontSize:64, animation:'none' }}>🏡</div>
                <h2 style={{ fontSize:24, fontWeight:800, color:'#1e3a8a', margin:0, letterSpacing:'-0.3px' }}>Thank you for your time!</h2>
                <p style={{ fontSize:14, color:'#6b7280', lineHeight:1.65, maxWidth:320, margin:'4px 0 20px' }}>
                  Our property expert will follow up with you shortly.<br/>We hope you enjoyed the live tour of {property?.title}.
                </p>
                <div style={{ display:'flex', gap:10, flexWrap:'wrap', justifyContent:'center' }}>
                  <button
                    onClick={() => { setLiveTourEnded(false); setLiveTourOpen(false); setLiveTourName(''); }}
                    style={{ padding:'12px 24px', borderRadius:10, border:'none', background:'linear-gradient(135deg,#f97316,#fb923c)', color:'white', fontSize:14, fontWeight:700, cursor:'pointer', boxShadow:'0 4px 14px rgba(249,115,22,0.4)' }}
                  >📅 Book Another Tour</button>
                  <button
                    onClick={() => { setLiveTourEnded(false); setLiveTourOpen(false); setLiveTourName(''); }}
                    style={{ padding:'12px 24px', borderRadius:10, border:'1.5px solid #d1d5db', background:'white', color:'#6b7280', fontSize:14, fontWeight:600, cursor:'pointer' }}
                  >Close</button>
                </div>
              </div>
            ) : !liveTourJoined ? (
              <div className="live-prejoin">
                <img src={property.mainImages?.[0] || property.images?.[0]} alt="" className="live-prejoin-bg" />
                <div className="live-prejoin-overlay" />
                <div className="live-prejoin-content">
                  <div className="live-prejoin-dot" />
                  <h2>Join Live Tour</h2>
                  <p>{property.title}</p>
                  <input
                    type="text"
                    placeholder="Enter your name"
                    value={liveTourName}
                    onChange={e => setLiveTourName(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && liveTourName && handleJoinLiveTour()}
                    className="live-name-input"
                    autoFocus
                  />
                  <button className="live-join-btn" onClick={handleJoinLiveTour} disabled={!liveTourName}>
                    Join Live Now →
                  </button>
                  <button className="live-cancel-btn" onClick={() => setLiveTourOpen(false)}>Cancel</button>
                </div>
              </div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', height:'100%', borderRadius:18, overflow:'hidden' }}>
                {/* ── OGM Header bar — sits ABOVE Jitsi so pip renders below it ── */}
                <div style={{
                  display:'flex', alignItems:'center', justifyContent:'space-between',
                  background:'#111827', padding:'0 16px',
                  height:60, flexShrink:0, zIndex:10, position:'relative',
                }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <div style={{
                      width:34,height:34,borderRadius:9,flexShrink:0,
                      background:'linear-gradient(135deg,#3b82f6,#f97316)',
                      display:'flex',alignItems:'center',justifyContent:'center',
                      fontSize:12,fontWeight:900,color:'white',
                      boxShadow:'0 2px 8px rgba(59,130,246,0.4)',
                    }}>OG</div>
                    <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
                      <span style={{ color:'white', fontSize:14, fontWeight:800, lineHeight:1, letterSpacing:0.2 }}>OGM Live</span>
                      <span style={{ color:'rgba(255,255,255,0.5)', fontSize:10, lineHeight:1 }}>Live Property Tour</span>
                    </div>
                  </div>
                  <button onClick={() => { liveTourApiRef.current?.dispose(); setLiveTourJoined(false); setLiveTourEnded(true); }}
                    style={{
                      width:34,height:34,borderRadius:'50%',border:'none',
                      background:'rgba(255,255,255,0.12)',color:'white',
                      fontSize:16,cursor:'pointer',display:'flex',
                      alignItems:'center',justifyContent:'center',
                      transition:'background 0.18s',
                    }}
                    onMouseEnter={e => e.target.style.background='#dc2626'}
                    onMouseLeave={e => e.target.style.background='rgba(255,255,255,0.12)'}
                  >✕</button>
                </div>
                {/* ── Jitsi renders below header — pip stays in video area ── */}
                <div style={{ flex:1, position:'relative', overflow:'hidden' }}>
                <LiveJitsi
                  containerRef={liveTourJitsiRef}
                  apiRef={liveTourApiRef}
                  name={liveTourName}
                  roomName={`ogm-live-${property?.id}-${new Date().toISOString().slice(0,10).replace(/-/g,"")}`}
                  onClose={() => { liveTourApiRef.current?.dispose(); setLiveTourJoined(false); setLiveTourEnded(true); }}
                />
                </div>
              </div>
            )}
            )}
          </div>
        </div>
      )}

    </div>
  );
}