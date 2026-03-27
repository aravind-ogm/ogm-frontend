/**
 * useNearbyPlaces.js
 *
 * Custom hook that fetches nearby places from the Google Places API
 * (Nearby Search) using a property's lat/lng.
 *
 * Features:
 *  - Searches for 10 category types within 5 km
 *  - Returns up to 3 results per category (configurable)
 *  - Computes straight-line distance from property
 *  - Builds photo URLs from Places photo references
 *  - Caches results in sessionStorage (free on repeat visits same session)
 *  - Returns { places, loading, error } — drops straight into <NearbyLocations />
 *
 * Usage:
 *   const { places, loading, error } = useNearbyPlaces(property.latitude, property.longitude);
 *   <NearbyLocations locations={places} ... />
 */

import { useState, useEffect, useRef } from 'react';

/* ─── Categories to search ───────────────────────────────────────────────────
   Each entry maps a Google Places type → a display label that matches
   the category keys already used in utils.jsx (CATEGORY_COLOURS / FILTER_CATEGORIES).
──────────────────────────────────────────────────────────────────────────── */
const SEARCH_CATEGORIES = [
  { type: 'hospital',      label: 'Hospital'     },
  { type: 'school',        label: 'School'       },
  { type: 'restaurant',    label: 'Restaurant'   },
  { type: 'gym',           label: 'Gym'          },
  { type: 'shopping_mall', label: 'Mall'         },
  { type: 'park',          label: 'Park'         },
  { type: 'subway_station',label: 'Metro'        },
  { type: 'supermarket',   label: 'Supermarket'  },
  { type: 'cafe',          label: 'Cafe'         },
  { type: 'hindu_temple',  label: 'Temple'       },
];

const RADIUS_METERS   = 5000;  // 5 km search radius
const MAX_PER_CATEGORY = 3;    // max results per category
const PHOTO_MAX_WIDTH  = 600;  // px for Place photo URLs

