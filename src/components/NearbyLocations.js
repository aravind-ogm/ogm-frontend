import React, { useState } from "react";
import { MapPin, Share2, Bookmark, Navigation } from "lucide-react";
import "../styles/NearbyLocations.css";

export default function NearbyLocations({ locations = [] }) {
  if (!locations.length) return null;

  return (
    <div className="nearby-section">
      <h2 className="nearby-title">Nearby Highlights</h2>

      <div className="nearby-grid">
        {locations.map((item, index) => (
          <NearbyCard key={index} item={item} />
        ))}
      </div>
    </div>
  );
}

function NearbyCard({ item }) {
  const [saved, setSaved] = useState(false);

  const openMaps = () => {
    window.open(
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        item.name
      )}`,
      "_blank"
    );
  };

  return (
    <div className="nearby-card-premium">

      <div className="nearby-img-wrapper">
        <img src={item.image} alt={item.name} className="nearby-img" />

        {item.category && (
          <span className="nearby-category">{item.category}</span>
        )}
      </div>

      <div className="nearby-footer">
        <div className="nearby-left">
          <MapPin size={18} className="nearby-pin" />

          <div className="nearby-text">
            <span className="nearby-name">{item.name}</span>
            <span className="nearby-distance-chip">{item.distance}</span>
          </div>
        </div>

        <div className="nearby-icons">
          <Navigation
            size={18}
            className="nearby-icon"
            onClick={openMaps}
            title="Open in Maps"
          />

          <Share2
            size={18}
            className="nearby-icon"
            onClick={() => navigator.clipboard.writeText(item.name)}
          />

          <Bookmark
            size={18}
            className="nearby-icon"
            color={saved ? "#059669" : "#444"}
            fill={saved ? "#059669" : "none"}
            onClick={() => setSaved(!saved)}
          />
        </div>
      </div>
    </div>
  );
}
