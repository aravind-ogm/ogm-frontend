import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import GalleryCarousel  from "../components/GalleryCarousel";
import VideoModal       from "../components/VideoModal";
import Amenities        from "../components/Amenities";
import ImageZoomModal   from "../components/ImageZoomModal";
import NearbyLocations  from "../components/NearbyLocations";
import LiveTourButton   from "../components/LiveTourButton";
import { BadgeCheck, Share2, Heart, Download } from "lucide-react";
import "../styles/PropertyDetails.css";

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

export default function PropertyDetails() {
  const { slug } = useParams();

  /* ── Core state ── */
  const [property,          setProperty]          = useState(null);
  const [loading,           setLoading]           = useState(true);
  const [isVideoOpen,       setIsVideoOpen]       = useState(false);
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

      <Link to="/" className="back-btn">← Back to Listings</Link>

      {/* ── HEADER ── */}
      <div className="details-header-row">
        <div>
          <h1 className="details-title">{property.title}</h1>
          <p className="details-location">📍 {property.location}</p>
          <div className="no-brokerage">
            <BadgeCheck className="no-brokerage-icon" />
            No Brokerage
          </div>
        </div>

        <div className="top-actions">

          {/* Book Meeting */}
          <div className="tooltip-wrapper">
            <a
              href="https://calendly.com/hemanth-ogm/30min"
              target="_blank"
              rel="noreferrer"
              className="action-btn"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"
                fill="none" stroke="#2563eb" strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8"  y1="2" x2="8"  y2="6"/>
                <line x1="3"  y1="10" x2="21" y2="10"/>
              </svg>
            </a>
            <span className="tooltip">Book a Meeting</span>
          </div>

          {/* Call Now */}
          <div className="tooltip-wrapper">
            <a href="tel:+918309120616" className="action-btn call-btn">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"
                fill="none" stroke="#059669" strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 01-2.18 2A19.79 19.79 0 0111.19 18a19.5
                  19.5 0 01-6-6A19.79 19.79 0 012.1 4.18 2 2 0 014.11 2h3a2 2 0
                  012 1.72c.07.96.26 1.9.56 2.81a2 2 0 01-.45 2.11L8.09 10a16 16
                  0 006 6l1.36-1.27a2 2 0 012.11-.45c.91.3 1.85.49 2.81.7A2 2 0
                  0122 16.92z"/>
              </svg>
            </a>
            <span className="tooltip">Call Now</span>
          </div>

          {/* Download Brochure */}
          <div className="tooltip-wrapper">
            <button className="action-btn" onClick={openBrochure}>
              <Download className="share-icon" strokeWidth={2} size={24} />
            </button>
            <span className="tooltip">Download Brochure</span>
          </div>

          {/* Share */}
          <div className="tooltip-wrapper">
            <button className="action-btn" onClick={handleShare}>
              <Share2 className="share-icon" strokeWidth={2} size={24} />
            </button>
            <span className="tooltip">Share</span>
          </div>

          {/* Favorite */}
          <div className="tooltip-wrapper">
            <button className="action-btn" onClick={toggleFavorite}>
              <Heart
                className="share-icon"
                size={24}
                strokeWidth={2}
                color={favorite ? "red" : "#0ea5e9"}
                fill={favorite  ? "red" : "none"}
              />
            </button>
            <span className="tooltip">
              {favorite ? "Remove from Wishlist" : "Add to Wishlist"}
            </span>
          </div>

        </div>
      </div>

      {/* Copy toast */}
      {copyToast && (
        <div className="copy-toast">Link copied to clipboard!</div>
      )}

      {/* ── PRICE ── */}
      <div className="details-top-info">
        <span className="details-price">{formatIndianPrice(property.price)}</span>
        {property.reraApproved && <span className="rera-tag">RERA Approved</span>}
      </div>

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

      {/* ── SPECS ── */}
      <div className="spec-grid">
        <div className="spec-box"><b>{property.bedrooms}</b>  Bedrooms</div>
        <div className="spec-box"><b>{property.bathrooms}</b> Bathrooms</div>
        <div className="spec-box"><b>{property.landArea}</b>  Land Area</div>
        <div className="spec-box"><b>{property.parking}</b>   Parking</div>
      </div>

      {/* ── PROPERTY DETAILS ── */}
      <div className="details-section">
        <h2>Property Details</h2>
        <div className="details-table">
          <div><span>Type:</span>        <b>{property.type}</b></div>
          <div><span>Built-up Area:</span><b>{property.builtupArea}</b></div>
          <div><span>Facing:</span>      <b>{property.facing}</b></div>
          <div><span>Furnishing:</span>  <b>{property.furnishing}</b></div>
          <div><span>Maintenance:</span> <b>{property.maintenance}</b></div>
        </div>
      </div>

      {/* ── OVERVIEW ── */}
      <div className="premium-description">
        <div className="desc-left">
          <h2>Property Overview</h2>
        </div>
        <div className="desc-right">
          <p>{property.description}</p>
        </div>
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

      <LiveTourButton property={property} variant="netflix" />

    </div>
  );
}
