import React, { useState } from "react";
import Icon from "./Icon";
import AiPropertyCard from "./AiPropertyCard";
import { formatTime, parseMarkdown, formatPrice } from "./Helpers";

function AiMessage({ msg, chatId, index, onEdit, onRetry, onCopy, onFollowUp }) {
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState("");
  const [reaction, setReaction] = useState(null);
  const [mapProperty, setMapProperty] = useState(null);

  const isUser = msg.role === "user";
  const isAi = !isUser;

  const startEdit = () => { setEditing(true); setEditText(msg.text); };
  const saveEdit = () => {
    if (editText.trim() && onEdit) onEdit(chatId, msg.id, editText.trim());
    setEditing(false); setEditText("");
  };

  const followUpSuggestions = isAi && !msg.isError ? (msg.followUps || generateFollowUps(msg)) : [];

  /* Toggle map for a property */
  const handleMapView = (property) => {
    setMapProperty((prev) => (prev && prev.id === property.id) ? null : property);
  };

  /* Map embed URL */
  const getMapUrl = (p) => {
    const lat = p?.latitude || p?.lat;
    const lng = p?.longitude || p?.lng || p?.lon;
    if (lat && lng) {
      return `https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.015},${lat - 0.01},${lng + 0.015},${lat + 0.01}&layer=mapnik&marker=${lat},${lng}`;
    }
    /* Fallback: use location name via Nominatim search */
    const q = encodeURIComponent(p?.location || p?.title || "Bangalore");
    return `https://www.openstreetmap.org/export/embed.html?bbox=77.5,12.85,77.75,13.1&layer=mapnik`;
  };

  return (
    <div className={`message-row ${isUser ? "user" : "ai"}`}>
      <div className={`msg-bubble ${msg.isError ? "error" : ""} ${isAi && msg.hasResults ? "wide" : ""}`}>
        {editing ? (
          <>
            <textarea className="msg-edit-area" value={editText}
              onChange={(e) => setEditText(e.target.value)} autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); saveEdit(); }
                if (e.key === "Escape") { setEditing(false); setEditText(""); }
              }} />
            <div className="msg-edit-btns">
              <button className="edit-save" onClick={saveEdit}>Save</button>
              <button onClick={() => { setEditing(false); setEditText(""); }}>Cancel</button>
            </div>
          </>
        ) : (
          <>
            {/* Text */}
            {isAi ? (
              <div className="msg-text-content" dangerouslySetInnerHTML={{ __html: parseMarkdown(msg.text) }} />
            ) : (
              <div>{msg.text}</div>
            )}

            {/* Property cards */}
            {isAi && msg.hasResults && msg.properties?.length > 0 && (
              <div className="ai-property-results-list">
                {msg.properties.map((property) => (
                  <AiPropertyCard
                    key={property.id}
                    property={property}
                    onMapView={handleMapView}
                  />
                ))}
              </div>
            )}

            {/* ── MAP SPLIT VIEW ── */}
            {mapProperty && (
              <div className="map-split-view">
                <div className="map-split-left">
                  <h4>{mapProperty.title || "Property Details"}</h4>

                  <div className="map-split-details">
                    <div className="map-detail-row">
                      <span className="map-detail-icon">📍</span>
                      <span>{mapProperty.location || "Location not specified"}</span>
                    </div>

                    {mapProperty.price && (
                      <div className="map-detail-row">
                        <span className="map-detail-icon">💰</span>
                        <span className="map-detail-bold">{formatPrice(mapProperty.price)}</span>
                      </div>
                    )}

                    {mapProperty.sqft && (
                      <div className="map-detail-row">
                        <span className="map-detail-icon">📐</span>
                        <span>{Number(mapProperty.sqft).toLocaleString("en-IN")} Sqft</span>
                      </div>
                    )}

                    {mapProperty.bedrooms && (
                      <div className="map-detail-row">
                        <span className="map-detail-icon">🛏</span>
                        <span>{mapProperty.bedrooms} BHK{mapProperty.bathrooms ? ` / ${mapProperty.bathrooms} Bath` : ""}</span>
                      </div>
                    )}

                    {mapProperty.type && !["property_card", "property", "card"].includes(mapProperty.type.toLowerCase()) && (
                      <div className="map-detail-row">
                        <span className="map-detail-icon">🏠</span>
                        <span>{mapProperty.type}</span>
                      </div>
                    )}

                    {mapProperty.builder && (
                      <div className="map-detail-row">
                        <span className="map-detail-icon">🏗</span>
                        <span>{mapProperty.builder}</span>
                      </div>
                    )}

                    {mapProperty.reraApproved && (
                      <div className="map-detail-row">
                        <span className="map-detail-icon">✅</span>
                        <span>RERA Approved</span>
                      </div>
                    )}

                    {mapProperty.possession && (
                      <div className="map-detail-row">
                        <span className="map-detail-icon">📅</span>
                        <span>Possession: {mapProperty.possession}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="map-split-right">
                  <button className="map-split-close" onClick={() => setMapProperty(null)}>✕</button>
                  <iframe
                    title={`Map - ${mapProperty.title}`}
                    src={getMapUrl(mapProperty)}
                    loading="lazy"
                  />
                </div>
              </div>
            )}

            {/* Follow-ups */}
            {followUpSuggestions.length > 0 && (
              <div className="msg-followups">
                {followUpSuggestions.map((s, i) => (
                  <button key={i} className="msg-followup-btn" onClick={() => onFollowUp?.(s)}>{s}</button>
                ))}
              </div>
            )}

            {/* Meta */}
            <div className="msg-meta">
              {msg.timestamp && <span className="msg-time">{formatTime(msg.timestamp)}</span>}
              {msg.edited && <span className="msg-edited">edited</span>}
              {isUser && <button className="msg-action" onClick={startEdit}><Icon name="edit" size={12} /> Edit</button>}
              {isAi && (
                <>
                  <button className="msg-action" onClick={() => onCopy?.(msg.text)}><Icon name="copy" size={12} /> Copy</button>
                  <button className="msg-action" onClick={() => onRetry?.(chatId, index)}><Icon name="retry" size={12} /> Retry</button>
                </>
              )}
            </div>

            {isAi && !msg.isError && (
              <div className="msg-reactions">
                <button className={`msg-reaction-btn ${reaction === "up" ? "active" : ""}`}
                  onClick={() => setReaction(reaction === "up" ? null : "up")}>👍</button>
                <button className={`msg-reaction-btn ${reaction === "down" ? "active" : ""}`}
                  onClick={() => setReaction(reaction === "down" ? null : "down")}>👎</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function generateFollowUps(msg) {
  if (msg.hasResults && msg.properties?.length > 0) {
    return [
      "Want to compare these properties?",
      "Show similar options under budget",
      "Add to watchlist and get a report",
    ];
  }
  return [];
}

export default React.memo(AiMessage);