import React, { useState, useCallback, memo } from "react";
import { Link } from "react-router-dom";
import "../styles/PropertyCard.css";


const formatPrice = (price, priceRaw) => {
  // Already formatted by backend — use as-is
  if (typeof price === "string" && (price.includes("₹") || /\bCr\b|\bL\b/i.test(price))) {
    return price;
  }
  // Use raw numeric value for clean formatting
  const n = Number(priceRaw ?? price);
  if (!n || isNaN(n)) return "Price on request";
  if (n >= 10_000_000) return `₹ ${(n / 10_000_000).toFixed(2)} Cr`;
  if (n >= 100_000)    return `₹ ${(n / 100_000).toFixed(2)} L`;
  return `₹ ${n.toLocaleString("en-IN")}`;
};

const getTypeIcon = (type = "") => {
  const t = type.toLowerCase();
  if (t.includes("villa"))                               return "🏡";
  if (t.includes("plot") || t.includes("land"))          return "🗺️";
  if (t.includes("commercial"))                          return "🏢";
  if (t.includes("farmhouse"))                           return "🌾";
  if (t.includes("penthouse"))                           return "🏙️";
  if (t.includes("studio"))                              return "🛋️";
  if (t.includes("independent") || t.includes("house"))  return "🏠";
  if (t.includes("duplex"))                              return "🏘️";
  if (t.includes("weekend") || t.includes("holiday"))    return "🌴";
  if (t.includes("row"))                                 return "🏘️";
  return "🏗️";
};

function ReraBadgeIcon() {
  return (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none"
           xmlns="http://www.w3.org/2000/svg">
        <circle cx="9" cy="9" r="9" fill="#0f172a" />
        <polyline points="4.5,9.5 7.5,12.5 13.5,6"
                  stroke="#ffffff" strokeWidth="2.2"
                  strokeLinecap="round" strokeLinejoin="round" fill="none" />
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
  const soldOut = Boolean(property.soldOut);

  // BUG FIX #1: pass both price + priceRaw
  const price = formatPrice(property.price, property.priceRaw);

  const toggleFav = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setFav((v) => !v);
  }, []);

  // ── BUG FIX #2: BHK "3 BHK BHK" double label ─────────────────────────────
  // Backend sends property.bhk as "3 BHK" (string) OR property.bedrooms as 4 (number).
  // Old code: `bedroomCount = property.bedrooms ?? property.bhk`
  // Then chip: `${bedroomCount} BHK` → if bhk="3 BHK" → "3 BHK BHK"
  //
  // Fix: extract just the numeric part, then always append "BHK" once.
  const bhkLabel = (() => {
    // Prefer the bhk string field (e.g. "3 BHK", "4 BHK") — already formatted
    if (property.bhk) {
      const s = String(property.bhk).trim();
      return /bhk/i.test(s) ? s : `${s} BHK`;
    }
    // Fall back to numeric bedrooms
    const n = property.bedrooms;
    if (n != null && n > 0) return `${n} BHK`;
    return null;
  })();

  // ── BUG FIX #3: slug null crash ───────────────────────────────────────────
  // If property.slug is null/undefined, Link navigated to "/property/undefined".
  // Fix: fall back to property.id so the route is always valid.
  const linkTarget = property.slug || property.id;

  const chips = [
    property.sqft ? `${Number(property.sqft).toLocaleString("en-IN")} sqft` : null,
    bhkLabel,                                                    // BUG FIX #2
    property.type || property.propertyType || null,
  ].filter(Boolean);

  const typeIcon = getTypeIcon(property.type || property.propertyType || "");

  return (
      // BUG FIX #3: use linkTarget instead of bare property.slug
      <Link to={`/property/${linkTarget}`} className="pc" aria-label={property.title}>

        {/* ── Image ─────────────────────────────────────── */}
        <div className="pc-img-wrap">
          <PropertyImage src={img} alt={property.title} />
          <div className="pc-gradient" />

          <div className="pc-price">{price}</div>

          {/* RERA badge */}
          {property.reraApproved && (
              <div className="pc-rera">
                RERA
                <span className="pc-rera-icon"><ReraBadgeIcon /></span>
              </div>
          )}

          {/* BUG FIX #4: Vastu badge ─────────────────────────────────────────
            Backend now sends vastuCompliant=true from the fixed PropertyResponse DTO.
            Was missing from the card entirely — users couldn't see vastu compliance.  */}
          {property.vastuCompliant && !soldOut && (
              <div className="pc-vastu" aria-label="Vastu compliant">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
                     stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
                     aria-hidden="true">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                Vastu
              </div>
          )}

          {soldOut ? (
              <div className="pc-sold">Sold Out</div>
          ) : (
              <button className="pc-fav" onClick={toggleFav} type="button"
                      aria-label={fav ? "Remove from wishlist" : "Add to wishlist"}>
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

        {/* ── Info box ──────────────────────────────────── */}
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