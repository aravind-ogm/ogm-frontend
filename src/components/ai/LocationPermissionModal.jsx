import { useEffect, useRef } from "react";
import useGeolocation from "./Usegeolocation";

const PERM_KEY = "ogm_location_granted";

export default function LocationPermissionModal({
  open,
  onClose,
  onLocationGranted,
  queryText = "",
}) {
  const { requestLocation, isRequesting, error, isDenied, position, isGranted } = useGeolocation();
  const overlayRef = useRef(null);

  /* ── If already granted (cached or hook) — skip modal, fire callback directly ── */
  useEffect(() => {
    if (!open) return;

    const cached = localStorage.getItem(PERM_KEY);
    if (cached) {
      try {
        const pos = JSON.parse(cached);
        onLocationGranted?.(pos);
        onClose();
        return;
      } catch { localStorage.removeItem(PERM_KEY); }
    }

    // Hook already has position (e.g. granted in a previous interaction this session)
    if (isGranted && position) {
      const pos = {
        latitude:  position.latitude,
        longitude: position.longitude,
        locationName: position.locationName ?? null,
      };
      localStorage.setItem(PERM_KEY, JSON.stringify(pos));
      onLocationGranted?.(pos);
      onClose();
    }
  }, [open, isGranted, position]); // eslint-disable-line

  // Close on backdrop click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.target === overlayRef.current) onClose(); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, onClose]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  const handleAllow = async () => {
    try {
      const pos = await requestLocation();
      // Cache so we never ask again
      const toCache = {
        latitude:     pos.latitude,
        longitude:    pos.longitude,
        locationName: pos.locationName ?? null,
      };
      localStorage.setItem(PERM_KEY, JSON.stringify(toCache));
      onLocationGranted?.(pos);
      onClose();
    } catch {
      // error is shown inside the modal
    }
  };

  return (
    <div ref={overlayRef} style={styles.overlay}>
      <div style={styles.modal} role="dialog" aria-modal="true" aria-labelledby="loc-title">

        {/* Close button */}
        <button style={styles.closeBtn} onClick={onClose} aria-label="Close">
          ✕
        </button>

        {/* Icon */}
        <div style={styles.iconWrap}>
          <div style={styles.iconRing}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none"
              stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="10" r="3"/>
              <path d="M12 2a8 8 0 0 1 8 8c0 5.25-8 12-8 12S4 15.25 4 10a8 8 0 0 1 8-8z"/>
            </svg>
          </div>
        </div>

        {/* Heading */}
        <h2 id="loc-title" style={styles.title}>
          Share your location?
        </h2>

        {/* Context — show what query triggered this */}
        {queryText && (
          <div style={styles.queryBubble}>
            <span style={styles.queryLabel}>Your search</span>
            <span style={styles.queryText}>"{queryText}"</span>
          </div>
        )}

        <p style={styles.body}>
          To find properties <strong>near you</strong>, OGM needs your current
          location. Your location is only used for this search and is never stored.
        </p>

        {/* Error / denied state */}
        {isDenied && (
          <div style={styles.deniedBox}>
            <span style={styles.deniedIcon}>⚠️</span>
            <div>
              <strong>Location access blocked</strong>
              <p style={styles.deniedText}>
                Enable location in your browser settings:
                <br />
                <em>Settings → Privacy → Location → Allow for this site</em>
              </p>
            </div>
          </div>
        )}

        {error && !isDenied && (
          <div style={{ ...styles.deniedBox, background: "#fff7ed", borderColor: "#fed7aa" }}>
            <span>⚠️</span>
            <span style={{ fontSize: 14 }}>{error}</span>
          </div>
        )}

        {/* Buttons */}
        <div style={styles.btnRow}>
          <button style={styles.cancelBtn} onClick={onClose}>
            Not now
          </button>
          <button
            style={{
              ...styles.allowBtn,
              opacity: isRequesting ? 0.7 : 1,
              cursor: isRequesting ? "wait" : "pointer",
            }}
            onClick={handleAllow}
            disabled={isRequesting || isDenied}
          >
            {isRequesting ? (
              <span style={styles.btnInner}>
                <Spinner /> Locating…
              </span>
            ) : (
              <span style={styles.btnInner}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <circle cx="12" cy="10" r="3"/>
                  <path d="M12 2a8 8 0 0 1 8 8c0 5.25-8 12-8 12S4 15.25 4 10a8 8 0 0 1 8-8z"/>
                </svg>
                Allow location
              </span>
            )}
          </button>
        </div>

        <p style={styles.privacy}>
          🔒 Location data is used only for this search session
        </p>
      </div>
    </div>
  );
}

