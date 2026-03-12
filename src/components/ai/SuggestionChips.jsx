import React from "react";
import { DEFAULT_SUGGESTIONS } from "./Constants";
import "../../styles/ai/ai-chips.css";

export default function SuggestionChips({
  suggestions = DEFAULT_SUGGESTIONS,
  onSelect = () => {},
}) {
  if (!suggestions.length) return null;

  return (
    <div className="suggestion-chips">
      {suggestions.map((chip, i) => (
        <button
          key={`${chip.value}-${i}`}
          type="button"
          className="chip-btn"
          onClick={() => onSelect(chip.value)}
        >
          {chip.label}
        </button>
      ))}
    </div>
  );
}