/* ─── Haversine distance (straight line, in km) ──────────────────────────── */
function haversineKm(lat1, lng1, lat2, lng2) {
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

function formatDistanceKm(km) {
  return km < 1
      ? `${Math.round(km * 1000)} m`
      : `${km.toFixed(1)} km`;
}

/* ─── Build Google Places photo URL ─────────────────────────────────────── */
function photoUrl(photoReference, apiKey) {
  return (
      `https://maps.googleapis.com/maps/api/place/photo` +
      `?maxwidth=${PHOTO_MAX_WIDTH}` +
      `&photoreference=${photoReference}` +
      `&key=${apiKey}`
  );
}

/**
 * Safely extract a photo URL from a Places API photos array.
 *
 * The JS Places SDK returns photo objects with a `.getUrl()` method.
 * The REST / serialised responses return a raw `photo_reference` string.
 * This helper handles both cases cleanly.
 */
function getPlacePhotoUrl(photos, apiKey) {
  if (!photos || photos.length === 0) return null;
  const photo = photos[0];

  // JS SDK path — getUrl() returns a direct CDN URL, no key needed
  if (typeof photo.getUrl === 'function') {
    try {
      return photo.getUrl({ maxWidth: PHOTO_MAX_WIDTH });
    } catch {
      return null;
    }
  }

  // Serialised / REST path — build the Places photo endpoint URL
  if (photo.photo_reference) {
    return photoUrl(photo.photo_reference, apiKey);
  }

  return null;
}

/* ─── sessionStorage cache helpers ──────────────────────────────────────── */
const CACHE_PREFIX = 'ogm_nearby_v2_'; // bump version to bust old null-image cache

function cacheGet(lat, lng) {
  try {
    const key  = `${CACHE_PREFIX}${lat.toFixed(4)}_${lng.toFixed(4)}`;
    const raw  = sessionStorage.getItem(key);
    if (!raw) return null;
    const { ts, data } = JSON.parse(raw);
    // Expire after 30 minutes
    if (Date.now() - ts > 30 * 60 * 1000) { sessionStorage.removeItem(key); return null; }
    return data;
  } catch { return null; }
}

function cacheSet(lat, lng, data) {
  try {
    const key = `${CACHE_PREFIX}${lat.toFixed(4)}_${lng.toFixed(4)}`;
    sessionStorage.setItem(key, JSON.stringify({ ts: Date.now(), data }));
  } catch { /* sessionStorage full — silent */ }
}

/* ═══════════════════════════════════════════════════════════════════════════
   Hook
═══════════════════════════════════════════════════════════════════════════ */
export default function useNearbyPlaces(lat, lng) {
  const [places,  setPlaces]  = useState([]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);
  const cancelledRef = useRef(false);

  useEffect(() => {
    // Need valid coordinates and Google Maps SDK loaded
    if (!lat || !lng || isNaN(lat) || isNaN(lng)) return;

    cancelledRef.current = false;

    /* ── 1. Return cached result immediately if available ── */
    const cached = cacheGet(lat, lng);
    if (cached) {
      setPlaces(cached);
      return;
    }

    /* ── 2. Wait for Google Maps SDK (NearbyMap may already be loading it) ── */
    const waitForSdk = () =>
        new Promise((resolve, reject) => {
          if (window.google?.maps?.places?.PlacesService) { resolve(); return; }
          let attempts = 0;
          const t = setInterval(() => {
            if (window.google?.maps?.places?.PlacesService) { clearInterval(t); resolve(); }
            if (++attempts > 50) { clearInterval(t); reject(new Error('Maps SDK timeout')); }
          }, 200);
        });

    const run = async () => {
      setLoading(true);
      setError(null);

      try {
        await waitForSdk();
        if (cancelledRef.current) return;

        const apiKey   = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
        const location = new window.google.maps.LatLng(lat, lng);

        // PlacesService needs a map or a DOM element
        const dummyDiv = document.createElement('div');
        const service  = new window.google.maps.places.PlacesService(dummyDiv);

        /* ── 3. Search each category in parallel ── */
        const searchCategory = ({ type, label }) =>
            new Promise((resolve) => {
              service.nearbySearch(
                  {
                    location,
                    radius:  RADIUS_METERS,
                    type,
                  },
                  (results, status) => {
                    const S = window.google.maps.places.PlacesServiceStatus;
                    if (status !== S.OK && status !== S.ZERO_RESULTS) {
                      console.warn(`Places search failed for ${type}:`, status);
                      resolve([]);
                      return;
                    }

                    const places = (results || [])
                        .slice(0, MAX_PER_CATEGORY)
                        .map((place, idx) => {
                          const placeLat = place.geometry.location.lat();
                          const placeLng = place.geometry.location.lng();
                          const distKm   = haversineKm(lat, lng, placeLat, placeLng);

                          return {
                            // stable id — place_id is unique per Google place
                            id:       place.place_id,
                            name:     place.name,
                            category: label,
                            distance: formatDistanceKm(distKm),
                            latitude:  placeLat,
                            longitude: placeLng,
                            rating:   place.rating || null,
                            address:  place.vicinity || null,
                            isOpen:   place.opening_hours?.isOpen?.() ?? null,
                            image:    getPlacePhotoUrl(place.photos, apiKey),
                            // _index is set after merging all categories
                          };
                        });

                    resolve(places);
                  }
              );
            });

        const allResults = await Promise.all(
            SEARCH_CATEGORIES.map(searchCategory)
        );

        if (cancelledRef.current) return;

        // Flatten, deduplicate by place_id, add stable _index
        const seen    = new Set();
        const merged  = allResults
            .flat()
            .filter((p) => {
              if (seen.has(p.id)) return false;
              seen.add(p.id);
              return true;
            })
            .map((p, i) => ({ ...p, _index: i }));

        cacheSet(lat, lng, merged);
        setPlaces(merged);
      } catch (err) {
        if (!cancelledRef.current) {
          console.error('useNearbyPlaces error:', err);
          setError(err.message);
        }
      } finally {
        if (!cancelledRef.current) setLoading(false);
      }
    };

    run();
    return () => { cancelledRef.current = true; };
  }, [lat, lng]);

  return { places, loading, error };
}