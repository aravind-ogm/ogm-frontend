import React from "react";
import "../styles/property-details.css";

export default function VideoModal({ open, onClose, videoUrl }) {
  if (!open) return null;

  return (
      <div
          className="video-modal-overlay"
          role="dialog"
          aria-modal="true"
          onClick={onClose} // Close when clicking outside
      >
        <div
            className="video-modal"
            onClick={(e) => e.stopPropagation()} // Prevent close on inner click
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
              className="video-player"
              src={videoUrl}
              controls
              autoPlay
              preload="none"
          >
            Your browser does not support the video tag.
          </video>
        </div>
      </div>
  );
}
