import React, { useState, useCallback, memo } from "react";
import { Heart, MapPin } from "lucide-react";
import { Link } from "react-router-dom";
import "../styles/PropertyCard.css";

const formatPrice = (price) => {
    const num = Number(price);
    if (!price || isNaN(num)) return "Price on request";
    if (num >= 10_000_000) return `₹ ${(num / 10_000_000).toFixed(2)} Cr`;
    if (num >= 100_000)    return `₹ ${(num / 100_000).toFixed(2)} Lakhs`;
    return `₹ ${num.toLocaleString("en-IN")}`;
};

function PropertyImage({ src, alt }) {
    const [errored, setErrored] = useState(false);
    if (!src || errored) return <div className="img-placeholder">🏠</div>;
    return (
        <img
            src={src} alt={alt} className="property-img"
            loading="lazy" decoding="async"
            onError={() => setErrored(true)}
        />
    );
}

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
                <div className="img-overlay-bottom" />

                {/* Price on image — single source of truth */}
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
                        <Heart className={`heart-icon ${isFavorite ? "heart-active" : "heart-inactive"}`} />
                    </button>
                )}
            </div>

            {/* ── Card Body ── */}
            <div className="property-info">
                <h3 className="property-title">{property.title}</h3>

                {/* Location pill — styled like type tag */}
                {property.location && (
                    <div className="property-location-pill">
                        <MapPin size={11} strokeWidth={2.5} color="#0b63e5" />
                        <span>{property.location}</span>
                    </div>
                )}

                {/* Footer: sqft + type */}
                <div className="property-footer">
                    {property.sqft
                        ? <span className="property-sqft">{property.sqft} sqft</span>
                        : <span />
                    }
                    {property.type && (
                        <span className="property-type-tag">{property.type}</span>
                    )}
                </div>
            </div>
        </Link>
    );
}

export default memo(PropertyCard);