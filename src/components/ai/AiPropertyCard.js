import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { formatPrice } from "./Helpers";
import { FALLBACK_IMAGE } from "./Constants";
import PropertyDistanceBadge from "./PropertyDistanceBadge";
import "../../styles/ai/ai-property-card.css";

const HIDDEN_TYPES = new Set([
  "property_card","property","card","result","listing","undefined","null","",
]);

function AiPropertyCard({
                          property,
                          onMapView,
                          isMapOpen,
                          onRemove,
                          userPosition,
                          isInCompare = false,   // ← NEW: true when this card is in compareList
                          onCompare,             // ← NEW: toggleCompare callback
                        }) {
  const navigate = useNavigate();
  const [currentImg,  setCurrentImg]  = useState(0);
  const [watchlisted, setWatchlisted] = useState(false);

  if (!property) return null;

  const images  = property.gallery?.length > 0
      ? property.gallery
      : [property.primaryImage || property.image || FALLBACK_IMAGE];
  const soldOut = Boolean(property.soldOut);

  const nextImg = (e) => { e.stopPropagation(); setCurrentImg((p) => (p + 1) % images.length); };
  const prevImg = (e) => { e.stopPropagation(); setCurrentImg((p) => (p - 1 + images.length) % images.length); };

  const handleClick         = () => navigate(`/property/${property.slug || property.id}`);
  const handleWatchlist     = (e) => { e.stopPropagation(); setWatchlisted((prev) => !prev); };
  const handleLocationClick = (e) => { e.stopPropagation(); onMapView?.(); };
  const handleCompare       = (e) => { e.stopPropagation(); onCompare?.(property); };

  const bhkDisplay = useMemo(() => {
    if (property.bhk) {
      const s = String(property.bhk).trim();
      return /bhk/i.test(s) ? s : `${s} BHK`;
    }
    if (property.bedrooms && property.bedrooms > 0) return `${property.bedrooms} BHK`;
    return null;
  }, [property.bhk, property.bedrooms]);

  const displayPrice = useMemo(() => {
    if (!property.price) return "Price on request";
    const s = String(property.price);
    if (s.includes("₹") || /\bCr\b|\bL\b/i.test(s)) return s;
    return formatPrice(property.priceRaw ?? property.price);
  }, [property.price, property.priceRaw]);

  const aiMatch = useMemo(() => 90 + ((property.id || 0) % 10), [property.id]);

  const bulletPoints = useMemo(() => generateBulletPoints(property), [property]);

  return (
      <div className={`pcard${isInCompare ? " pcard--comparing" : ""}`}>

        {/* IMAGE */}
        <div className="pcard-img" onClick={handleClick}>
          <img src={images[currentImg]} alt={property.title || "Property"}
               loading="lazy" onError={(e) => { e.target.src = FALLBACK_IMAGE; }} />
          {images.length > 1 && (
              <div className="pcard-counter">🖼 {currentImg + 1}/{images.length}</div>
          )}
          {images.length > 1 && (
              <>
                <button className="pcard-arrow l" onClick={prevImg} aria-label="Previous">‹</button>
                <button className="pcard-arrow r" onClick={nextImg} aria-label="Next">›</button>
              </>
          )}
          <div className="pcard-price">{displayPrice}</div>
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
            {property.vastuCompliant && <span className="ptag vastu">Vastu ✓</span>}
            {soldOut && <span className="ptag sold">SOLD OUT</span>}
          </div>
          <button className={`pcard-fav${watchlisted ? " pcard-fav--saved" : ""}`}
                  onClick={handleWatchlist}
                  aria-label={watchlisted ? "Remove from wishlist" : "Add to wishlist"}>
            <svg width="16" height="16" viewBox="0 0 24 24"
                 fill={watchlisted ? "#ef4444" : "none"}
                 stroke={watchlisted ? "#ef4444" : "#64748b"}
                 strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
          </button>
        </div>

        {/* CONTENT */}
        <div className="pcard-body">

          {onRemove && (
              <button className="pcard-x"
                      onClick={(e) => { e.stopPropagation(); onRemove(property.id); }}
                      aria-label="Remove">✕</button>
          )}

          <div className="pcard-title-row">
            <h3 className="pcard-title" onClick={handleClick}>
              {property.title || "Untitled Property"}
            </h3>
            <div className="pcard-ai-match" aria-label={`${aiMatch}% AI Match`}>
              <div className="pcard-ai-circle">{aiMatch}%</div>
              <span className="pcard-ai-label">AI Match</span>
            </div>
          </div>

          <div className="pcard-loc pcard-loc-clickable"
               onClick={handleLocationClick} title="View on map"
               role="button" tabIndex={0}
               onKeyDown={(e) => e.key === "Enter" && handleLocationClick(e)}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                 stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
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

          {/* Specs — BHK · Baths · Sqft */}
          <div className="pcard-specs">
            {bhkDisplay && (
                <span className="pcard-chip pcard-chip-spec">
                  <span className="pcard-spec-icon pcard-spec-icon--bed" aria-hidden="true">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                         stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M2 9V19H22V9"/><path d="M2 9C2 9 2 5 12 5C22 5 22 9 22 9"/>
                      <path d="M12 5V9"/><rect x="5" y="11" width="4" height="3" rx="1"/>
                      <rect x="15" y="11" width="4" height="3" rx="1"/>
                    </svg>
                  </span>
                  <span className="pcard-spec-value">{bhkDisplay}</span>
                </span>
            )}
            {property.bathrooms > 0 && (
                <span className="pcard-chip pcard-chip-spec">
                  <span className="pcard-spec-icon pcard-spec-icon--bath" aria-hidden="true">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                         stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 6C9 4.34 7.66 3 6 3C4.34 3 3 4.34 3 6L3 12"/>
                      <path d="M3 12L21 12L21 14C21 17.31 18.31 20 15 20L9 20C5.69 20 3 17.31 3 14Z"/>
                      <line x1="9" y1="20" x2="9" y2="22"/><line x1="15" y1="20" x2="15" y2="22"/>
                    </svg>
                  </span>
                  <span className="pcard-spec-value">{property.bathrooms}</span>
                  <span className="pcard-spec-label">Baths</span>
                </span>
            )}
            {property.sqft > 0 && (
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

          <ul className="pcard-bullets">
            {bulletPoints.map((pt, i) => <li key={i}>{pt}</li>)}
          </ul>

          {property.developerName && (
              <div className="pcard-builder">
                <span className="pcard-bname">By {property.developerName}</span>
              </div>
          )}

          {property.possessionStatus && !soldOut && (
              <div className="pcard-possession">
                {property.possessionStatus === "ready_to_move" ? "✅ Ready to Move"
                    : property.possessionStatus === "under_construction" ? "🏗 Under Construction"
                        : property.possessionStatus.replace(/_/g, " ")}
              </div>
          )}

          {/* ACTION BUTTONS */}
          <div className="pcard-acts">
            <button className="pact pact-interest" onClick={handleClick}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="none" aria-hidden="true">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
              </svg>
              Show Interest
            </button>

            <button className="pact pact-call"
                    onClick={(e) => { e.stopPropagation(); window.open("tel:+919494808825"); }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="none" aria-hidden="true">
                <path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1-9.4 0-17-7.6-17-17 0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z"/>
              </svg>
              Call
            </button>

            <button className="pact pact-tour" onClick={handleClick}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                   stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                <polygon points="23 7 16 12 23 17 23 7"/>
                <rect x="1" y="5" width="15" height="14" rx="2"/>
              </svg>
              Live Video Tour
            </button>

            <button className={`pact pact-mapview${isMapOpen ? " active" : ""}`}
                    onClick={(e) => { e.stopPropagation(); onMapView?.(); }}
                    aria-label="View on map">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                   stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                   strokeLinejoin="round" aria-hidden="true">
                <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/>
                <line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/>
              </svg>
              View on Map
            </button>

            {/* ── NEW: Compare button ── */}
            {onCompare && (
                <button
                    className={`pact pact-compare${isInCompare ? " pact-compare--active" : ""}`}
                    onClick={handleCompare}
                    aria-label={isInCompare ? "Remove from compare" : "Add to compare"}
                    aria-pressed={isInCompare}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                       stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
                       aria-hidden="true">
                    {isInCompare
                        ? <polyline points="20 6 9 17 4 12"/>           // checkmark when active
                        : <><line x1="18" y1="20" x2="18" y2="10"/>    // bar chart when inactive
                          <line x1="12" y1="20" x2="12" y2="4"/>
                          <line x1="6"  y1="20" x2="6"  y2="14"/></>
                    }
                  </svg>
                  {isInCompare ? "✓ Comparing" : "Compare"}
                </button>
            )}

            <button className={`pact pact-watchlist-btn${watchlisted ? " watchlisted" : ""}`}
                    onClick={handleWatchlist}
                    aria-label={watchlisted ? "Remove from watchlist" : "Add to watchlist"}>
              <svg width="12" height="12" viewBox="0 0 24 24"
                   fill={watchlisted ? "currentColor" : "none"}
                   stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                   strokeLinejoin="round" aria-hidden="true">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
              </svg>
              {watchlisted ? "Saved ♥" : "Watchlist"}
            </button>
          </div>

        </div>
      </div>
  );
}

function generateBulletPoints(p) {
  const soldOut = Boolean(p.soldOut);
  const points  = [];
  const seen    = new Set();
  const add = (text) => {
    const key = text.toLowerCase().trim();
    if (key && !seen.has(key)) { seen.add(key); points.push(text); }
  };
  if (p.description)
    p.description.split(/[.!?]/).map(s => s.trim()).filter(s => s.length > 20).slice(0, 2).forEach(add);
  if (points.length < 2 && p.location)
    add(`Prime location in ${p.location} with excellent connectivity`);
  if (points.length < 2 && p.sqft && (p.bhk || p.bedrooms))
    add(`Spacious ${p.bhk || (p.bedrooms + " BHK")} spanning ${Number(p.sqft).toLocaleString("en-IN")} sqft`);
  if (p.reraApproved && points.length < 3)
    add("RERA approved — full transparency and legal compliance");
  if (p.amenities?.length > 0 && points.length < 3)
    add(`Amenities: ${p.amenities.slice(0, 4).join(", ")}`);
  if (p.possessionStatus && !soldOut && points.length < 4)
    add(`Possession: ${p.possessionStatus.replace(/_/g, " ")}`);
  const type = (p.type || "").toLowerCase();
  const fillers = type.includes("villa")
      ? ["Private garden, home theatre and landscaped terrace lounge",
        "Gated community with clubhouse, pool and 24×7 security"]
      : type.includes("plot")
          ? ["Clear title plot — ready for immediate construction",
            "Located in a fast-appreciating residential zone"]
          : ["Well-connected via metro, expressway and tech corridors",
            "Gated community with 24×7 security and modern amenities",
            "Strong rental demand — ideal for investment or end-use"];
  for (const f of fillers) { if (points.length >= 4) break; add(f); }
  return points.slice(0, 4);
}

export default React.memo(AiPropertyCard);