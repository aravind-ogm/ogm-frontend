import React from "react";

const DEFAULT_SUGGESTIONS = [
  { label: "2 BHK Whitefield", value: "2 bhk in whitefield" },
  { label: "Villa under 1 Cr", value: "villa under 1 crore" },
  { label: "3 BHK near metro", value: "3 bhk near metro" }
];

export default function SuggestionChips({
  suggestions = DEFAULT_SUGGESTIONS,
  onSelect = () => {}
}) {
  if (!suggestions.length) return null;

  return (
    <div className="chips">
      {suggestions.map((chip, index) => (
        <button
          key={`${chip.value}-${index}`}
          type="button"
          onClick={() => onSelect(chip.value)}
          className="chip-btn"
        >
          {chip.label}
        </button>
      ))}
    </div>
  );
}