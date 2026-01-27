import React from "react";
import "../styles/property-details.css";

export default function ImageZoomModal({ open, image, onClose }) {
  if (!open || !image) return null;

  return (
    <div className="image-zoom-overlay" onClick={onClose}>
      <div
        className="image-zoom-container"
        onClick={(e) => e.stopPropagation()} // prevent close when clicking inside
      >
        <button
          className="zoom-close-btn"
          onClick={onClose}
          aria-label="Close zoomed image"
        >
          ✕
        </button>

        <img src={image} alt="Zoomed view" className="image-zoom-img" />
      </div>
    </div>
  );
}