// ─── Inline spinner ──────────────────────────────────────────────────────────
function Spinner() {
  return (
    <span style={{
      display: "inline-block",
      width: 14, height: 14,
      border: "2px solid rgba(255,255,255,0.4)",
      borderTopColor: "white",
      borderRadius: "50%",
      animation: "ogm-spin 0.7s linear infinite",
    }} />
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = {
  overlay: {
    position: "fixed", inset: 0,
    background: "rgba(0,0,0,0.55)",
    backdropFilter: "blur(4px)",
    WebkitBackdropFilter: "blur(4px)",
    display: "flex", alignItems: "center", justifyContent: "center",
    zIndex: 9999,
    animation: "ogm-fade-in 0.18s ease",
  },
  modal: {
    position: "relative",
    background: "#ffffff",
    borderRadius: 20,
    padding: "36px 32px 28px",
    maxWidth: 420, width: "calc(100% - 32px)",
    boxShadow: "0 24px 64px rgba(0,0,0,0.18), 0 4px 16px rgba(0,0,0,0.08)",
    textAlign: "center",
    animation: "ogm-slide-up 0.22s cubic-bezier(0.34,1.56,0.64,1)",
  },
  closeBtn: {
    position: "absolute", top: 14, right: 14,
    background: "#f3f4f6", border: "none",
    borderRadius: "50%", width: 30, height: 30,
    cursor: "pointer", fontSize: 13, color: "#6b7280",
    display: "flex", alignItems: "center", justifyContent: "center",
    lineHeight: 1,
  },
  iconWrap: { display: "flex", justifyContent: "center", marginBottom: 16 },
  iconRing: {
    width: 64, height: 64, borderRadius: "50%",
    background: "linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)",
    display: "flex", alignItems: "center", justifyContent: "center",
    boxShadow: "0 8px 24px rgba(37,99,235,0.35)",
  },
  title: {
    margin: "0 0 12px",
    fontSize: 22, fontWeight: 700,
    color: "#111827", letterSpacing: "-0.3px",
  },
  queryBubble: {
    display: "inline-flex", flexDirection: "column", gap: 2,
    background: "#f0f7ff", border: "1px solid #bfdbfe",
    borderRadius: 10, padding: "8px 14px",
    marginBottom: 14, textAlign: "left",
  },
  queryLabel: { fontSize: 11, color: "#3b82f6", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" },
  queryText:  { fontSize: 14, color: "#1e40af", fontWeight: 500 },
  body: {
    fontSize: 15, color: "#4b5563", lineHeight: 1.6,
    margin: "0 0 20px",
  },
  deniedBox: {
    display: "flex", gap: 10, alignItems: "flex-start",
    background: "#fef2f2", border: "1px solid #fecaca",
    borderRadius: 10, padding: "12px 14px",
    marginBottom: 16, textAlign: "left",
    fontSize: 13, color: "#991b1b",
  },
  deniedIcon: { fontSize: 18, flexShrink: 0 },
  deniedText: { margin: "4px 0 0", color: "#7f1d1d", fontSize: 12, lineHeight: 1.5 },
  btnRow: { display: "flex", gap: 10, marginBottom: 14 },
  cancelBtn: {
    flex: 1, padding: "12px 0",
    background: "#f3f4f6", border: "none",
    borderRadius: 12, fontSize: 15, fontWeight: 600,
    color: "#374151", cursor: "pointer",
    transition: "background 0.15s",
  },
  allowBtn: {
    flex: 2, padding: "12px 0",
    background: "linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)",
    border: "none", borderRadius: 12,
    fontSize: 15, fontWeight: 600, color: "#fff",
    cursor: "pointer", transition: "opacity 0.15s",
  },
  btnInner: { display: "flex", alignItems: "center", justifyContent: "center", gap: 6 },
  privacy: { fontSize: 12, color: "#9ca3af", margin: 0 },
};

// Inject keyframe animations once
if (typeof document !== "undefined" && !document.getElementById("ogm-loc-anim")) {
  const style = document.createElement("style");
  style.id = "ogm-loc-anim";
  style.textContent = `
    @keyframes ogm-fade-in  { from { opacity:0 } to { opacity:1 } }
    @keyframes ogm-slide-up { from { opacity:0; transform:translateY(24px) scale(0.96) } to { opacity:1; transform:translateY(0) scale(1) } }
    @keyframes ogm-spin     { to { transform: rotate(360deg) } }
  `;
  document.head.appendChild(style);
}