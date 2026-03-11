import React from "react";

export default function CompareBar({
  count = 0,
  onClick = () => {}
}) {
  if (count === 0) return null;

  const isDisabled = count < 2;

  return (
    <div className="compare-bar">
      <span className="compare-text">
        {count} {count === 1 ? "property" : "properties"} selected
      </span>

      <button
        type="button"
        onClick={onClick}
        disabled={isDisabled}
        className={`compare-btn ${isDisabled ? "disabled" : ""}`}
        aria-label="Compare selected properties"
      >
        Compare
      </button>
    </div>
  );
}