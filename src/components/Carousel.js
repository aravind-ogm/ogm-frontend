import React, { useState } from "react";
import "../styles/PropertyDetails.css";

export default function Carousel({ images = [] }) {
  const [index, setIndex] = useState(0);

  const prev = () => setIndex((i) => (i - 1 + images.length) % images.length);
  const next = () => setIndex((i) => (i + 1) % images.length);

  return (
    <div className="carousel-box">
      <img
        src={images[index] || "/placeholder.jpg"}
        className="carousel-img"
        alt=""
      />

      <button className="carousel-btn left" onClick={prev}>
        ‹
      </button>
      <button className="carousel-btn right" onClick={next}>
        ›
      </button>
    </div>
  );
}
