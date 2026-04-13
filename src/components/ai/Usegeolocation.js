import { useState, useEffect, useCallback, useRef } from "react";

/**
 * useGeolocation — Full browser Geolocation lifecycle manager
 *
 * Improvements over original:
 *  1. Reads cached position from localStorage on mount (set by LocationPermissionModal)
 *     so `isGranted + position` are immediately available after first grant.
 *  2. Proper debug logging via LOG_PREFIX.
 *  3. Longer timeout (15s) + better error messages.
 *  4. `detectNearMeIntent` patterns fixed — does NOT trigger for named-location
 *     radius queries like "within 10 km from Whitefield".
 */

const SESSION_KEY = "ogm_user_location";   // sessionStorage — used by hook
const PERM_KEY    = "ogm_location_granted"; // localStorage  — set by LocationPermissionModal
const CACHE_TTL   = 10 * 60 * 1000;        // 10 minutes
const LOG_PREFIX  = "[OGM Location]";

// ─────────────────────────────────────────────────────────────────────────────
//  detectNearMeIntent
//  Returns true ONLY when the user is asking to use THEIR OWN GPS location.
//  Does NOT fire for named-location radius queries like "within 10 km from Whitefield".
// ─────────────────────────────────────────────────────────────────────────────

const NEAR_ME_PATTERNS = [
  // "near me" / "nearby" / "near by"
  /near\s+me/i,
  /near\s+by/i,
  /nearby/i,

  // "my location" variants — catches common typos
  /my\s+(current\s+)?loc\w*/i,
  /what\s+is\s+my\s+loc\w*/i,
  /where\s+am\s+i/i,

  // "within X km from ME / from HERE / from MY location"
  // ✅ "within 15 km from my current location"
  // ❌ "within 10 km from Whitefield"  ← does NOT match
  /within\s+\d+\s*km\s+(from\s+(me|here|my)|near\s+me|of\s+me)/i,

  // "X km from me / from here / from my location"
  /\d+\s*km\s+(from\s+(me|here|my\s+\w*)|near\s+me|around\s+me)/i,

  // explicit proximity language
  /from\s+here/i,
  /close\s+to\s+me/i,
  /around\s+me/i,
  /properties\s+(here|around|close)/i,
  /find\s+.*(here|this\s+area)/i,
  /what('s|\s+is)\s+(around|nearby|near\s+me)/i,
  /show\s+.*(near(by)?|around\s+me)/i,
];

export function detectNearMeIntent(text) {
  if (!text) return false;
  const result = NEAR_ME_PATTERNS.some((p) => p.test(text));
  if (result) console.debug(LOG_PREFIX, "Near-me intent detected for:", text);
  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
//  reverseGeocode — lat/lng → human-readable location name
// ─────────────────────────────────────────────────────────────────────────────

export async function reverseGeocode(latitude, longitude) {
  const apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    console.warn(LOG_PREFIX, "REACT_APP_GOOGLE_MAPS_API_KEY not set — location name unavailable.");
    return null;
  }
  try {
    const url =
        `https://maps.googleapis.com/maps/api/geocode/json` +
        `?latlng=${latitude},${longitude}` +
        `&key=${apiKey}` +
        `&result_type=sublocality|locality|administrative_area_level_2`;

    const res = await fetch(url);
    if (!res.ok) { console.warn(LOG_PREFIX, "Geocode HTTP error:", res.status); return null; }

    const data = await res.json();
    if (data.status !== "OK" || !data.results?.length) {
      console.warn(LOG_PREFIX, "Geocoding status:", data.status);
      return null;
    }

    const components = data.results[0].address_components || [];
    const get = (type) => components.find((c) => c.types.includes(type))?.long_name ?? null;

    const sublocality = get("sublocality_level_1") || get("sublocality") || get("neighborhood");
    const city        = get("locality") || get("administrative_area_level_2");
    const state       = get("administrative_area_level_1");
    const country     = get("country");

    const name = [sublocality, city, state, country].filter(Boolean).join(", ")
        || data.results[0].formatted_address;

    console.info(LOG_PREFIX, "Reverse geocoded to:", name);
    return name;
  } catch (err) {
    console.error(LOG_PREFIX, "Reverse geocoding failed:", err.message);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  haversineDistance / formatDistance
// ─────────────────────────────────────────────────────────────────────────────

export function haversineDistance(lat1, lng1, lat2, lng2) {
  if (lat1 == null || lng1 == null || lat2 == null || lng2 == null) return null;
  const R    = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function formatDistance(km) {
  if (km == null) return null;
  if (km < 1)   return `${Math.round(km * 1000)} m away`;
  if (km < 10)  return `${km.toFixed(1)} km away`;
  return `${Math.round(km)} km away`;
}

// ─────────────────────────────────────────────────────────────────────────────
//  useGeolocation hook
// ─────────────────────────────────────────────────────────────────────────────

export default function useGeolocation() {
  const [position,         setPosition]         = useState(null);
  const [locationName,     setLocationName]     = useState(null);
  const [permissionStatus, setPermissionStatus] = useState("unknown");
  const [isRequesting,     setIsRequesting]     = useState(false);
  const [error,            setError]            = useState(null);
  const watchIdRef = useRef(null);

  // ── On mount: restore cached position ──────────────────────────────────────
  useEffect(() => {
    // Priority 1: sessionStorage cache (most recent session position)
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      if (raw) {
        const { data, ts } = JSON.parse(raw);
        if (Date.now() - ts < CACHE_TTL && data?.latitude && data?.longitude) {
          console.info(LOG_PREFIX, "Restored from sessionStorage cache:", data.locationName || "no name");
          setPosition(data);
          if (data.locationName) setLocationName(data.locationName);
          setPermissionStatus("granted");
          return; // no need to check localStorage
        } else {
          sessionStorage.removeItem(SESSION_KEY);
        }
      }
    } catch { /* ignore */ }

    // Priority 2: localStorage persistent grant (set by LocationPermissionModal)
    // This is the KEY fix — after first grant, subsequent queries don't need the modal.
    try {
      const raw = localStorage.getItem(PERM_KEY);
      if (raw) {
        const pos = JSON.parse(raw);
        if (pos?.latitude && pos?.longitude) {
          console.info(LOG_PREFIX, "Restored from localStorage grant:", pos.locationName || "no name");
          const data = { ...pos, accuracy: null };
          setPosition(data);
          if (pos.locationName) setLocationName(pos.locationName);
          setPermissionStatus("granted");
          // Also write to sessionStorage for faster access
          try {
            sessionStorage.setItem(SESSION_KEY, JSON.stringify({ data, ts: Date.now() }));
          } catch { /* ignore */ }
        }
      }
    } catch { /* ignore */ }

    // Check browser permission state without prompting
    if ("permissions" in navigator) {
      navigator.permissions
          .query({ name: "geolocation" })
          .then((result) => {
            console.debug(LOG_PREFIX, "Browser permission state:", result.state);
            // Only set if we don't already have a cached granted state
            if (result.state !== "granted") {
              setPermissionStatus(result.state);
            }
            result.onchange = () => {
              console.info(LOG_PREFIX, "Permission changed to:", result.state);
              setPermissionStatus(result.state);
              // If revoked, clear cache
              if (result.state === "denied") {
                try { localStorage.removeItem(PERM_KEY); } catch { /* ignore */ }
                try { sessionStorage.removeItem(SESSION_KEY); } catch { /* ignore */ }
                setPosition(null);
                setLocationName(null);
              }
            };
          })
          .catch(() => {});
    }

    return () => {
      if (watchIdRef.current != null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  // ── requestLocation — request GPS on demand ─────────────────────────────────
  const requestLocation = useCallback(() => {
    if (!("geolocation" in navigator)) {
      const msg = "Your browser does not support geolocation.";
      console.error(LOG_PREFIX, msg);
      setError(msg);
      setPermissionStatus("denied");
      return Promise.reject(new Error("Geolocation not supported"));
    }

    setIsRequesting(true);
    setError(null);
    console.info(LOG_PREFIX, "Requesting GPS location from browser...");

    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
          async (pos) => {
            console.info(LOG_PREFIX, "GPS obtained — accuracy:", pos.coords.accuracy?.toFixed(0), "m");

            const data = {
              latitude:  pos.coords.latitude,
              longitude: pos.coords.longitude,
              accuracy:  pos.coords.accuracy,
            };

            // Reverse geocode to get human-readable name
            const name = await reverseGeocode(data.latitude, data.longitude);
            const dataWithName = { ...data, locationName: name };

            setPosition(dataWithName);
            setLocationName(name);
            setPermissionStatus("granted");
            setIsRequesting(false);

            // Cache in sessionStorage (10 min TTL)
            try {
              sessionStorage.setItem(SESSION_KEY, JSON.stringify({ data: dataWithName, ts: Date.now() }));
            } catch { /* storage full */ }

            console.info(LOG_PREFIX, "Location ready:", name || `${data.latitude.toFixed(4)}, ${data.longitude.toFixed(4)}`);
            resolve(dataWithName);
          },
          (err) => {
            setIsRequesting(false);
            let msg;
            switch (err.code) {
              case 1: // PERMISSION_DENIED
                msg = "Location access was denied. Please enable it in browser settings.";
                setPermissionStatus("denied");
                // Clear cached grant since user denied
                try { localStorage.removeItem(PERM_KEY); } catch { /* ignore */ }
                break;
              case 2: // POSITION_UNAVAILABLE
                msg = "Unable to determine your location. Check GPS signal and try again.";
                break;
              case 3: // TIMEOUT
                msg = "Location request timed out. Please try again.";
                break;
              default:
                msg = "Location request failed. Please try again.";
            }
            console.warn(LOG_PREFIX, "GPS error code", err.code, "—", msg);
            setError(msg);
            reject(err);
          },
          {
            enableHighAccuracy: true,
            timeout:    15000,   // 15s (up from 10s — mobile GPS can be slow)
            maximumAge: CACHE_TTL,
          }
      );
    });
  }, []);

  const clearLocation = useCallback(() => {
    setPosition(null);
    setLocationName(null);
    setError(null);
    try { sessionStorage.removeItem(SESSION_KEY); } catch { /* ignore */ }
    try { localStorage.removeItem(PERM_KEY); } catch { /* ignore */ }
    console.info(LOG_PREFIX, "Location cache cleared.");
  }, []);

  return {
    position,           // {latitude, longitude, accuracy, locationName} | null
    locationName,       // "Koramangala, Bengaluru, Karnataka, India" | null
    permissionStatus,   // "unknown" | "prompt" | "granted" | "denied"
    isRequesting,       // true while waiting for browser GPS response
    error,              // string | null
    requestLocation,    // () => Promise<position>
    clearLocation,      // clears all cached location data
    isGranted: permissionStatus === "granted",
    isDenied:  permissionStatus === "denied",
  };
}