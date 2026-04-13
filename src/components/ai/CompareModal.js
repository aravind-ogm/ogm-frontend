import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { formatPrice }  from "./Helpers";
import "../../styles/ai/ai-compare.css";

export default function CompareModal({
                                       properties = [],
                                       onClose    = () => {},
                                       onRemove   = () => {},
                                     }) {
  const navigate = useNavigate();

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  if (!properties.length) return null;

  // Format possession status nicely
  const formatPossession = (val) => {
    if (!val) return "—";
    return val.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
  };

  const rows = [
    { label: "📍 Location",      key: "location" },
    { label: "💰 Price",         key: "price",            format: (v, p) => {
        const s = String(p.price || "");
        if (s.includes("₹") || /\bCr\b|\bL\b/i.test(s)) return s;
        return formatPrice(p.priceRaw ?? p.price);
      }},
    { label: "🏠 Type",          key: "type" },
    { label: "🛏 BHK",           key: "bhk",              format: (v, p) => {
        if (p.bhk) return /bhk/i.test(p.bhk) ? p.bhk : `${p.bhk} BHK`;
        return p.bedrooms ? `${p.bedrooms} BHK` : "—";
      }},
    { label: "🚿 Bathrooms",     key: "bathrooms" },
    { label: "📐 Sqft",          key: "sqft",             format: (v) => v ? `${Number(v).toLocaleString("en-IN")} sqft` : "—" },
    { label: "🧭 Facing",        key: "facing" },
    { label: "🛋 Furnishing",    key: "furnishing" },
    { label: "✅ RERA",          key: "reraApproved",     format: (v) => v ? "✅ Approved"  : "❌ Not Approved" },
    { label: "🕉 Vastu",         key: "vastuCompliant",   format: (v) => v ? "✅ Compliant" : "—" },
    { label: "🏗 Possession",    key: "possessionStatus", format: formatPossession },
    { label: "🏢 Developer",     key: "developerName" },
    { label: "📋 Listing Type",  key: "listingType",      format: (v) => v ? v.charAt(0).toUpperCase() + v.slice(1) : "—" },
    { label: "🔄 Resale",        key: "resale",           format: (v) => v === true ? "Yes" : v === false ? "No" : "—" },
    { label: "🚗 Parking",       key: "parking" },
    { label: "🔧 Maintenance",   key: "maintenance" },
    { label: "📊 Status",        key: "soldOut",          format: (v) => v ? "🔴 Sold Out" : "🟢 Available" },
  ];

  return (
      <div className="compare-overlay" onClick={onClose} role="dialog"
           aria-modal="true" aria-label="Compare properties">
        <div className="compare-modal" onClick={(e) => e.stopPropagation()}>

          {/* Header */}
          <div className="compare-modal-header">
            <h2 className="compare-modal-title">
              Compare Properties
              <span className="compare-modal-count">{properties.length} selected</span>
            </h2>
            <button className="compare-close-btn" onClick={onClose} aria-label="Close">✕</button>
          </div>

          <div className="compare-scroll">
            <table className="compare-table">
              <thead>
              <tr>
                {/* Label column */}
                <th className="compare-th-label" />
                {/* Property columns */}
                {properties.map((p) => (
                    <th key={p.id} className="compare-th-prop">
                      {/* Thumbnail */}
                      <div className="compare-prop-img-wrap">
                        {(p.primaryImage || p.image) ? (
                            <img src={p.primaryImage || p.image}
                                 alt={p.title}
                                 className="compare-prop-img"
                                 onError={(e) => { e.target.style.display = "none"; }} />
                        ) : (
                            <div className="compare-prop-img-placeholder">🏠</div>
                        )}
                      </div>
                      {/* Title */}
                      <div className="compare-prop-title"
                           onClick={() => navigate(`/property/${p.slug || p.id}`)}>
                        {p.title}
                      </div>
                      {/* Remove button */}
                      <button className="compare-prop-remove"
                              onClick={() => onRemove(p.id)}
                              aria-label={`Remove ${p.title}`}>
                        ✕ Remove
                      </button>
                    </th>
                ))}
              </tr>
              </thead>

              <tbody>
              {rows.map((row) => {
                // Skip row if ALL properties have no value
                const hasAnyValue = properties.some((p) => {
                  const v = p[row.key];
                  return v !== null && v !== undefined && v !== "" && v !== "—";
                });
                if (!hasAnyValue) return null;

                return (
                    <tr key={row.label} className="compare-row">
                      <td className="compare-label">{row.label}</td>
                      {properties.map((p) => {
                        const raw     = p[row.key];
                        const display = row.format
                            ? row.format(raw, p)
                            : (raw ?? "—");
                        return (
                            <td key={p.id} className="compare-cell">
                              {display || "—"}
                            </td>
                        );
                      })}
                    </tr>
                );
              })}
              </tbody>
            </table>
          </div>

          {/* Footer CTA */}
          <div className="compare-modal-footer">
            <button className="compare-footer-clear" onClick={onClose}>
              Close
            </button>
            {properties.map((p) => (
                <button
                    key={p.id}
                    className="compare-footer-view"
                    onClick={() => { navigate(`/property/${p.slug || p.id}`); onClose(); }}
                >
                  View {p.title?.split(" ").slice(0, 3).join(" ")}…
                </button>
            ))}
          </div>

        </div>
      </div>
  );
}