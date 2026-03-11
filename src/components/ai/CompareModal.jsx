import React, { useEffect } from "react";

export default function CompareModal({
  properties = [],
  onClose = () => {}
}) {
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  if (!properties.length) return null;

  const formatPrice = (price) =>
    price ? `₹ ${Number(price).toLocaleString()}` : "N/A";

  return (
    <div className="compare-overlay" onClick={onClose}>
      <div
        className="compare-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="close-btn"
          onClick={onClose}
          aria-label="Close compare modal"
        >
          ✕
        </button>

        <div className="compare-grid">

          {/* HEADER ROW */}
          <div className="compare-row header">
            <div className="compare-label"></div>
            {properties.map((p) => (
              <div key={p.id} className="compare-cell title">
                {p.title}
              </div>
            ))}
          </div>

          {/* LOCATION */}
          <div className="compare-row">
            <div className="compare-label">Location</div>
            {properties.map((p) => (
              <div key={p.id} className="compare-cell">
                {p.location || "N/A"}
              </div>
            ))}
          </div>

          {/* PRICE */}
          <div className="compare-row">
            <div className="compare-label">Price</div>
            {properties.map((p) => (
              <div key={p.id} className="compare-cell">
                {formatPrice(p.price)}
              </div>
            ))}
          </div>

          {/* TYPE */}
          <div className="compare-row">
            <div className="compare-label">Type</div>
            {properties.map((p) => (
              <div key={p.id} className="compare-cell">
                {p.type || "N/A"}
              </div>
            ))}
          </div>

          {/* SIZE */}
          <div className="compare-row">
            <div className="compare-label">Size (Sqft)</div>
            {properties.map((p) => (
              <div key={p.id} className="compare-cell">
                {p.sqft || "N/A"}
              </div>
            ))}
          </div>

          {/* RERA */}
          <div className="compare-row">
            <div className="compare-label">RERA</div>
            {properties.map((p) => (
              <div key={p.id} className="compare-cell">
                {p.reraApproved ? "Approved" : "Not Approved"}
              </div>
            ))}
          </div>

          {/* STATUS */}
          <div className="compare-row">
            <div className="compare-label">Status</div>
            {properties.map((p) => (
              <div key={p.id} className="compare-cell">
                {p.soldOut ? "Sold Out" : "Available"}
              </div>
            ))}
          </div>

        </div>
      </div>
    </div>
  );
}