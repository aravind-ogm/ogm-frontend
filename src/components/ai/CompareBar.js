import React from "react";
import "../../styles/ai/ai-compare.css";

export default function CompareBar({
                                       count      = 0,
                                       properties = [],
                                       onClick    = () => {},
                                       onClear    = () => {},
                                   }) {
    if (count === 0) return null;

    return (
        <div className="compare-bar" role="status" aria-live="polite">

            {/* Thumbnails of selected properties */}
            <div className="compare-bar-thumbs">
                {properties.map((p) => (
                    <div key={p.id} className="compare-bar-thumb" title={p.title}>
                        {(p.primaryImage || p.image) ? (
                            <img
                                src={p.primaryImage || p.image}
                                alt={p.title}
                                onError={(e) => { e.target.style.display = "none"; }}
                            />
                        ) : (
                            <div className="compare-bar-thumb-placeholder">
                                {p.title?.charAt(0) || "P"}
                            </div>
                        )}
                    </div>
                ))}

                {/* Empty slots up to 4 */}
                {Array.from({ length: Math.max(0, 4 - count) }).map((_, i) => (
                    <div key={`empty-${i}`} className="compare-bar-thumb compare-bar-thumb--empty">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                             stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round">
                            <line x1="12" y1="5" x2="12" y2="19"/>
                            <line x1="5"  y1="12" x2="19" y2="12"/>
                        </svg>
                    </div>
                ))}
            </div>

            {/* Count label */}
            <span className="compare-bar-label">
        <strong>{count}</strong> {count === 1 ? "property" : "properties"} selected
        <span className="compare-bar-hint"> · up to 4</span>
      </span>

            {/* Action buttons */}
            <div className="compare-bar-actions">
                <button
                    type="button"
                    className="compare-bar-clear"
                    onClick={onClear}
                    aria-label="Clear compare selection"
                >
                    Clear
                </button>
                <button
                    type="button"
                    className={`compare-bar-btn${count < 2 ? " disabled" : ""}`}
                    onClick={count >= 2 ? onClick : undefined}
                    disabled={count < 2}
                    aria-label={count < 2 ? "Select at least 2 properties to compare" : "Compare selected properties"}
                >
                    {count < 2 ? `Need ${2 - count} more` : "Compare Now →"}
                </button>
            </div>
        </div>
    );
}