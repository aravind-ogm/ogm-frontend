import React from "react";
import "./AIResultCard.css";

function AIResultCard({ property, onWishlist, onWatchlist }) {
  return (
    <div className="ai-card">

      {/* LEFT — IMAGES */}
      <div className="ai-card-images">
        <img
          src={property.image}
          alt={property.title}
        />
        <span className="image-count">
          {property.images?.length || 1} Photos
        </span>
      </div>

      {/* RIGHT — DETAILS */}
      <div className="ai-card-content">
        <h3 className="ai-title">{property.title}</h3>
        <p className="ai-location">{property.location}</p>

        <div className="ai-icons">
          🛏 {property.bedrooms} BHK · 🏠 {property.type}
        </div>

        {/* ✅ DESCRIPTION */}
        <p className="ai-description">
          {property.description || "No description available."}
        </p>

        {/* HIGHLIGHTS */}
        {property.nearby && property.nearby.length > 0 && (
          <ul className="ai-highlights">
            {property.nearby.slice(0, 3).map((point, i) => (
              <li key={i}>• {point}</li>
            ))}
          </ul>
        )}

        {/* ACTIONS */}
        <div className="ai-actions">
          <button onClick={() => onWishlist(property)}>
            ❤️ Wishlist
          </button>
          <button onClick={() => onWatchlist(property)}>
            👁 Watchlist
          </button>
          <button className="primary">
            Contact
          </button>
        </div>
      </div>
    </div>
  );
}

export default AIResultCard;
