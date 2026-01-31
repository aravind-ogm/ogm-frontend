import React, { useState } from "react";
import { Heart } from "lucide-react";
import { Link } from "react-router-dom";
import "../styles/PropertyCard.css";

export default function PropertyCard({ property }) {
    const [isFavorite, setIsFavorite] = useState(false);

    const mainImage =
        property.mainImages?.[0] ||
        property.images?.[0] ||
        property.image;

    return (
        <Link
            to={`/property/${property.slug}`}
            className="property-card"
        >
            <div className="img-wrapper">
                <img
                    src={mainImage}
                    alt={property.title}
                    className="property-img"
                />

                {property.reraApproved && (
                    <div className="rera-badge">RERA Approved</div>
                )}

                {property.soldOut && (
                    <div className="sold-badge">SOLD OUT</div>
                )}

                {!property.soldOut && (
                    <button
                        className="fav-btn"
                        onClick={(e) => {
                            e.preventDefault(); // prevents navigation ONLY for heart
                            e.stopPropagation(); // ⭐ important
                            setIsFavorite(!isFavorite);
                        }}
                    >
                        <Heart
                            className={`heart-icon ${
                                isFavorite ? "heart-active" : "heart-inactive"
                            }`}
                        />
                    </button>
                )}
            </div>

            <div className="property-info">
                <h3>{property.title}</h3>
                <p className="loc">{property.location}</p>
                <p className="details">
                    {property.type} • {property.sqft} Sqft • {property.price}
                </p>
            </div>
        </Link>
    );
}
