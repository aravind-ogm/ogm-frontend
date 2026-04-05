import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { formatPrice } from "./Helpers";
import { FALLBACK_IMAGE } from "./Constants";
import PropertyDistanceBadge from "./PropertyDistanceBadge";
import "../../styles/ai/ai-property-card.css";

/* ─────────────────────────────────────────────────────────
   HIDDEN TYPES — property type values that are generic/
   meaningless and should not be shown as a chip label
───────────────────────────────────────────────────────── */
const HIDDEN_TYPES = new Set([
  "property_card","property","card","result","listing","undefined","null","",
]);

/* ═══════════════════════════════════════════════════════════
   AiPropertyCard
   Displays a single property result card with:
   - Left: padded image with RERA badge, price overlay, arrows
   - Right: title, AI Match badge, location, specs, bullets, CTAs
   Props:
     property    — property data object from backend
     onMapView   — callback to open map panel on right
     isMapOpen   — bool, true when map panel is open
     onRemove    — callback to remove card from results
     userPosition — { latitude, longitude } for distance badge
═══════════════════════════════════════════════════════════ */
function AiPropertyCard({ property, onMapView, isMapOpen, onRemove, userPosition }) {
  const navigate = useNavigate();

  /* Current image index for the gallery carousel */
  const [currentImg, setCurrentImg] = useState(0);

  /* Guard — don't render if no property data */
  if (!property) return null;

  /* ── Image gallery ──────────────────────────────────────
     Use gallery array if available, else fall back to
     primaryImage → image → FALLBACK_IMAGE constant
  ─────────────────────────────────────────────────────── */
  const images = property.gallery?.length > 0
      ? property.gallery
      : [property.primaryImage || property.image || FALLBACK_IMAGE];

  /* Carousel navigation handlers */
  const nextImg = (e) => {
    e.stopPropagation();
    setCurrentImg((p) => (p + 1) % images.length);
  };
  const prevImg = (e) => {
    e.stopPropagation();
    setCurrentImg((p) => (p - 1 + images.length) % images.length);
  };

  /* Navigate to full property detail page */
  const handleClick = () => navigate(`/property/${property.slug || property.id}`);

  /* Open map panel on right side when location is clicked */
  const handleLocationClick = (e) => {
    e.stopPropagation();
    onMapView?.();
  };

  /* ── Property type chip ─────────────────────────────────
     Filter out generic/meaningless type values
  ─────────────────────────────────────────────────────── */
  const cleanType = useMemo(() => {
    const raw = (property.type || "").trim();
    return HIDDEN_TYPES.has(raw.toLowerCase()) ? null : raw;
  }, [property.type]);

  /* ── Spec chips ─────────────────────────────────────────
     Build array of bed/bath/sqft specs, filter nulls
  ─────────────────────────────────────────────────────── */
  const specs = useMemo(() => [
    property.bedrooms  && `${property.bedrooms} Beds`,
    property.bathrooms && `${property.bathrooms} Baths`,
    property.sqft      && `${Number(property.sqft).toLocaleString("en-IN")} sqft`,
  ].filter(Boolean), [property.bedrooms, property.bathrooms, property.sqft]);

  /* ── Bullet points ──────────────────────────────────────
     Generated from description or fallback filler text
  ─────────────────────────────────────────────────────── */
  const bulletPoints = useMemo(() => generateBulletPoints(property), [property]);

  /* ── AI Match score ─────────────────────────────────────
     Deterministic pseudo-score based on property ID
     so it stays stable between renders (90–99%)
  ─────────────────────────────────────────────────────── */
  const aiMatch = useMemo(() => {
    const hash = (property.id || 0) % 10;
    return 90 + hash;
  }, [property.id]);

  /* ════════════════════════════════════════════════════════
     RENDER
  ════════════════════════════════════════════════════════ */
  return (
      <div className="pcard">

        {/* ══════════════════════════════════════════
          IMAGE SECTION (left side)
          White padding creates floating image effect
      ══════════════════════════════════════════ */}
        <div className="pcard-img" onClick={handleClick}>

          {/* Main property photo */}
          <img
              src={images[currentImg]}
              alt={property.title || "Property"}
              loading="lazy"
              onError={(e) => { e.target.src = FALLBACK_IMAGE; }}
          />

          {/* Image counter — "🖼 1/5" — only if multiple images */}
          {images.length > 1 && (
              <div className="pcard-counter">🖼 {currentImg + 1}/{images.length}</div>
          )}

          {/* Prev/Next carousel buttons — only if multiple images */}
          {images.length > 1 && (
              <>
                <button className="pcard-arrow l" onClick={prevImg} aria-label="Previous image">‹</button>
                <button className="pcard-arrow r" onClick={nextImg} aria-label="Next image">›</button>
              </>
          )}

          {/* Price overlay — bottom-left in Playfair Display font */}
          <div className="pcard-price">{formatPrice(property.price)}</div>

          {/* RERA / SOLD badges — top-left frosted glass */}
          <div className="pcard-tags">
            {property.reraApproved && (
                <span className="ptag rera">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none"
                   stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden="true">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              RERA
            </span>
            )}
            {property.soldOut && <span className="ptag sold">SOLD OUT</span>}
          </div>

        </div>
        {/* END IMAGE SECTION */}

        {/* ══════════════════════════════════════════
          CONTENT SECTION (right side)
          Flex column — buttons auto-pin to bottom
      ══════════════════════════════════════════ */}
        <div className="pcard-body">

          {/* Remove (×) button — only shown when onRemove prop provided */}
          {onRemove && (
              <button
                  className="pcard-x"
                  onClick={(e) => { e.stopPropagation(); onRemove(property.id); }}
                  aria-label="Remove property"
              >✕</button>
          )}

          {/* ── Title Row ───────────────────────────
            Property name (left) + AI Match badge (right)
        ─────────────────────────────────────────── */}
          <div className="pcard-title-row">

            {/* Property name — single line, ellipsis on overflow */}
            <h3 className="pcard-title" onClick={handleClick}>
              {property.title || "Untitled Property"}
            </h3>

            {/* AI Match Badge
              Structure: [white circle with %] [AI Match text]
              All inside a light-blue pill
              Reference: 95% AI Match image
              - Circle: 30×30px, white fill, light-blue ring
              - Text: 13px bold dark navy
          */}
            <div className="pcard-ai-match" aria-label={`${aiMatch}% AI Match`}>
              <div className="pcard-ai-circle">{aiMatch}%</div>
              <span className="pcard-ai-label">AI Match</span>
            </div>

          </div>

          {/* ── Location ────────────────────────────
            Clickable — opens map panel on right side
        ─────────────────────────────────────────── */}
          <div
              className="pcard-loc pcard-loc-clickable"
              onClick={handleLocationClick}
              title="View on map"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && handleLocationClick(e)}
          >
            {/* Orange pin icon */}
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                 stroke="#f97316" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
              <circle cx="12" cy="10" r="3"/>
              <path d="M12 2a8 8 0 0 1 8 8c0 5.25-8 12-8 12S4 15.25 4 10a8 8 0 0 1 8-8z"/>
            </svg>
            <span className="pcard-loc-text">
            {property.location || "Location not specified"}
          </span>
            {/* Distance badge — shows km from user if location permission granted */}
            <PropertyDistanceBadge
                userLat={userPosition?.latitude}
                userLng={userPosition?.longitude}
                propLat={property.latitude ?? property.lat}
                propLng={property.longitude ?? property.lng ?? property.lon}
            />
          </div>

          {/* ── Spec Chips ──────────────────────────
            Beds · Baths · Sqft · Property Type
        ─────────────────────────────────────────── */}
          {specs.length > 0 && (
              <div className="pcard-specs">
                {/* Beds */}
                {property.bedrooms && (
                    <span className="pcard-chip">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                     stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                  <polyline points="9 22 9 12 15 12 15 22"/>
                </svg>
                      {property.bedrooms} Beds
              </span>
                )}
                {/* Baths */}
                {property.bathrooms && (
                    <span className="pcard-chip">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                     stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                  <path d="M4 12h16v3a8 8 0 0 1-16 0v-3z"/>
                  <line x1="4" y1="12" x2="4" y2="6"/>
                  <path d="M4 6a2 2 0 0 1 4 0v6"/>
                </svg>
                      {property.bathrooms} Baths
              </span>
                )}
                {/* Sqft */}
                {property.sqft && (
                    <span className="pcard-chip">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                     stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                  <rect x="3" y="3" width="18" height="18" rx="2"/>
                </svg>
                      {Number(property.sqft).toLocaleString("en-IN")} sqft
              </span>
                )}
                {/* Property type pill */}
                {cleanType && (
                    <span className="pcard-chip pcard-chip-type">{cleanType}</span>
                )}
              </div>
          )}

          {/* ── Bullet Points ───────────────────────
            Key highlights — from description or fillers
        ─────────────────────────────────────────── */}
          <ul className="pcard-bullets">
            {bulletPoints.map((pt, i) => <li key={i}>{pt}</li>)}
          </ul>

          {/* Developer name — shown only if available */}
          {property.developerName && (
              <div className="pcard-builder">
                <span className="pcard-bname">By {property.developerName}</span>
              </div>
          )}

          {/* ══════════════════════════════════════════
            ACTION BUTTONS — pinned to card bottom
            via margin-top: auto on .pcard-acts
            All dark filled pills matching Image 2
        ══════════════════════════════════════════ */}
          <div className="pcard-acts">

            {/* Show Interest */}
            <button className="pact pact-interest" onClick={handleClick}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"
                   stroke="none" aria-hidden="true">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
              </svg>
              show Interest
            </button>

            {/* Call — opens phone dialer */}
            <button className="pact pact-call"
                    onClick={(e) => { e.stopPropagation(); window.open("tel:+919494808825"); }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"
                   stroke="none" aria-hidden="true">
                <path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1-9.4 0-17-7.6-17-17 0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z"/>
              </svg>
              Call
            </button>

            {/* Live Video Tour */}
            <button className="pact pact-tour" onClick={handleClick}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                   stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                <polygon points="23 7 16 12 23 17 23 7"/>
                <rect x="1" y="5" width="15" height="14" rx="2"/>
              </svg>
              Live Video Tour
            </button>

            {/* Watchlist — turns orange when map is open */}
            <button
                className={`pact pact-watchlist${isMapOpen ? " active" : ""}`}
                onClick={(e) => { e.stopPropagation(); onMapView?.(); }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"
                   stroke="none" aria-hidden="true">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11h-4v4h-2v-4H7v-2h4V7h2v4h4v2z"/>
              </svg>
              Watchlist
            </button>

          </div>
          {/* END ACTION BUTTONS */}

        </div>
        {/* END CONTENT SECTION */}

      </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   generateBulletPoints(property)
   Builds 3 bullet point highlights for a property card.
   Priority order:
     1. First 2 sentences from description (if > 20 chars)
     2. Prime location filler
     3. Spacious X BHK filler
     4. RERA approved message
     5. Amenities list
     6. Generic fillers (connectivity, gated, rental yield)
═══════════════════════════════════════════════════════════ */
function generateBulletPoints(p) {
  const points = [];
  const seen   = new Set();

  /* Add a point only if it's unique (case-insensitive dedup) */
  const add = (text) => {
    const key = text.toLowerCase().trim();
    if (key && !seen.has(key)) { seen.add(key); points.push(text); }
  };

  /* 1. Extract from description */
  if (p.description) {
    p.description
        .split(/[.!?]/)
        .map(s => s.trim())
        .filter(s => s.length > 20)
        .slice(0, 2)
        .forEach(add);
  }

  /* 2. Location filler */
  if (points.length < 2 && p.location)
    add(`Prime location in ${p.location} with excellent connectivity`);

  /* 3. Size filler */
  if (points.length < 2 && p.sqft && p.bedrooms)
    add(`Spacious ${p.bedrooms} BHK spanning ${Number(p.sqft).toLocaleString("en-IN")} sqft`);

  /* 4. RERA approved */
  if (p.reraApproved && points.length < 3)
    add("RERA approved — full transparency and legal compliance");

  /* 5. Amenities */
  if (p.amenities?.length > 0 && points.length < 3)
    add(`Amenities: ${p.amenities.slice(0, 4).join(", ")}`);

  /* 6. Generic fillers */
  const fillers = [
    "Well-connected via major roads and upcoming metro line",
    "Gated community with 24/7 security and modern amenities",
    "Strong rental potential and long-term appreciation",
  ];
  for (const f of fillers) {
    if (points.length >= 3) break;
    add(f);
  }

  return points.slice(0, 3);
}

/* Wrap in React.memo to prevent unnecessary re-renders */
export default React.memo(AiPropertyCard);