import React, { useState, useCallback, memo } from "react";
import { Heart, MapPin } from "lucide-react";
import { Link } from "react-router-dom";
import "../styles/PropertyCard.css";

// ─── Price Formatter ─────────────────────────────────────────────────────────

const formatPrice = (price) => {
    const num = Number(price);
    if (!price || isNaN(num)) return "Price on request";
    if (num >= 10_000_000) return `₹ ${(num / 10_000_000).toFixed(2)} Cr`;
    if (num >= 100_000)    return `₹ ${(num / 100_000).toFixed(2)} Lakhs`;
    return `₹ ${num.toLocaleString("en-IN")}`;
};

// ─── Image with fallback ──────────────────────────────────────────────────────

function PropertyImage({ src, alt }) {
    const [errored, setErrored] = useState(false);

    if (!src || errored) {
        return <div className="img-placeholder">🏠</div>;
    }

    return (
        <img
            src={src}
            alt={alt}
            className="property-img"
            loading="lazy"
            decoding="async"
            onError={() => setErrored(true)}
        />
    );
}

// ─── Property Card ───────────────────────────────────────────────────────────

function PropertyCard({ property }) {
    const [isFavorite, setIsFavorite] = useState(false);

    const mainImage =
        property.mainImages?.[0] ||
        property.images?.[0]     ||
        property.image            ||
        null;

    const handleFavClick = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsFavorite((prev) => !prev);
    }, []);

    const price     = formatPrice(property.price);
    const isSoldOut = Boolean(property.soldOut);

    return (
        <Link
            to={`/property/${property.slug}`}
            className="property-card"
            aria-label={`View details for ${property.title}`}
        >
            {/* ── Image ── */}
            <div className="img-wrapper">
                <PropertyImage src={mainImage} alt={property.title} />

                {/* Dark gradient + price overlay */}
                <div className="img-overlay" />
                <span className="img-price">{price}</span>

                {property.reraApproved && (
                    <span className="rera-badge">RERA ✓</span>
                )}

                {isSoldOut ? (
                    <span className="sold-badge">Sold Out</span>
                ) : (
                    <button
                        className="fav-btn"
                        onClick={handleFavClick}
                        aria-label={isFavorite ? "Remove from favourites" : "Add to favourites"}
                    >
                        <Heart
                            className={`heart-icon ${isFavorite ? "heart-active" : "heart-inactive"}`}
                        />
                    </button>
                )}
            </div>

            {/* ── Info ── */}
            <div className="property-info">
                <h3 className="property-title">{property.title}</h3>

                {property.location && (
                    <p className="property-location">
                        <MapPin size={11} strokeWidth={2.5} color="#94a3b8" />
                        {property.location}
                    </p>
                )}

                <div className="property-footer">
                    <span className="property-sqft">
                        {property.sqft ? `${property.sqft} sqft` : "—"}
                    </span>
                    {property.type && (
                        <span className="property-type-tag">{property.type}</span>
                    )}
                </div>
            </div>
        </Link>
    );
}

export default memo(PropertyCard);