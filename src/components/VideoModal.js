import React from "react";
import "../styles/property-details.css";

export default function VideoModal({ open, onClose, videoUrl }) {
  if (!open) return null;

  return (
    <div
      className="video-modal-overlay"
      role="dialog"
      aria-modal="true"
      onClick={onClose}  // Close when clicking outside
    >
      <div
        className="video-modal"
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside
      >
        {/* CLOSE BUTTON */}
        <button
          className="modal-close"
          onClick={onClose}
          aria-label="Close video"
        >
          ✕
        </button>

        {/* VIDEO PLAYER */}
        <video
          width="100%"
          height="100%"
          controls
          autoPlay
          preload="none"
          src={videoUrl}
          style={{ objectFit: "cover" }}
        >
          Your browser does not support the video tag.
        </video>
      </div>
    </div>
  );
}
