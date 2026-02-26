import React from "react";
import { useNavigate } from "react-router-dom";

export default function AiPropertyCard({ property }) {

  const navigate = useNavigate();

  return (
    <div
      className="ai-property-card"
      onClick={() => navigate(`/property/${property.slug}`)}
    >
      <img src={property.image} alt={property.title} />

      <div className="card-body">
        <h4>{property.title}</h4>
        <p>{property.location}</p>
        <p>₹ {property.price}</p>
      </div>
    </div>
  );
}