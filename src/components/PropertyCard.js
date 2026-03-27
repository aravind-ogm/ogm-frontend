import React, { useState, useCallback, memo } from "react";
import { Link } from "react-router-dom";
import "../styles/PropertyCard.css";

const formatPrice = (price) => {
  const n = Number(price);
  if (!price || isNaN(n)) return "Price on request";
  if (n >= 10_000_000) return `₹ ${(n / 10_000_000).toFixed(2)} Cr`;
  if (n >= 100_000)    return `₹ ${(n / 100_000).toFixed(2)} L`;
  return `₹ ${n.toLocaleString("en-IN")}`;
};

const getTypeIcon = (type = "") => {
  const t = type.toLowerCase();
  if (t.includes("villa"))                              return "🏡";
  if (t.includes("plot") || t.includes("land"))         return "🗺️";
  if (t.includes("commercial"))                         return "🏢";
  if (t.includes("farmhouse"))                          return "🌾";
  if (t.includes("penthouse"))                          return "🏙️";
  if (t.includes("studio"))                             return "🛋️";
  if (t.includes("independent") || t.includes("house")) return "🏠";
  if (t.includes("duplex"))                             return "🏘️";
  if (t.includes("weekend") || t.includes("holiday"))   return "🌴";
  return "🏗️";
};

/*
  ReraBadgeIcon
  ─────────────
  From the zoomed Image 2:
  The icon is a CRESCENT (partial arc on the left side, not a full circle)
  + a checkmark tick inside/overlapping it.
  It looks like the Unicode ✔ inside a partial arc — a "half-circle verified" icon.

  SVG breakdown:
  - A large arc from bottom-left to top-left (the crescent left half)
  - A smaller arc inside it (inner edge of crescent)
  - A checkmark polyline overlapping the icon
  This creates the exact crescent+tick seen in the UI.
*/
function ReraBadgeIcon() {
  return (
    <svg
      width="18" height="18"
      viewBox="0 0 18 18"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Solid green circle */}
      <circle cx="9" cy="9" r="9" fill="#0f172a" />
      {/* White bold tick/checkmark */}
      <polyline
        points="4.5,9.5 7.5,12.5 13.5,6"
        stroke="#ffffff"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

function PropertyImage({ src, alt }) {
  const [err, setErr] = useState(false);
  if (!src || err) {
    return (
      <div className="pc-img-placeholder">
        <svg width="34" height="34" fill="none" stroke="#a0a8bc"
          strokeWidth="1.5" viewBox="0 0 24 24">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
          <polyline points="9 22 9 12 15 12 15 22"/>
        </svg>
      </div>
    );
  }
  return (
    <img src={src} alt={alt} className="pc-img"
      loading="lazy" decoding="async" onError={() => setErr(true)} />
  );
}

function PropertyCard({ property }) {
  const [fav, setFav] = useState(false);

  const img     = property.mainImages?.[0] || property.images?.[0] || property.image || null;
  const price   = formatPrice(property.price);
  const soldOut = Boolean(property.soldOut);

  const toggleFav = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setFav((v) => !v);
  }, []);

  // BHK from bedrooms (Java model), fallback to bhk legacy field
  const bedroomCount = property.bedrooms ?? property.bhk ?? null;

  const chips = [
    property.sqft  ? `${Number(property.sqft).toLocaleString("en-IN")} sqft` : null,
    bedroomCount   ? `${bedroomCount} BHK`                                   : null,
    property.type  || property.propertyType                                  || null,
  ].filter(Boolean);

  const typeIcon = getTypeIcon(property.type || property.propertyType || "");

  return (
    <Link to={`/property/${property.slug}`} className="pc" aria-label={property.title}>

      {/* ── Floating image ─────────────────────────────── */}
      <div className="pc-img-wrap">
        <PropertyImage src={img} alt={property.title} />
        <div className="pc-gradient" />

        <div className="pc-price">{price}</div>

        {/* RERA — white pill + crescent+tick icon */}
        {property.reraApproved && (
          <div className="pc-rera">
            RERA
            <span className="pc-rera-icon"><ReraBadgeIcon /></span>
          </div>
        )}

        {/* Sold Out OR heart */}
        {soldOut ? (
          <div className="pc-sold">Sold Out</div>
        ) : (
          <button className="pc-fav" onClick={toggleFav}
            aria-label={fav ? "Remove from wishlist" : "Add to wishlist"}
            type="button">
            <svg width="15" height="15" viewBox="0 0 24 24"
              fill={fav ? "#ef4444" : "none"}
              stroke={fav ? "#ef4444" : "#0f172a"}
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06
                       a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78
                       1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
          </button>
        )}
      </div>

      {/* ── White info box ──────────────────────────────── */}
      <div className="pc-body">

        <div className="pc-title-row">
          <h3 className="pc-title">{property.title}</h3>
          <div className="pc-type-icon" aria-hidden="true">{typeIcon}</div>
        </div>

        {property.location && (
          <div className="pc-location">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="#1a56db" stroke="none">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75
                       7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5
                       s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
            </svg>
            <span>{property.location}</span>
          </div>
        )}

        {/* Single wide pill — no dividers, just spacing */}
        {chips.length > 0 && (
          <div className="pc-specs">
            {chips.map((chip, i) => (
              <span key={i} className="pc-chip">{chip}</span>
            ))}
          </div>
        )}

      </div>
    </Link>
  );
}

export default memo(PropertyCard);