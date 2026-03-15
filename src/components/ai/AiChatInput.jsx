import { useState, useRef, useCallback } from "react";
import useGeolocation, { detectNearMeIntent } from "./useGeolocation";
import LocationPermissionModal from "./LocationPermissionModal";

/**
 * AiChatInput
 *
 * Drop-in replacement for the plain text input at the bottom of the chat.
 *
 * New behaviour vs the old input:
 *  1. Detects "near me" / "my current location" / "nearby" in the query
 *  2. If detected and location NOT granted → shows LocationPermissionModal
 *  3. If detected and location IS granted → attaches lat/lng to the request
 *  4. Shows a live "📍 Using your location" indicator when position is active
 *  5. Manual location pin button so users can trigger permission any time
 *
 * Props:
 *  onSend(payload)  — called with { question, userLatitude, userLongitude }
 *  disabled         — disables input + button (e.g. while AI is responding)
 *  placeholder      — input placeholder text
 */
export default function AiChatInput({
  onSend,
  disabled = false,
  placeholder = "Ask anything — find, compare, and locate properties",
}) {
  const [text,          setText]          = useState("");
  const [modalOpen,     setModalOpen]     = useState(false);
  const [pendingQuery,  setPendingQuery]  = useState("");  // query waiting for location
  const inputRef = useRef(null);

  const {
    position,
    permissionStatus,
    isRequesting,
    requestLocation,
    isGranted,
    isDenied,
  } = useGeolocation();

  // ── Submit handler ─────────────────────────────────────────────────────────
  const handleSubmit = useCallback(async () => {
    const question = text.trim();
    if (!question || disabled) return;

    const needsLocation = detectNearMeIntent(question);

    if (needsLocation) {
      if (isGranted && position) {
        // Already have location — send immediately
        dispatchMessage(question, position);
      } else if (isDenied) {
        // Can't get location — still send, backend will handle gracefully
        dispatchMessage(question, null);
      } else {
        // Need to ask — hold the query and open the modal
        setPendingQuery(question);
        setModalOpen(true);
      }
    } else {
      dispatchMessage(question, position); // attach position if we already have it
    }
  }, [text, disabled, isGranted, isDenied, position]);

  const dispatchMessage = (question, pos) => {
    setText("");
    onSend?.({
      question,
      userLatitude:  pos?.latitude  ?? null,
      userLongitude: pos?.longitude ?? null,
    });
    inputRef.current?.focus();
  };

  // ── Location granted from modal ────────────────────────────────────────────
  const handleLocationGranted = (pos) => {
    if (pendingQuery) {
      dispatchMessage(pendingQuery, pos);
      setPendingQuery("");
    }
  };

  // ── Manual location pin button ─────────────────────────────────────────────
  const handleManualLocation = async () => {
    if (isGranted) return; // already have it
    try {
      await requestLocation();
    } catch {
      // user denied — modal will show error
      setModalOpen(true);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const hasText = text.trim().length > 0;
  const isNearMeQuery = detectNearMeIntent(text);

  return (
    <>
      {/* ── Location Permission Modal ─────────────────────────────── */}
      <LocationPermissionModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setPendingQuery(""); }}
        onLocationGranted={handleLocationGranted}
        queryText={pendingQuery}
      />

      {/* ── Input Container ───────────────────────────────────────── */}
      <div style={styles.wrapper}>

        {/* Live location indicator */}
        {isGranted && position && (
          <div style={styles.locationBanner}>
            <span style={styles.locationDot} />
            <span>Using your current location</span>
            <span style={styles.accuracy}>
              ±{Math.round(position.accuracy || 0)}m
            </span>
          </div>
        )}

        {/* "Near me" hint — shown when user types a proximity query */}
        {isNearMeQuery && !isGranted && !isDenied && (
          <div style={styles.hintBanner}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
              stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round">
              <circle cx="12" cy="10" r="3"/>
              <path d="M12 2a8 8 0 0 1 8 8c0 5.25-8 12-8 12S4 15.25 4 10a8 8 0 0 1 8-8z"/>
            </svg>
            Location needed — will ask on send
          </div>
        )}

        {/* Denied hint */}
        {isNearMeQuery && isDenied && (
          <div style={{ ...styles.hintBanner, background: "#fef2f2", color: "#b91c1c", borderColor: "#fecaca" }}>
            ⚠️ Location blocked — enable it in browser settings for best results
          </div>
        )}

        {/* Main input row */}
        <div style={styles.inputRow}>

          {/* Location pin button */}
          <button
            style={{
              ...styles.pinBtn,
              color:      isGranted ? "#2563eb" : isDenied ? "#ef4444" : "#9ca3af",
              background: isGranted ? "#eff6ff" : "transparent",
            }}
            onClick={handleManualLocation}
            title={
              isGranted  ? "Location active"       :
              isDenied   ? "Location blocked"       :
              isRequesting ? "Getting location…"   :
              "Share your location"
            }
            type="button"
          >
            {isRequesting ? <PinSpinner /> : <PinIcon />}
          </button>

          {/* Text input */}
          <input
            ref={inputRef}
            style={styles.input}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            autoComplete="off"
          />

          {/* Send button */}
          <button
            style={{
              ...styles.sendBtn,
              opacity: (!hasText || disabled) ? 0.4 : 1,
              cursor:  (!hasText || disabled) ? "not-allowed" : "pointer",
            }}
            onClick={handleSubmit}
            disabled={!hasText || disabled}
            type="button"
            aria-label="Send message"
          >
            <SendIcon />
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Icon components ──────────────────────────────────────────────────────────
function PinIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="12" cy="10" r="3"/>
      <path d="M12 2a8 8 0 0 1 8 8c0 5.25-8 12-8 12S4 15.25 4 10a8 8 0 0 1 8-8z"/>
    </svg>
  );
}

