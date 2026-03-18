import React, { useEffect } from "react";
import { formatPrice } from "./Helpers";   // FIX: was "../../utils/helpers" — wrong path
import "../../styles/ai/ai-compare.css";

export default function CompareModal({ properties = [], onClose = () => {} }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  if (!properties.length) return null;

  const rows = [
    { label: "Location",    key: "location" },
    { label: "Price",       key: "price",       format: formatPrice },
    { label: "Type",        key: "type" },
    { label: "Size (Sqft)", key: "sqft" },
    { label: "RERA",        key: "reraApproved", format: (v) => (v ? "Approved"    : "Not Approved") },
    { label: "Status",      key: "soldOut",      format: (v) => (v ? "Sold Out"    : "Available") },
  ];

  return (
    <div className="compare-overlay" onClick={onClose}>
      <div className="compare-modal" onClick={(e) => e.stopPropagation()}>
        <button className="compare-close-btn" onClick={onClose} aria-label="Close">
          ✕
        </button>

        <div className="compare-grid">
          {/* Header row */}
          <div className="compare-row header">
            <div className="compare-label" />
            {properties.map((p) => (
              <div key={p.id} className="compare-cell title">{p.title}</div>
            ))}
          </div>

          {/* Data rows */}
          {rows.map((row) => (
            <div className="compare-row" key={row.label}>
              <div className="compare-label">{row.label}</div>
              {properties.map((p) => (
                <div key={p.id} className="compare-cell">
                  {row.format ? row.format(p[row.key]) : p[row.key] || "N/A"}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
