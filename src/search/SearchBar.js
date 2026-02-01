import React, { useState } from "react";
import "./SearchBar.css";

function SearchBar({ onSearch, mode = "both" }) {
  const [normalText, setNormalText] = useState("");
  const [aiText, setAiText] = useState("");

  const handleNormalSearch = () => {
    if (!normalText.trim()) return;
    onSearch(normalText);
  };

  /*
   ⚠️ AI SEARCH TEMPORARILY DISABLED
   Reason:
   - After clearing AI search results, app redirects to home page
   - UX needs stabilization before enabling AI flow
   - Will re-enable once result-clear + routing logic is fixed
  */
  /*
  const handleAISearch = async () => {
    if (!aiText.trim()) return;

    try {
      const res = await fetch(
        `https://ogm-backend-clean-879813720468.asia-south1.run.app/api/ai/search?prompt=${encodeURIComponent(aiText)}`
      );
      const page = await res.json();

      // AI search returns array
      onSearch(page.content);
    } catch (e) {
      console.error("AI search failed", e);
    }
  };
  */

  return (
      <div className="search-wrap">
        <div className="dual-search-bar">

          {/* NORMAL SEARCH */}
          {mode !== "ai" && (
              <div className="search-pill">
                <div className="pill-content">
                  <label className="pill-title">Search</label>
                  <input
                      className="pill-input"
                      placeholder="Find Apartments, Villas, Plots..."
                      value={normalText}
                      onChange={(e) => setNormalText(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleNormalSearch()}
                  />
                </div>

                <button className="pill-btn" onClick={handleNormalSearch}>
                  🔍
                </button>
              </div>
          )}

          {/* AI SEARCH UI DISABLED – see note above */}
          {/*
        <div className="search-pill ai">
          <div className="pill-content">
            <label className="pill-title">Ask AI Property Agent</label>
            <input
              className="pill-input"
              placeholder="Search, compare, locate with AI agent"
              value={aiText}
              onChange={(e) => setAiText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAISearch()}
            />
          </div>

          <button className="pill-btn ai" onClick={handleAISearch}>
            🤖
          </button>
        </div>
        */}
        </div>
      </div>
  );
}

export default SearchBar;
