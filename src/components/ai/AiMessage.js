import React, { useState, useMemo } from "react";
import Icon from "./Icon";
import AiPropertyCard from "./AiPropertyCard";
import { formatTime, parseMarkdown } from "./Helpers";
import { detectRouteIntent } from "./RouteHelper";

function AiMessage({
  msg,
  chatId,
  index,
  onEdit,
  onRetry,
  onCopy,
  onFollowUp,
  onMapView,
  onRouteView,   // ← NEW: called with (origin, destination) to show route on map
  isMapOpen,
  userPosition,
}) {
  const [editing,  setEditing]  = useState(false);
  const [editText, setEditText] = useState("");
  const [reaction, setReaction] = useState(null);

  const isUser = msg.role === "user";
  const isAi   = !isUser;

  /* Detect if THIS user message contains a route/distance intent */
  const routeIntent = useMemo(() => {
    if (!isUser) return null;
    return detectRouteIntent(msg.text);
  }, [isUser, msg.text]);

  /* Memoize follow-up suggestions */
  const followUps = useMemo(() => {
    if (!isAi || msg.isError || !msg.hasResults || !msg.properties?.length) return [];
    return (
      msg.followUps?.length
        ? msg.followUps
        : [
            "Want to compare these properties?",
            "Show similar options under budget",
            "Add to watchlist and get a report",
          ]
    );
  }, [isAi, msg.isError, msg.hasResults, msg.properties, msg.followUps]);

  const saveEdit = () => {
    if (editText.trim() && onEdit) onEdit(chatId, msg.id, editText.trim());
    setEditing(false);
    setEditText("");
  };

  return (
    <div className={`message-row ${isUser ? "user" : "ai"}`}>
      <div className={`msg-bubble ${msg.isError ? "error" : ""} ${isAi && msg.hasResults ? "wide" : ""}`}>

        {editing ? (
          <>
            <textarea
              className="msg-edit-area"
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); saveEdit(); }
                if (e.key === "Escape")               { setEditing(false); setEditText(""); }
              }}
            />
            <div className="msg-edit-btns">
              <button className="edit-save" onClick={saveEdit}>Save</button>
              <button onClick={() => { setEditing(false); setEditText(""); }}>Cancel</button>
            </div>
          </>
        ) : (
          <>
            {/* Message text */}
            {isAi
              ? <div className="msg-text-content" dangerouslySetInnerHTML={{ __html: parseMarkdown(msg.text) }} />
              : <div>{msg.text}</div>
            }

            {/* ── "Show Route on Map" button for user messages with route intent ── */}
            {isUser && routeIntent && (
              <button
                className="msg-route-btn"
                onClick={() => onRouteView?.(routeIntent.origin, routeIntent.destination)}
                title={`Show route: ${routeIntent.origin} → ${routeIntent.destination}`}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <circle cx="5"  cy="6"  r="2"/>
                  <circle cx="19" cy="18" r="2"/>
                  <path d="M5 8v3a2 2 0 0 0 2 2h10a2 2 0 0 1 2 2v1"/>
                </svg>
                Show Route on Map
              </button>
            )}

            {/* Property cards */}
            {isAi && msg.hasResults && msg.properties?.length > 0 && (
              <>
                <div className="ai-property-results-list">
                  {msg.properties.map((property) => (
                    <AiPropertyCard
                      key={property.id}
                      property={property}
                      onMapView={() => onMapView?.(msg.properties)}
                      isMapOpen={isMapOpen}
                      userPosition={userPosition}
                    />
                  ))}
                </div>
                <div className="ai-result-chips-wrap">
                  <span className="ai-result-chips-label">Explore further</span>
                  <div className="ai-result-chips">
                    {[
                      { icon: "🗺", label: "Show on map",         query: "Show these properties on map" },
                      { icon: "🏥", label: "Nearby hospitals",    query: "Are there good hospitals nearby?" },
                      { icon: "🏫", label: "Schools nearby",      query: "What schools are close by?" },
                      { icon: "🍽", label: "Restaurants nearby",  query: "Are there good restaurants nearby?" },
                      { icon: "🏋", label: "Gyms nearby",         query: "What gyms are close by?" },
                      { icon: "⛪", label: "Temples nearby",      query: "Show temples nearby" },
                      { icon: "🛍", label: "Malls nearby",        query: "Any shopping malls nearby?" },
                      { icon: "🏨", label: "Hotels nearby",       query: "Show hotels near this property" },
                      { icon: "📄", label: "Download report",     query: "Create a downloadable PDF report for this property" },
                      { icon: "📞", label: "Book a visit",        query: "How do I book a site visit?" },
                    ].map(({ icon, label, query }) => (
                      <button key={label} className="ai-result-chip" onClick={() => onFollowUp?.(query)}>
                        <span className="ai-result-chip-icon">{icon}</span>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Follow-up chips (non-property responses) */}
            {followUps.length > 0 && !(msg.hasResults && msg.properties?.length > 0) && (
              <div className="msg-followups">
                {followUps.map((s, i) => (
                  <button key={i} className="msg-followup-btn" onClick={() => onFollowUp?.(s)}>
                    {s}
                  </button>
                ))}
              </div>
            )}

            {/* Meta: time, edit, copy, retry */}
            <div className="msg-meta">
              {msg.timestamp && <span className="msg-time">{formatTime(msg.timestamp)}</span>}
              {msg.edited    && <span className="msg-edited">edited</span>}
              {isUser && (
                <button
                  className="msg-action"
                  onClick={() => { setEditing(true); setEditText(msg.text); }}
                >
                  <Icon name="edit" size={12} /> Edit
                </button>
              )}
              {isAi && (
                <>
                  <button className="msg-action" onClick={() => onCopy?.(msg.text)}>
                    <Icon name="copy" size={12} /> Copy
                  </button>
                  <button className="msg-action" onClick={() => onRetry?.(chatId, index)}>
                    <Icon name="retry" size={12} /> Retry
                  </button>
                </>
              )}
            </div>

            {/* Reactions */}
            {isAi && !msg.isError && (
              <div className="msg-reactions">
                <button
                  className={`msg-reaction-btn ${reaction === "up"   ? "active" : ""}`}
                  onClick={() => setReaction(reaction === "up"   ? null : "up")}
                >👍</button>
                <button
                  className={`msg-reaction-btn ${reaction === "down" ? "active" : ""}`}
                  onClick={() => setReaction(reaction === "down" ? null : "down")}
                >👎</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default React.memo(AiMessage);