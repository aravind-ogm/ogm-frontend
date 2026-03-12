import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { formatPrice } from "./Helpers";
import { FALLBACK_IMAGE } from "./Constants";
import "../../styles/ai/ai-property-card.css";

/* Types to hide from spec chips */
const HIDDEN_TYPES = ["property_card", "property", "card", "result", "listing", "undefined", "null", ""];

function AiPropertyCard({ property, onMapView }) {
  const navigate = useNavigate();
  const [saved, setSaved] = useState(false);
  const [watchlisted, setWatchlisted] = useState(false);
  const [currentImg, setCurrentImg] = useState(0);

  if (!property) return null;

  const images = property.gallery?.length > 0
    ? property.gallery
    : [property.primaryImage || property.image || FALLBACK_IMAGE];

  const nextImg = (e) => { e.stopPropagation(); setCurrentImg((p) => (p + 1) % images.length); };
  const prevImg = (e) => { e.stopPropagation(); setCurrentImg((p) => (p - 1 + images.length) % images.length); };
  const handleClick = () => navigate(`/property/${property.slug || property.id}`);

  /* Build specs — filter out junk values */
  const rawType = (property.type || "").trim();
  const cleanType = HIDDEN_TYPES.includes(rawType.toLowerCase()) ? null : rawType;

  const specs = [
    cleanType,
    property.bedrooms && `🛏 ${property.bedrooms} BHK`,
    property.bathrooms && `🚿 ${property.bathrooms} Bath`,
    property.sqft && `📐 ${Number(property.sqft).toLocaleString("en-IN")} Sqft`,
    property.facing && `${property.facing} Facing`,
  ].filter(Boolean);

  const bulletPoints = generateBulletPoints(property, cleanType);

  return (
    <div className="pcard">
      {/* ── IMAGE ── */}
      <div className="pcard-img" onClick={handleClick}>
        <img src={images[currentImg]} alt={property.title || "Property"} loading="lazy" />
        {images.length > 1 && <div className="pcard-counter">🖼 {currentImg + 1}/{images.length}</div>}
        {images.length > 1 && (
          <>
            <button className="pcard-arrow l" onClick={prevImg}>‹</button>
            <button className="pcard-arrow r" onClick={nextImg}>›</button>
          </>
        )}
        <div className="pcard-price">{formatPrice(property.price)}</div>
        <div className="pcard-tags">
          {property.reraApproved && <span className="ptag rera">RERA</span>}
          {property.soldOut && <span className="ptag sold">SOLD OUT</span>}
        </div>
      </div>

      {/* ── DETAILS ── */}
      <div className="pcard-body">
        <button className="pcard-x" onClick={(e) => e.stopPropagation()}>✕</button>

        <h3 className="pcard-title" onClick={handleClick}>
          {property.title || "Untitled Property"}
        </h3>

        {specs.length > 0 && (
          <div className="pcard-specs">
            {specs.map((s, i) => <span key={i} className="pcard-chip">{s}</span>)}
          </div>
        )}

        <p className="pcard-loc">📍 {property.location || "Location not specified"}</p>

        <ul className="pcard-bullets">
          {bulletPoints.map((point, i) => <li key={i}>{point}</li>)}
        </ul>

        {property.builder && (
          <div className="pcard-builder">
            {property.builderLogo && <img src={property.builderLogo} alt="" className="pcard-blogo" />}
            <span className="pcard-bname">{property.builder}</span>
            {property.builderPhone && <span className="pcard-bphone">{property.builderPhone}</span>}
          </div>
        )}

        <div className="pcard-acts">
          <button className="pact primary" onClick={handleClick}>✉ Contact</button>
          <button className={`pact ${saved ? "act-save" : ""}`}
            onClick={(e) => { e.stopPropagation(); setSaved(!saved); }}>
            {saved ? "♥" : "♡"} Save
          </button>
          <button className={`pact ${watchlisted ? "act-watch" : ""}`}
            onClick={(e) => { e.stopPropagation(); setWatchlisted(!watchlisted); }}>
            👁 Watchlist
          </button>
          <button className="pact pact-map"
            onClick={(e) => {
              e.stopPropagation();
              if (onMapView) onMapView(property);
            }}>
            🗺 Map View
          </button>
          <button className="pact pact-view" onClick={handleClick}>View Details →</button>
        </div>
      </div>
    </div>
  );
}

function generateBulletPoints(p, cleanType) {
  const points = [];

  if (p.location) points.push(`Prime location in ${p.location} with excellent connectivity`);

  if (p.sqft && p.bedrooms) {
    points.push(`Spacious ${p.bedrooms} BHK spanning ${Number(p.sqft).toLocaleString("en-IN")} sqft`);
  } else if (p.sqft) {
    points.push(`Total area of ${Number(p.sqft).toLocaleString("en-IN")} sqft with well-planned layout`);
  } else if (p.bedrooms) {
    points.push(`${p.bedrooms} BHK with modern layout and ample natural light`);
  }

  if (p.price && p.sqft) {
    const priceNum = Number(String(p.price).replace(/[₹,]/g, ""));
    const sqftNum = Number(p.sqft);
    if (!isNaN(priceNum) && !isNaN(sqftNum) && sqftNum > 0) {
      points.push(`₹${Math.round(priceNum / sqftNum).toLocaleString("en-IN")}/sqft — competitive pricing`);
    }
  }

  if (p.reraApproved) points.push("RERA approved project ensuring transparency and legal compliance");
  if (p.furnishing) points.push(`${p.furnishing} — move-in ready`);
  if (p.facing) points.push(`${p.facing} facing with abundant natural light`);
  if (p.possession) points.push(`Possession: ${p.possession}`);
  if (p.builder) points.push(`Developed by ${p.builder} — trusted developer`);
  if (p.amenities?.length > 0) points.push(`Amenities: ${p.amenities.slice(0, 4).join(", ")}`);
  if (p.highlights?.length > 0) p.highlights.slice(0, 2).forEach((h) => points.push(h));

  const fillers = [
    "Close proximity to IT hubs, schools, hospitals, and shopping centers",
    "Well-connected via major roads and upcoming metro line",
    "Gated community with 24/7 security and modern amenities",
    "Ideal for families and working professionals",
    "Strong rental potential and long-term appreciation",
  ];
  for (const f of fillers) { if (points.length >= 6) break; points.push(f); }
  return points.slice(0, 7);
}

export default React.memo(AiPropertyCard);