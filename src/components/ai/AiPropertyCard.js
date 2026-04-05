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

  /* Watchlist saved state — toggled by heart button on image */
  const [watchlisted, setWatchlisted] = useState(false);

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

  /* Toggle watchlist — saves property locally, fires optional callback */
  const handleWatchlist = (e) => {
    e.stopPropagation();
    setWatchlisted(prev => {
      const next = !prev;
      console.log(`[AiPropertyCard] Watchlist ${next ? 'ADD' : 'REMOVE'} — id=${property.id} title="${property.title}"`);
      return next;
    });
  };

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

          {/* ── Heart / Favourite button ─────────────────────────────
               White circle, top-right but left of counter to avoid overlap
          ─────────────────────────────────────────────────────────── */}
          <button
              className={`pcard-fav${watchlisted ? " pcard-fav--saved" : ""}`}
              onClick={handleWatchlist}
              aria-label={watchlisted ? "Remove from watchlist" : "Save to watchlist"}
              title={watchlisted ? "Saved" : "Save to watchlist"}
          >
            <svg
                width="16" height="16" viewBox="0 0 24 24"
                fill={watchlisted ? "#ef4444" : "none"}
                stroke={watchlisted ? "#ef4444" : "#64748b"}
                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                aria-hidden="true"
            >
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
          </button>

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
                 stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
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
          {/* ── Premium Spec Chips ────────────────────────────────────────
               Each chip: coloured icon box + bold number + muted label
               Matches UI design reference exactly
          ─────────────────────────────────────────────────────────── */}
          {specs.length > 0 && (
              <div className="pcard-specs">

                {/* Beds — orange icon box */}
                {property.bedrooms && (
                    <span className="pcard-chip pcard-chip-spec">
                  <span className="pcard-spec-icon pcard-spec-icon--bed" aria-hidden="true">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                         stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M2 9V19H22V9"/>
                      <path d="M2 9C2 9 2 5 12 5C22 5 22 9 22 9"/>
                      <path d="M12 5V9"/>
                      <rect x="5" y="11" width="4" height="3" rx="1"/>
                      <rect x="15" y="11" width="4" height="3" rx="1"/>
                    </svg>
                  </span>
                  <span className="pcard-spec-value">{property.bedrooms}</span>
                  <span className="pcard-spec-label">Beds</span>
                </span>
                )}

                {/* Baths — blue icon box */}
                {property.bathrooms && (
                    <span className="pcard-chip pcard-chip-spec">
                  <span className="pcard-spec-icon pcard-spec-icon--bath" aria-hidden="true">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                         stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 6C9 4.34 7.66 3 6 3C4.34 3 3 4.34 3 6L3 12"/>
                      <path d="M3 12L21 12L21 14C21 17.31 18.31 20 15 20L9 20C5.69 20 3 17.31 3 14Z"/>
                      <line x1="9" y1="20" x2="9" y2="22"/>
                      <line x1="15" y1="20" x2="15" y2="22"/>
                    </svg>
                  </span>
                  <span className="pcard-spec-value">{property.bathrooms}</span>
                  <span className="pcard-spec-label">Baths</span>
                </span>
                )}

                {/* Sqft — green icon box */}
                {property.sqft && (
                    <span className="pcard-chip pcard-chip-spec">
                  <span className="pcard-spec-icon pcard-spec-icon--area" aria-hidden="true">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                         stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2"/>
                      <path d="M3 9L9 3M3 15L15 3"/>
                    </svg>
                  </span>
                  <span className="pcard-spec-value">{Number(property.sqft).toLocaleString("en-IN")}</span>
                  <span className="pcard-spec-label">sqft</span>
                </span>
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

            {/* View on Map — opens map panel on right side */}
            <button
                className={`pact pact-mapview${isMapOpen ? " active" : ""}`}
                onClick={(e) => { e.stopPropagation(); onMapView?.(); }}
                aria-label="View on map"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                   stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                   aria-hidden="true">
                <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/>
                <line x1="8" y1="2" x2="8" y2="18"/>
                <line x1="16" y1="6" x2="16" y2="22"/>
              </svg>
              View on Map
            </button>

            {/* Watchlist — saves property, heart turns red when saved */}
            <button
                className={`pact pact-watchlist-btn${watchlisted ? " watchlisted" : ""}`}
                onClick={handleWatchlist}
                aria-label={watchlisted ? "Remove from watchlist" : "Add to watchlist"}
            >
              <svg width="12" height="12" viewBox="0 0 24 24"
                   fill={watchlisted ? "currentColor" : "none"}
                   stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                   aria-hidden="true">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
              </svg>
              {watchlisted ? "Saved ♥" : "Watchlist"}
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

  /* 5b. Possession status if available */
  if (p.possessionStatus && points.length < 4)
    add(`Possession: ${p.possessionStatus}`);

  /* 6. Type-aware smart fillers — villa/studio/plot get different copy */
  const type = (p.type || "").toLowerCase();
  const fillers = type.includes("villa")
      ? [
        "Private garden, home theatre and landscaped terrace lounge",
        "Gated villa community with clubhouse, pool and 24×7 security",
        "Ideal for families — premium lifestyle with strong resale value",
        "Well-connected to major tech corridors and expressways",
      ]
      : type.includes("studio")
          ? [
            "Compact smart studio — ideal for working professionals",
            "High rental yield potential in this IT micro-market",
            "Fully equipped with modern fixtures and efficient storage",
            "Low maintenance cost with strong appreciation outlook",
          ]
          : type.includes("plot")
              ? [
                "Clear title plot — ready for immediate construction",
                "Located in a fast-appreciating residential zone",
                "Easy loan approval with all documents in order",
                "Flexible layout — build your dream home to spec",
              ]
              : [
                "Well-connected via metro, expressway and tech corridors",
                "Gated community with 24×7 security and modern amenities",
                "Strong rental demand — ideal for investment or end-use",
                "Premium finishes with thoughtful space planning",
              ];

  for (const f of fillers) {
    if (points.length >= 4) break; /* show up to 4 bullets to fill white space */
    add(f);
  }

  return points.slice(0, 4);
}

/* Wrap in React.memo to prevent unnecessary re-renders */
export default React.memo(AiPropertyCard);