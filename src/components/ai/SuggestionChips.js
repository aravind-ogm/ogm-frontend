import React, { useState } from "react";
import { DEFAULT_SUGGESTIONS, SUGGESTION_CARDS } from "./Constants";
import "../../styles/ai/ai-chips.css";

/* ─── Scrollable chip pills ─────────────────────────────────────────────── */
export function SuggestionChips({
                                  suggestions = DEFAULT_SUGGESTIONS,
                                  onSelect    = () => {},
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
              {chip.icon && <span className="chip-icon" aria-hidden="true">{chip.icon}</span>}
              {chip.label}
            </button>
        ))}
      </div>
  );
}

/* ─── Full suggestion cards for empty state ─────────────────────────────── */
export function SuggestionCards({ onSelect = () => {} }) {
  return (
      <div className="suggestion-cards-grid">
        {SUGGESTION_CARDS.map((card, i) => (
            <button
                key={i}
                type="button"
                className="suggestion-card"
                onClick={() => onSelect(card.query)}
            >
              <div className="suggestion-card-top">
                <span className="suggestion-card-icon" aria-hidden="true">{card.icon}</span>
                <span
                    className="suggestion-card-tag"
                    style={{ background: card.tagColor + "18", color: card.tagColor, borderColor: card.tagColor + "40" }}
                >
              {card.tag}
            </span>
              </div>
              <div className="suggestion-card-title">{card.title}</div>
              <div className="suggestion-card-subtitle">{card.subtitle}</div>
            </button>
        ))}
      </div>
  );
}

/* ─── Default export keeps backward compat ──────────────────────────────── */
export default SuggestionChips;