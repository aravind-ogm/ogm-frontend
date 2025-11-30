import React, { useEffect, useRef, useState } from "react";
import "../styles/PropertyDetails.css";

export default function GalleryCarousel({
  images = [],
  autoplay = true,
  interval = 4000,
  onImageClick,
}) {
  const [index, setIndex] = useState(0);
  const timerRef = useRef(null);

  // Auto-play
  useEffect(() => {
    if (!autoplay || images.length <= 1) return;
    timerRef.current = setInterval(() => {
      setIndex((i) => (i + 1) % images.length);
    }, interval);
    return () => clearInterval(timerRef.current);
  }, [autoplay, images.length, interval]);

  // Keyboard navigation
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const prev = () => {
    clearInterval(timerRef.current);
    setIndex((i) => (i - 1 + images.length) % images.length);
  };

  const next = () => {
    clearInterval(timerRef.current);
    setIndex((i) => (i + 1) % images.length);
  };

  if (!images || images.length === 0) return null;

  return (
    <div className="gallery-root">

      <div className="gallery-main" onClick={() => onImageClick?.(index)}>
        <button
          className="gallery-arrow left"
          onClick={(e) => {
            e.stopPropagation();
            prev();
          }}
        >
          ‹
        </button>

        <div className="gallery-image-wrapper">
          <img
            src={images[index]}
            alt={`Property image ${index + 1}`}
            className="gallery-image zoomable"
            loading="lazy"
            draggable="false"
          />
        </div>

        <button
          className="gallery-arrow right"
          onClick={(e) => {
            e.stopPropagation();
            next();
          }}
        >
          ›
        </button>
      </div>
    </div>
  );
}
