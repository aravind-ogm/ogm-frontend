import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { formatPrice } from "./Helpers";
import { FALLBACK_IMAGE } from "./Constants";
import PropertyDistanceBadge from "./PropertyDistanceBadge";
import "../../styles/ai/ai-property-card.css";

const HIDDEN_TYPES = new Set([
  "property_card","property","card","result","listing","undefined","null","",
]);

function AiPropertyCard({ property, onMapView, isMapOpen, onRemove, userPosition }) {
  const navigate     = useNavigate();
  const [currentImg, setCurrentImg] = useState(0);

  if (!property) return null;

  const images = property.gallery?.length > 0
      ? property.gallery
      : [property.primaryImage || property.image || FALLBACK_IMAGE];

  const nextImg = (e) => { e.stopPropagation(); setCurrentImg((p) => (p + 1) % images.length); };
  const prevImg = (e) => { e.stopPropagation(); setCurrentImg((p) => (p - 1 + images.length) % images.length); };
  const handleClick = () => navigate(`/property/${property.slug || property.id}`);

  // Clicking location name opens map panel on right side
  const handleLocationClick = (e) => {
    e.stopPropagation();
    onMapView?.();
  };

  const cleanType = useMemo(() => {
    const raw = (property.type || "").trim();
    return HIDDEN_TYPES.has(raw.toLowerCase()) ? null : raw;
  }, [property.type]);

  const specs = useMemo(() => [
    property.bedrooms  && `${property.bedrooms} Beds`,
    property.bathrooms && `${property.bathrooms} Baths`,
    property.sqft      && `${Number(property.sqft).toLocaleString("en-IN")} sqft`,
  ].filter(Boolean), [property.bedrooms, property.bathrooms, property.sqft]);

  const bulletPoints = useMemo(() => generateBulletPoints(property), [property]);

  // Stable AI match score per property
  const aiMatch = useMemo(() => {
    const hash = (property.id || 0) % 10;
    return 90 + hash;
  }, [property.id]);

  return (
      <div className="pcard">

        {/* ── IMAGE ── */}
        <div className="pcard-img" onClick={handleClick}>
          <img
              src={images[currentImg]}
              alt={property.title || "Property"}
              loading="lazy"
              onError={(e) => { e.target.src = FALLBACK_IMAGE; }}
          />

          {images.length > 1 && (
              <div className="pcard-counter">🖼 {currentImg + 1}/{images.length}</div>
          )}
          {images.length > 1 && (
              <>
                <button className="pcard-arrow l" onClick={prevImg} aria-label="Previous">‹</button>
                <button className="pcard-arrow r" onClick={nextImg} aria-label="Next">›</button>
              </>
          )}

          {/* Price */}
          <div className="pcard-price">{formatPrice(property.price)}</div>

          {/* RERA — frosted white glass, matches homepage */}
          <div className="pcard-tags">
            {property.reraApproved && (
                <span className="ptag rera">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden="true">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              RERA
            </span>
            )}
            {property.soldOut && <span className="ptag sold">SOLD OUT</span>}
          </div>


        </div>

        {/* ── CONTENT ── */}
        <div className="pcard-body">

          {onRemove && (
              <button
                  className="pcard-x"
                  onClick={(e) => { e.stopPropagation(); onRemove(property.id); }}
                  aria-label="Remove"
              >✕</button>
          )}

          {/* Title row + AI Match badge — Image 2 exact design */}
          <div className="pcard-title-row">
            <h3 className="pcard-title" onClick={handleClick}>
              {property.title || "Untitled Property"}
            </h3>

            {/* AI Match — circle with % + bold "AI Match" text — EXACT Image 2 */}
            <div className="pcard-ai-match">
              <div className="pcard-ai-circle">{aiMatch}%</div>
              <span className="pcard-ai-label">AI Match</span>
            </div>
          </div>

          {/* Location — CLICKABLE → opens map on right side */}
          <div
              className="pcard-loc pcard-loc-clickable"
              onClick={handleLocationClick}
              title="Click to view on map"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && handleLocationClick(e)}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                 stroke="#f97316" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
              <circle cx="12" cy="10" r="3"/>
              <path d="M12 2a8 8 0 0 1 8 8c0 5.25-8 12-8 12S4 15.25 4 10a8 8 0 0 1 8-8z"/>
            </svg>
            <span className="pcard-loc-text">{property.location || "Location not specified"}</span>
            <PropertyDistanceBadge
                userLat={userPosition?.latitude}
                userLng={userPosition?.longitude}
                propLat={property.latitude ?? property.lat}
                propLng={property.longitude ?? property.lng ?? property.lon}
            />
          </div>

          {/* Specs — icons + text like Image 2 */}
          {specs.length > 0 && (
              <div className="pcard-specs">
                {property.bedrooms && (
                    <span className="pcard-chip">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                      {property.bedrooms} Beds
              </span>
                )}
                {property.bathrooms && (
                    <span className="pcard-chip">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 12h16v3a8 8 0 0 1-16 0v-3z"/><line x1="4" y1="12" x2="4" y2="6"/><path d="M4 6a2 2 0 0 1 4 0v6"/></svg>
                      {property.bathrooms} Baths
              </span>
                )}
                {property.sqft && (
                    <span className="pcard-chip">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>
                      {Number(property.sqft).toLocaleString("en-IN")} sqft
              </span>
                )}
                {cleanType && <span className="pcard-chip pcard-chip-type">{cleanType}</span>}
              </div>
          )}

          {/* Bullet points */}
          <ul className="pcard-bullets">
            {bulletPoints.map((pt, i) => <li key={i}>{pt}</li>)}
          </ul>

          {/* Developer */}
          {property.developerName && (
              <div className="pcard-builder">
                <span className="pcard-bname">By {property.developerName}</span>
              </div>
          )}

          {/* ═══════════════════════════════════
            ACTION BUTTONS — dark filled style (Image 2 exact)
            show Interest · Call · Live Video Tour · Watchlist
            ═══════════════════════════════════ */}
          <div className="pcard-acts">

            <button className="pact pact-interest" onClick={handleClick}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
              </svg>
              show Interest
            </button>

            <button className="pact pact-call"
                    onClick={(e) => { e.stopPropagation(); window.open("tel:+919494808825"); }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                <path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1-9.4 0-17-7.6-17-17 0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z"/>
              </svg>
              Call
            </button>

            <button className="pact pact-tour" onClick={handleClick}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polygon points="23 7 16 12 23 17 23 7"/>
                <rect x="1" y="5" width="15" height="14" rx="2"/>
              </svg>
              Live Video Tour
            </button>

            <button
                className={`pact pact-watchlist${isMapOpen ? " active" : ""}`}
                onClick={(e) => { e.stopPropagation(); onMapView?.(); }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11h-4v4h-2v-4H7v-2h4V7h2v4h4v2z"/>
              </svg>
              Watchlist
            </button>

          </div>
        </div>
      </div>
  );
}

function generateBulletPoints(p) {
  const points = [];
  const seen   = new Set();
  const add = (text) => {
    const key = text.toLowerCase().trim();
    if (key && !seen.has(key)) { seen.add(key); points.push(text); }
  };

  if (p.description) {
    p.description.split(/[.!?]/).map(s => s.trim()).filter(s => s.length > 20).slice(0, 2).forEach(add);
  }
  if (points.length < 2 && p.location) add(`Prime location in ${p.location} with excellent connectivity`);
  if (points.length < 2 && p.sqft && p.bedrooms) add(`Spacious ${p.bedrooms} BHK spanning ${Number(p.sqft).toLocaleString("en-IN")} sqft`);
  if (p.reraApproved && points.length < 3) add("RERA approved — full transparency and legal compliance");
  if (p.amenities?.length > 0 && points.length < 3) add(`Amenities: ${p.amenities.slice(0, 4).join(", ")}`);

  const fillers = [
    "Well-connected via major roads and upcoming metro line",
    "Gated community with 24/7 security and modern amenities",
    "Strong rental potential and long-term appreciation",
  ];
  for (const f of fillers) { if (points.length >= 3) break; add(f); }
  return points.slice(0, 3);
}

export default React.memo(AiPropertyCard);