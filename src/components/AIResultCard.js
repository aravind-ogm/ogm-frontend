import React from "react";
import "./AIResultCard.css";

function AIResultCard({
                        property,
                        onWishlist,
                        onWatchlist,
                        isWishlisted,
                        isWatchlisted
                      }) {

  /* ------------------------------
     Build bullet highlights
  -------------------------------- */
  const bullets = [];
  const descriptionText =
      property.description ||
      property.summary ||
      property.desc ||
      property.details ||
      "";


  if (property.bedrooms) {
    bullets.push(`${property.bedrooms} BHK ${property.type}`);
  }

  if (property.location) {
    bullets.push(`Located in ${property.location}`);
  }

  if (descriptionText) {
    descriptionText
        .split(/[.,]/)
        .map(s => s.trim())
        .filter(s => s.length > 10)
        .slice(0, 3)
        .forEach(s => bullets.push(s));
  }


  if (property.nearby?.length) {
    property.nearby.slice(0, 2).forEach(n => {
      bullets.push(`Close to ${n}`);
    });
  }

  return (
      <div className="ai-card">

        {/* LEFT — IMAGES (30%) */}
        <div className="ai-card-images">
          <img src={property.image} alt={property.title} />
          <span className="image-count">
          {property.images?.length || 1} Photos
        </span>
        </div>

        {/* RIGHT — CONTENT (70%) */}
        <div className="ai-card-content">
          <h3 className="ai-title">{property.title}</h3>
          <p className="ai-location">{property.location}</p>

          {/* BULLET POINT HIGHLIGHTS */}
          <ul className="ai-bullets">
            {bullets.slice(0, 5).map((point, index) => (
                <li key={index}>• {point}</li>
            ))}
          </ul>

          {/* ACTIONS */}
          <div className="ai-actions">
            <button
                className={isWishlisted ? "active" : ""}
                onClick={() => onWishlist(property)}
            >
              {isWishlisted ? "❤️ Wishlisted" : "🤍 Wishlist"}
            </button>

            <button
                className={isWatchlisted ? "active" : ""}
                onClick={() => onWatchlist(property)}
            >
              {isWatchlisted ? "👁 Watching" : "➕ Watch"}
            </button>

            <button
                className="primary"
                onClick={() => (window.location.href = "/contact")}
            >
              Contact
            </button>
          </div>
        </div>
      </div>
  );
}

export default AIResultCard;
