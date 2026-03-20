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

function PropertyImage({ src, alt }) {
  const [err, setErr] = useState(false);
  if (!src || err) return (
    <div className="pc-img-placeholder">
      <svg width="40" height="40" fill="none" stroke="#cbd5e1" strokeWidth="1.5" viewBox="0 0 24 24">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
        <polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
    </div>
  );
  return <img src={src} alt={alt} className="pc-img" loading="lazy" decoding="async" onError={() => setErr(true)} />;
}

function PropertyCard({ property }) {
  const [fav, setFav] = useState(false);

  const img = property.mainImages?.[0] || property.images?.[0] || property.image || null;
  const price = formatPrice(property.price);
  const soldOut = Boolean(property.soldOut);

  const toggleFav = useCallback((e) => {
    e.preventDefault(); e.stopPropagation();
    setFav(v => !v);
  }, []);

  return (
    <Link to={`/property/${property.slug}`} className="pc" aria-label={property.title}>

      {/* ── Image area ── */}
      <div className="pc-img-wrap">
        <PropertyImage src={img} alt={property.title} />

        {/* Gradient */}
        <div className="pc-gradient" />

        {/* Price — bottom left */}
        <div className="pc-price">{price}</div>

        {/* Top badges */}
        {property.reraApproved && <span className="pc-rera">RERA ✓</span>}

        {soldOut
          ? <span className="pc-sold">Sold Out</span>
          : (
            <button className="pc-fav" onClick={toggleFav} aria-label="Wishlist">
              <svg width="15" height="15" viewBox="0 0 24 24" fill={fav ? "#ef4444" : "none"}
                stroke={fav ? "#ef4444" : "#64748b"} strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
              </svg>
            </button>
          )
        }
      </div>

      {/* ── Card body ── */}
      <div className="pc-body">

        {/* Title */}
        <h3 className="pc-title">{property.title}</h3>

        {/* Location */}
        {property.location && (
          <div className="pc-location">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="#1B3A6B" stroke="none">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
            </svg>
            <span>{property.location}</span>
          </div>
        )}

        {/* Footer */}
        <div className="pc-footer">
          {property.sqft
            ? (
              <div className="pc-sqft">
                <svg width="12" height="12" fill="none" stroke="#94a3b8" strokeWidth="1.8" viewBox="0 0 24 24">
                  <rect x="3" y="3" width="18" height="18" rx="2"/>
                </svg>
                {property.sqft} sqft
              </div>
            )
            : <span />
          }
          {property.type && <span className="pc-type">{property.type}</span>}
        </div>
      </div>
    </Link>
  );
}

export default memo(PropertyCard);