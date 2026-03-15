import { useState, useEffect, useCallback, useRef } from "react";

/**
 * useGeolocation
 *
 * Manages the full browser Geolocation lifecycle:
 *  - Tracks permission state (unknown → granted / denied / prompt)
 *  - Caches last known position so we don't re-request unnecessarily
 *  - Exposes requestLocation() for on-demand triggering
 *  - Detects "near me" intent in any text string
 */

const CACHE_KEY   = "ogm_user_location";
const CACHE_TTL   = 10 * 60 * 1000; // 10 minutes

// Keywords that signal the user wants proximity-based search
const NEAR_ME_PATTERNS = [
  // "near me" variants
  /near\s+me/i,
  /near\s+by/i,          // "near by" with space
  /nearby/i,

  // "my location" variants — catches typos like "locatin", "locatoin"
  /my\s+(current\s+)?loc\w*/i,   // "my location", "my current locatin", "my loc"
  /what\s+is\s+my\s+loc\w*/i,    // "what is my location" / "what is my locatin"

  // distance radius
  /within\s+\d+\s*km/i,
  /\d+\s*km\s+(from|near|around)/i,

  // explicit proximity language
  /from\s+here/i,
  /close\s+to\s+me/i,
  /around\s+me/i,
  /properties\s+(here|around|close)/i,
  /find\s+.*(here|this\s+area)/i,

  // "show me what's around" phrasing
  /what(\'s|\s+is)\s+(around|nearby|near\s+me)/i,
  /show\s+.*(near(by)?|around\s+me)/i,
];

export function detectNearMeIntent(text) {
  if (!text) return false;
  return NEAR_ME_PATTERNS.some((p) => p.test(text));
}

/**
 * reverseGeocode
 * Converts GPS coordinates into a human-readable location name
 * using the Google Maps Geocoding API.
 *
 * Setup — add to your .env file:
 *   REACT_APP_GOOGLE_MAPS_API_KEY=your_key_here
 *
 * Enable "Geocoding API" in Google Cloud Console → APIs & Services.
 *
 * Returns the most specific useful address string, e.g.:
 *   "Koramangala 5th Block, Bengaluru, Karnataka, India"
 * or null on failure.
 */
export async function reverseGeocode(latitude, longitude) {
  const apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    console.warn("[OGM] REACT_APP_GOOGLE_MAPS_API_KEY is not set. Location name unavailable.");
    return null;
  }

  try {
    const url =
      `https://maps.googleapis.com/maps/api/geocode/json` +
      `?latlng=${latitude},${longitude}` +
      `&key=${apiKey}` +
      `&result_type=sublocality|locality|administrative_area_level_2`;

    const res = await fetch(url);
    if (!res.ok) return null;

    const data = await res.json();

    if (data.status !== "OK" || !data.results?.length) {
      console.warn("[OGM] Geocoding returned status:", data.status);
      return null;
    }

    // Google returns results from most-specific to least-specific.
    // Walk through until we find a clean sublocality + city combination.
    const best = data.results[0];
    const components = best.address_components || [];

    const get = (type) =>
      components.find((c) => c.types.includes(type))?.long_name ?? null;

    const sublocality  = get("sublocality_level_1") || get("sublocality") || get("neighborhood");
    const city         = get("locality") || get("administrative_area_level_2");
    const state        = get("administrative_area_level_1");
    const country      = get("country");

    const parts = [sublocality, city, state, country].filter(Boolean);
    return parts.length > 0 ? parts.join(", ") : best.formatted_address;

  } catch (err) {
    console.error("[OGM] Reverse geocoding failed:", err.message);
    return null;
  }
}

/** Haversine formula — returns distance in km between two lat/lng pairs */
export function haversineDistance(lat1, lng1, lat2, lng2) {
  if (lat1 == null || lng1 == null || lat2 == null || lng2 == null) return null;
  const R   = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Format a distance number into a readable string */
export function formatDistance(km) {
  if (km == null) return null;
  if (km < 1)   return `${Math.round(km * 1000)} m away`;
  if (km < 10)  return `${km.toFixed(1)} km away`;
  return `${Math.round(km)} km away`;
}

// ─────────────────────────────────────────────────────────────────────────────

export default function useGeolocation() {
  const [position,         setPosition]         = useState(null);   // {latitude, longitude, accuracy, locationName}
  const [locationName,     setLocationName]     = useState(null);   // reverse-geocoded place name
  const [permissionStatus, setPermissionStatus] = useState("unknown"); // unknown | prompt | granted | denied
  const [isRequesting,     setIsRequesting]     = useState(false);
  const [error,            setError]            = useState(null);
  const watchIdRef = useRef(null);

  // ── Restore cached position on mount ────────────────────────────────────
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(CACHE_KEY);
      if (raw) {
        const { data, ts } = JSON.parse(raw);
        if (Date.now() - ts < CACHE_TTL) {
          setPosition(data);
          if (data.locationName) setLocationName(data.locationName);
          setPermissionStatus("granted");
        }
      }
    } catch { /* ignore */ }

    // Check existing permission without prompting
    if ("permissions" in navigator) {
      navigator.permissions
        .query({ name: "geolocation" })
        .then((result) => {
          setPermissionStatus(result.state); // granted | denied | prompt
          result.onchange = () => setPermissionStatus(result.state);
        })
        .catch(() => {});
    }

    return () => {
      if (watchIdRef.current != null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  // ── Request location on demand ───────────────────────────────────────────
  const requestLocation = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setError("Your browser does not support geolocation.");
      setPermissionStatus("denied");
      return Promise.reject(new Error("Geolocation not supported"));
    }

    setIsRequesting(true);
    setError(null);

    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const data = {
            latitude:  pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy:  pos.coords.accuracy,
          };

          // Reverse geocode to get a human-readable location name.
          // Done here so every subsequent message has the name ready.
          const name = await reverseGeocode(data.latitude, data.longitude);
          const dataWithName = { ...data, locationName: name };

          setPosition(dataWithName);
          setLocationName(name);
          setPermissionStatus("granted");
          setIsRequesting(false);

          // Cache position + name together
          try {
            sessionStorage.setItem(
              CACHE_KEY,
              JSON.stringify({ data: dataWithName, ts: Date.now() })
            );
          } catch { /* storage full — ignore */ }

          resolve(dataWithName);
        },
        (err) => {
          setIsRequesting(false);
          if (err.code === 1) {
            // PERMISSION_DENIED
            setPermissionStatus("denied");
            setError("Location access was denied.");
          } else if (err.code === 2) {
            setError("Unable to determine your location. Please try again.");
          } else {
            setError("Location request timed out. Please try again.");
          }
          reject(err);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: CACHE_TTL }
      );
    });
  }, []);

  const clearLocation = useCallback(() => {
    setPosition(null);
    setLocationName(null);
    setError(null);
    try { sessionStorage.removeItem(CACHE_KEY); } catch { /* ignore */ }
  }, []);

  return {
    position,           // {latitude, longitude, accuracy, locationName} | null
    locationName,       // "Koramangala, Bengaluru, Karnataka, India" | null
    permissionStatus,   // "unknown" | "prompt" | "granted" | "denied"
    isRequesting,       // true while waiting for browser response
    error,              // string | null
    requestLocation,    // () => Promise<position>
    clearLocation,      // clear cached position
    isGranted: permissionStatus === "granted",
    isDenied:  permissionStatus === "denied",
  };
}