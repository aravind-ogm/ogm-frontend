import React from "react";
import { useNavigate } from "react-router-dom";

const FALLBACK_IMAGE = "/images/placeholder.jpg";

function AiPropertyCard({ property }) {
  const navigate = useNavigate();

  if (!property) return null;

  const handleClick = () => {
    navigate(`/property/${property.slug || property.id}`);
  };

  const imageSrc =
    property.primaryImage ||
    property.image ||
    (property.gallery && property.gallery.length > 0
      ? property.gallery[0]
      : FALLBACK_IMAGE);

  const formatPrice = (price) => {
    if (!price) return "Price on request";

    const cleaned = String(price).replace(/[₹,]/g, "");
    const num = Number(cleaned);

    if (isNaN(num)) return price;

    if (num >= 10000000) return `₹ ${(num / 10000000).toFixed(2)} Cr`;
    if (num >= 100000) return `₹ ${(num / 100000).toFixed(2)} Lakhs`;

    return `₹ ${num.toLocaleString("en-IN")}`;
  };

  const formattedPrice = formatPrice(property.price);

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
        src={imageSrc}
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