function PinSpinner() {
  return (
    <span style={{
      display: "inline-block", width: 16, height: 16,
      border: "2px solid #bfdbfe", borderTopColor: "#2563eb",
      borderRadius: "50%", animation: "ogm-spin 0.7s linear infinite",
    }} />
  );
}

function SendIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13"/>
      <polygon points="22 2 15 22 11 13 2 9 22 2"/>
    </svg>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = {
  wrapper: {
    display: "flex", flexDirection: "column", gap: 6,
    padding: "10px 12px 12px",
    borderTop: "1px solid #e5e7eb",
    background: "#fff",
  },
  locationBanner: {
    display: "flex", alignItems: "center", gap: 6,
    fontSize: 12, color: "#15803d", fontWeight: 500,
    padding: "4px 10px",
    background: "#f0fdf4", borderRadius: 8,
    border: "1px solid #bbf7d0",
  },
  locationDot: {
    width: 7, height: 7, borderRadius: "50%",
    background: "#22c55e",
    boxShadow: "0 0 0 3px rgba(34,197,94,0.25)",
    flexShrink: 0,
    animation: "ogm-pulse 2s ease-in-out infinite",
  },
  accuracy: { marginLeft: "auto", opacity: 0.6, fontSize: 11 },
  hintBanner: {
    display: "flex", alignItems: "center", gap: 5,
    fontSize: 12, color: "#2563eb", fontWeight: 500,
    padding: "4px 10px",
    background: "#eff6ff", borderRadius: 8,
    border: "1px solid #bfdbfe",
  },
  inputRow: {
    display: "flex", alignItems: "center", gap: 8,
    background: "#f9fafb", borderRadius: 14,
    border: "1.5px solid #e5e7eb", padding: "6px 8px 6px 6px",
    transition: "border-color 0.15s",
  },
  pinBtn: {
    flexShrink: 0, width: 34, height: 34,
    border: "none", borderRadius: 10,
    display: "flex", alignItems: "center", justifyContent: "center",
    cursor: "pointer", transition: "all 0.15s",
    padding: 0,
  },
  input: {
    flex: 1, border: "none", background: "transparent",
    fontSize: 15, color: "#111827", outline: "none",
    padding: "2px 4px",
  },
  sendBtn: {
    flexShrink: 0, width: 36, height: 36,
    background: "linear-gradient(135deg, #1e3a5f, #2563eb)",
    border: "none", borderRadius: 10,
    display: "flex", alignItems: "center", justifyContent: "center",
    color: "#fff", transition: "opacity 0.15s",
    padding: 0,
  },
};

// Inject pulse animation
if (typeof document !== "undefined" && !document.getElementById("ogm-chat-anim")) {
  const s = document.createElement("style");
  s.id = "ogm-chat-anim";
  s.textContent = `@keyframes ogm-pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }`;
  document.head.appendChild(s);
}