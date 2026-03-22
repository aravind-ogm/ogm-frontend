import React, { useState, useCallback, memo } from "react";
import { Link } from "react-router-dom";
import "../styles/PropertyCard.css";

// ─── Price formatter ───────────────────────────────────────────────────────────
const formatPrice = (price) => {
  const n = Number(price);
  if (!price || isNaN(n)) return "Price on request";
  if (n >= 10_000_000) return `₹ ${(n / 10_000_000).toFixed(2)} Cr`;
  if (n >= 100_000)    return `₹ ${(n / 100_000).toFixed(2)} L`;
  return `₹ ${n.toLocaleString("en-IN")}`;
};

// ─── Property type → emoji ─────────────────────────────────────────────────────
const getTypeIcon = (type = "") => {
  const t = type.toLowerCase();
  if (t.includes("villa"))                       return "🏡";
  if (t.includes("plot") || t.includes("land"))  return "🗺️";
  if (t.includes("commercial"))                  return "🏢";
  if (t.includes("farmhouse"))                   return "🌾";
  if (t.includes("penthouse"))                   return "🏙️";
  return "🏗️";
};

// ─── Image with fallback ───────────────────────────────────────────────────────
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

// ─── Main Card ─────────────────────────────────────────────────────────────────
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

  // Build chips array — rendered as ONE single pill with dividers
  const chips = [
    property.sqft ? `${Number(property.sqft).toLocaleString("en-IN")} sqft` : null,
    property.bhk  ? `${property.bhk} BHK`                                   : null,
    property.type || property.propertyType                                   || null,
  ].filter(Boolean);

  const typeIcon = getTypeIcon(property.type || property.propertyType || "");

  return (
    <Link to={`/property/${property.slug}`} className="pc" aria-label={property.title}>

      {/* ── Floating image ─────────────────────────────────── */}
      <div className="pc-img-wrap">
        <PropertyImage src={img} alt={property.title} />
        <div className="pc-gradient" />

        {/* Price — bottom left */}
        <div className="pc-price">{price}</div>

        {/* RERA — top left: white pill + circled checkmark icon */}
        {property.reraApproved && (
          <div className="pc-rera">
            RERA
            {/* Circled checkmark: dark stroke circle with ✓ inside, no fill */}
            <span className="pc-rera-check">
              <svg viewBox="0 0 24 24" fill="none"
                stroke="#1e293b" strokeWidth="2.2"
                strokeLinecap="round" strokeLinejoin="round">
                {/* Outer circle */}
                <circle cx="12" cy="12" r="10" />
                {/* Checkmark inside */}
                <polyline points="7,12.5 10.5,16 17,9" />
              </svg>
            </span>
          </div>
        )}

        {/* Sold Out OR heart — top right */}
        {soldOut ? (
          <div className="pc-sold">Sold Out</div>
        ) : (
          <button
            className="pc-fav"
            onClick={toggleFav}
            aria-label={fav ? "Remove from wishlist" : "Add to wishlist"}
            type="button"
          >
            {/* Orange heart outline — matches UI */}
            <svg width="16" height="16" viewBox="0 0 24 24"
              fill={fav ? "#ef4444" : "none"}
              stroke={fav ? "#ef4444" : "#f97316"}
              strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67
                       l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06
                       L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
          </button>
        )}
      </div>

      {/* ── Separate white rounded info box ────────────────── */}
      <div className="pc-body">

        {/* Title + type icon */}
        <div className="pc-title-row">
          <h3 className="pc-title">{property.title}</h3>
          <div className="pc-type-icon" aria-hidden="true">{typeIcon}</div>
        </div>

        {/* Location — blue pin, light gray text */}
        {property.location && (
          <div className="pc-location">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="#1a56db" stroke="none">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75
                       7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12
                       -2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12
                       2.5-2.5 2.5z"/>
            </svg>
            <span>{property.location}</span>
          </div>
        )}

        {/*
          Spec chips — ONE single wide pill with all specs inside.
          Each spec is flex:1 centered, separated by CSS dividers.
          Matches the UI: [ 10,000 sqft  |  2 BHK  |  Farmhouse ]
        */}
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