import { useState, useEffect, useRef } from "react";

/**
 * PropertyDistanceBadge
 *
 * Shows DRIVING distance using Google Maps DistanceMatrixService
 * (uses the already-loaded Maps JS SDK — no extra API cost beyond what you pay).
 *
 * Results are cached in a module-level Map so the same origin→destination
 * pair is only ever calculated once per page session.
 */

// Module-level cache: "lat,lng→lat,lng" → "12 km" | "800 m"
const distanceCache = new Map();

function makeCacheKey(uLat, uLng, pLat, pLng) {
  // Round to 4dp so tiny GPS drift doesn't bust the cache
  return `${(+uLat).toFixed(4)},${(+uLng).toFixed(4)}`
      + `→${(+pLat).toFixed(4)},${(+pLng).toFixed(4)}`;
}

function getUrgencyStyle(text) {
  if (!text) return { background: "#f3f4f6", color: "#6b7280" };
  const match = text.match(/([\d.]+)\s*(km|m)/i);
  if (!match) return { background: "#f3f4f6", color: "#6b7280" };
  const value = parseFloat(match[1]);
  const unit  = match[2].toLowerCase();
  const km    = unit === "km" ? value : value / 1000;
  if (km <= 2)  return { background: "#dcfce7", color: "#166534" }; // green
  if (km <= 10) return { background: "#dbeafe", color: "#1e40af" }; // blue
  return          { background: "#f3f4f6", color: "#6b7280" };      // grey
}

export default function PropertyDistanceBadge({
                                                userLat,
                                                userLng,
                                                propLat,
                                                propLng,
                                                style = {},
                                              }) {
  const [label,   setLabel]   = useState(null);
  const [loading, setLoading] = useState(false);
  const didFetch = useRef(false);

  useEffect(() => {
    // All 4 coords must be valid numbers
    if (userLat == null || userLng == null ||
        propLat == null || propLng == null) return;

    const uLat = parseFloat(userLat), uLng = parseFloat(userLng);
    const pLat = parseFloat(propLat), pLng = parseFloat(propLng);
    if ([uLat, uLng, pLat, pLng].some(isNaN)) return;
    if (uLat === 0 && uLng === 0) return;
    if (pLat === 0 && pLng === 0) return;

    const key = makeCacheKey(uLat, uLng, pLat, pLng);

    // Serve from cache immediately — no spinner
    if (distanceCache.has(key)) {
      setLabel(distanceCache.get(key));
      return;
    }

    // Only call once per mount
    if (didFetch.current) return;
    didFetch.current = true;

    // Wait for Google Maps SDK to be ready
    const waitForSDK = (cb) => {
      if (typeof window.google?.maps?.DistanceMatrixService === "function") {
        cb(); return;
      }
      const t = setInterval(() => {
        if (typeof window.google?.maps?.DistanceMatrixService === "function") {
          clearInterval(t); cb();
        }
      }, 150);
      // Give up after 5 s
      setTimeout(() => clearInterval(t), 5000);
    };

    setLoading(true);

    waitForSDK(() => {
      const service = new window.google.maps.DistanceMatrixService();
      service.getDistanceMatrix(
          {
            origins:      [new window.google.maps.LatLng(uLat, uLng)],
            destinations: [new window.google.maps.LatLng(pLat, pLng)],
            travelMode:   window.google.maps.TravelMode.DRIVING,
            unitSystem:   window.google.maps.UnitSystem.METRIC,
          },
          (response, status) => {
            setLoading(false);
            if (status !== "OK") return;

            const element = response?.rows?.[0]?.elements?.[0];
            if (!element || element.status !== "OK") return;

            const text = element.distance?.text ?? null; // e.g. "3.2 km", "850 m"
            if (text) {
              distanceCache.set(key, text);
              setLabel(text);
            }
          }
      );
    });
  }, [userLat, userLng, propLat, propLng]);

  // Nothing to show
  if (!label && !loading) return null;

  const urgency = getUrgencyStyle(label);

  return (
      <span style={{
        display: "inline-flex", alignItems: "center", gap: 4,
        padding: "3px 8px", borderRadius: 20,
        fontSize: 12, fontWeight: 600, letterSpacing: "0.1px",
        whiteSpace: "nowrap",
        ...urgency,
        ...style,
      }}>
      {loading ? (
          <>
          <span style={{
            display: "inline-block", width: 10, height: 10,
            border: "1.5px solid currentColor", borderTopColor: "transparent",
            borderRadius: "50%", animation: "ogm-spin 0.7s linear infinite",
            opacity: 0.5,
          }} />
            <span style={{ opacity: 0.5 }}>…</span>
          </>
      ) : (
          <>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
                 style={{ flexShrink: 0 }}>
              <circle cx="12" cy="10" r="3"/>
              <path d="M12 2a8 8 0 0 1 8 8c0 5.25-8 12-8 12S4 15.25 4 10a8 8 0 0 1 8-8z"/>
            </svg>
            {label} away
          </>
      )}
    </span>
  );
}