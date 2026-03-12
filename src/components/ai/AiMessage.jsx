import React, { useState } from "react";
import Icon from "./Icon";
import AiPropertyCard from "./AiPropertyCard";
import { formatTime, parseMarkdown } from "./Helpers";

function AiMessage({ msg, chatId, index, onEdit, onRetry, onCopy, onFollowUp, onMapView, isMapOpen }) {
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState("");
  const [reaction, setReaction] = useState(null);

  const isUser = msg.role === "user";
  const isAi = !isUser;

  const saveEdit = () => {
    if (editText.trim() && onEdit) onEdit(chatId, msg.id, editText.trim());
    setEditing(false); setEditText("");
  };

  const followUps = isAi && !msg.isError && msg.hasResults && msg.properties?.length > 0
    ? (msg.followUps || ["Want to compare these properties?", "Show similar options under budget", "Add to watchlist and get a report"])
    : [];

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
            {isAi ? <div className="msg-text-content" dangerouslySetInnerHTML={{ __html: parseMarkdown(msg.text) }} />
              : <div>{msg.text}</div>}

            {isAi && msg.hasResults && msg.properties?.length > 0 && (
              <div className="ai-property-results-list">
                {msg.properties.map((property) => (
                  <AiPropertyCard key={property.id} property={property}
                    onMapView={() => onMapView?.(msg.properties)}
                    isMapOpen={isMapOpen} />
                ))}
              </div>
            )}

            {followUps.length > 0 && (
              <div className="msg-followups">
                {followUps.map((s, i) => (
                  <button key={i} className="msg-followup-btn" onClick={() => onFollowUp?.(s)}>{s}</button>
                ))}
              </div>
            )}

            <div className="msg-meta">
              {msg.timestamp && <span className="msg-time">{formatTime(msg.timestamp)}</span>}
              {msg.edited && <span className="msg-edited">edited</span>}
              {isUser && <button className="msg-action" onClick={() => { setEditing(true); setEditText(msg.text); }}><Icon name="edit" size={12} /> Edit</button>}
              {isAi && (
                <>
                  <button className="msg-action" onClick={() => onCopy?.(msg.text)}><Icon name="copy" size={12} /> Copy</button>
                  <button className="msg-action" onClick={() => onRetry?.(chatId, index)}><Icon name="retry" size={12} /> Retry</button>
                </>
              )}
            </div>

            {isAi && !msg.isError && (
              <div className="msg-reactions">
                <button className={`msg-reaction-btn ${reaction === "up" ? "active" : ""}`} onClick={() => setReaction(reaction === "up" ? null : "up")}>👍</button>
                <button className={`msg-reaction-btn ${reaction === "down" ? "active" : ""}`} onClick={() => setReaction(reaction === "down" ? null : "down")}>👎</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default React.memo(AiMessage);