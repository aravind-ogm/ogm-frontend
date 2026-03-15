import { haversineDistance, formatDistance } from "./Usegeolocation";

/**
 * PropertyDistanceBadge
 *
 * Renders a small pill showing the distance from the user's location
 * to a specific property. Drops in as a one-liner onto any property card.
 *
 * Usage:
 *   <PropertyDistanceBadge
 *     userLat={position.latitude}
 *     userLng={position.longitude}
 *     propLat={property.latitude}
 *     propLng={property.longitude}
 *   />
 */
export default function PropertyDistanceBadge({
  userLat,
  userLng,
  propLat,
  propLng,
  style = {},
}) {
  // Don't render if any coordinate is missing
  if (userLat == null || userLng == null || propLat == null || propLng == null) {
    return null;
  }

  const km      = haversineDistance(userLat, userLng, propLat, propLng);
  const label   = formatDistance(km);
  const urgency = getUrgency(km);

  if (!label) return null;

  return (
    <span style={{ ...badgeBase, ...urgencyStyles[urgency], ...style }}>
      <svg
        width="11" height="11" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
        style={{ flexShrink: 0 }}
      >
        <circle cx="12" cy="10" r="3"/>
        <path d="M12 2a8 8 0 0 1 8 8c0 5.25-8 12-8 12S4 15.25 4 10a8 8 0 0 1 8-8z"/>
      </svg>
      {label}
    </span>
  );
}

// ─── Distance urgency tiers ───────────────────────────────────────────────────
function getUrgency(km) {
  if (km == null) return "far";
  if (km <= 2)  return "close";
  if (km <= 10) return "near";
  return "far";
}

const badgeBase = {
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  padding: "3px 8px",
  borderRadius: 20,
  fontSize: 12,
  fontWeight: 600,
  letterSpacing: "0.1px",
  whiteSpace: "nowrap",
};

const urgencyStyles = {
  close: { background: "#dcfce7", color: "#166534" },  // green  — ≤ 2 km
  near:  { background: "#dbeafe", color: "#1e40af" },  // blue   — ≤ 10 km
  far:   { background: "#f3f4f6", color: "#6b7280" },  // grey   — > 10 km
};