import React from "react";
import { useNavigate } from "react-router-dom";

const FALLBACK_IMAGE = "/images/placeholder.jpg";

function AiPropertyCard({ property }) {
  const navigate = useNavigate();

  if (!property) return null;

  const handleClick = () => {
    navigate(`/property/${property.slug || property.id}`);
  };

  const formattedPrice = property.price
    ? `₹ ${Number(property.price).toLocaleString()}`
    : "Price on request";

  return (
    <div
      className="ai-property-card"
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === "Enter") handleClick();
      }}
    >
      <img
        src={property.image || FALLBACK_IMAGE}
        alt={property.title || "Property image"}
        loading="lazy"
        className="ai-property-img"
      />

      <div className="card-body">
        <h4>{property.title || "Untitled Property"}</h4>
        <p>{property.location || "Location not specified"}</p>
        <p className="price">{formattedPrice}</p>
      </div>
    </div>
  );
}

export default React.memo(AiPropertyCard);