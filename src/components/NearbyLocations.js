import React, { useState, useEffect, useRef, useCallback, memo } from "react";
import { MapPin, Share2, Bookmark, Navigation } from "lucide-react";
import "../styles/NearbyLocations.css";

/* ─── Google Maps API key ──────────────────────────────────────────────────── */
const GMAPS_KEY =
  process.env.REACT_APP_GOOGLE_MAPS_API_KEY ||
  "AIzaSyAMOnmpGRW9d36CNRQTjAavV4EjHGlXzO4";

/* Load SDK once — reuse same promise pattern used in AiChatBox */
function loadGoogleMaps() {
  if (typeof window.google?.maps?.Map === "function") return Promise.resolve();

  if (document.getElementById("gmaps-sdk")) {
    return new Promise((resolve) => {
      const t = setInterval(() => {
        if (typeof window.google?.maps?.Map === "function") {
          clearInterval(t);
          resolve();
        }
      }, 100);
    });
  }

  return new Promise((resolve, reject) => {
    const script   = document.createElement("script");
    script.id      = "gmaps-sdk";
    script.src     = `https://maps.googleapis.com/maps/api/js?key=${GMAPS_KEY}&libraries=places`;
    script.async   = true;
    script.defer   = true;
    script.onload  = resolve;
    script.onerror = () => reject(new Error("Failed to load Google Maps"));
    document.head.appendChild(script);
  });
}

/* ─────────────────────────────────────────────────────────────────────────── */

export default function NearbyLocations({ locations = [], propertyLocation = "" }) {
  if (!locations.length) return null;

  return (
    <div className="nearby-section">
      <h2 className="nearby-title">Nearby Highlights</h2>

      {/* ── Interactive map showing all nearby pins ── */}
      <NearbyMap locations={locations} propertyLocation={propertyLocation} />

      {/* ── Cards grid ── */}
      <div className="nearby-grid">
        {locations.map((item, index) => (
          <NearbyCard key={item.id ?? index} item={item} />
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   GOOGLE MAP — highlights all nearby locations with numbered
   markers + property pin. Every marker and the map background
   are clickable and open Google Maps directly.
   ═══════════════════════════════════════════════════════════════ */

/* Category → colour map so each type gets a distinct colour */
const CATEGORY_COLOURS = {
  restaurant: "#f97316",  // orange
  play:       "#8b5cf6",  // purple
  school:     "#0ea5e9",  // blue
  hospital:   "#ef4444",  // red
  mall:       "#ec4899",  // pink
  park:       "#22c55e",  // green
  gym:        "#f59e0b",  // amber
  cafe:       "#a16207",  // brown
  default:    "#2563eb",  // brand blue
};

function categoryColour(cat) {
  if (!cat) return CATEGORY_COLOURS.default;
  const key = cat.toLowerCase();
  return Object.keys(CATEGORY_COLOURS).find((k) => key.includes(k))
    ? CATEGORY_COLOURS[Object.keys(CATEGORY_COLOURS).find((k) => key.includes(k))]
    : CATEGORY_COLOURS.default;
}

/* Opens Google Maps directions/search in a new tab */
function openInGoogleMaps(lat, lng, name) {
  const url = lat && lng
    ? `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name)}`;
  window.open(url, "_blank", "noopener,noreferrer");
}

function NearbyMap({ locations, propertyLocation }) {
  const containerRef = useRef(null);
  const mapRef       = useRef(null);
  const markersRef   = useRef([]);
  const infoWinRef   = useRef(null);
  const [mapsReady, setMapsReady] = useState(typeof window.google?.maps?.Map === "function");
  const [mapError,  setMapError]  = useState(false);

  /* Load SDK */
  useEffect(() => {
    if (mapsReady) return;
    loadGoogleMaps()
      .then(() => setMapsReady(true))
      .catch(() => setMapError(true));
  }, [mapsReady]);

  /* Build map once SDK is ready */
  useEffect(() => {
    if (!mapsReady || !containerRef.current || mapRef.current) return;

    const G = window.google.maps;

    const map = new G.Map(containerRef.current, {
      zoom:              13,
      center:            { lat: 12.9716, lng: 77.5946 },
      mapTypeControl:    false,
      streetViewControl: false,
      fullscreenControl: true,
      zoomControl:       true,
      // Slightly cleaner map style
      styles: [
        { featureType: "poi.business", stylers: [{ visibility: "off" }] },
        { featureType: "transit",      stylers: [{ visibility: "simplified" }] },
      ],
    });
    mapRef.current = map;

    const infoWindow = new G.InfoWindow();
    infoWinRef.current = infoWindow;

    const bounds = new G.LatLngBounds();
    const newMarkers = [];

    // ── Clicking the map background itself opens Google Maps ──────────────
    map.addListener("click", () => {
      const c = map.getCenter();
      window.open(
        `https://www.google.com/maps/@${c.lat()},${c.lng()},15z`,
        "_blank",
        "noopener,noreferrer"
      );
    });

    // ── Nearby location markers — numbered, colour-coded by category ──────
    locations.forEach((loc, i) => {
      const lat = parseFloat(loc.latitude ?? loc.lat);
      const lng = parseFloat(loc.longitude ?? loc.lng);
      if (isNaN(lat) || isNaN(lng)) return;

      const colour = categoryColour(loc.category);
      const num    = String(i + 1);

      // Numbered circle using a data-URI SVG — much more visible than SymbolPath.CIRCLE
      const svgIcon = `
        <svg xmlns="http://www.w3.org/2000/svg" width="36" height="44" viewBox="0 0 36 44">
          <!-- Shadow -->
          <ellipse cx="18" cy="42" rx="8" ry="3" fill="rgba(0,0,0,0.18)"/>
          <!-- Pin body -->
          <path d="M18 2C10.268 2 4 8.268 4 16c0 9 14 26 14 26S32 25 32 16C32 8.268 25.732 2 18 2z"
                fill="${colour}" stroke="white" stroke-width="2"/>
          <!-- Number -->
          <text x="18" y="20" text-anchor="middle" dominant-baseline="middle"
                font-family="sans-serif" font-size="13" font-weight="700" fill="white">${num}</text>
        </svg>`;

      const icon = {
        url:        "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svgIcon),
        scaledSize: new G.Size(36, 44),
        anchor:     new G.Point(18, 44),
      };

      const marker = new G.Marker({
        position:  { lat, lng },
        map,
        title:     loc.name,
        icon,
        animation: G.Animation.DROP,
        zIndex:    i + 1,
      });

      // Click marker → show InfoWindow with "Open in Google Maps" link
      marker.addListener("click", () => {
        infoWindow.setContent(`
          <div style="font-family:sans-serif;padding:6px 4px;min-width:180px;">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
              <span style="background:${colour};color:#fff;border-radius:50%;width:22px;height:22px;
                display:inline-flex;align-items:center;justify-content:center;
                font-size:12px;font-weight:700;flex-shrink:0;">${num}</span>
              <strong style="font-size:13px;color:#0f172a;">${loc.name}</strong>
            </div>
            ${loc.category
              ? `<span style="background:${colour}22;color:${colour};padding:2px 10px;border-radius:12px;
                   font-size:11px;font-weight:700;">${loc.category}</span><br/>`
              : ""}
            ${loc.distance
              ? `<span style="color:#15803d;font-size:12px;font-weight:600;margin-top:4px;display:block;">
                   📏 ${loc.distance}</span>`
              : ""}
            <a href="https://www.google.com/maps/search/?api=1&query=${lat},${lng}"
               target="_blank" rel="noopener noreferrer"
               style="display:inline-flex;align-items:center;gap:4px;margin-top:8px;
                      color:#2563eb;font-size:12px;font-weight:600;text-decoration:none;">
              🗺 Open in Google Maps →
            </a>
          </div>`);
        infoWindow.open(map, marker);
      });

      newMarkers.push(marker);
      bounds.extend({ lat, lng });
    });

    // ── Property marker — default red Google pin with animation ───────────
    const addPropertyMarker = (pos) => {
      const propMarker = new G.Marker({
        position:  pos,
        map,
        title:     "This Property",
        zIndex:    9999,
        animation: G.Animation.BOUNCE,  // bouncing so it stands out immediately
      });

      // Stop bouncing after 2 seconds
      setTimeout(() => propMarker.setAnimation(null), 2100);

      propMarker.addListener("click", () => {
        infoWindow.setContent(`
          <div style="font-family:sans-serif;padding:6px 4px;min-width:180px;">
            <strong style="color:#ef4444;font-size:13px;">📍 This Property</strong><br/>
            <span style="font-size:12px;color:#374151;margin-top:2px;display:block;">
              ${propertyLocation}
            </span>
            <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(propertyLocation + ", India")}"
               target="_blank" rel="noopener noreferrer"
               style="display:inline-flex;align-items:center;gap:4px;margin-top:8px;
                      color:#2563eb;font-size:12px;font-weight:600;text-decoration:none;">
              🗺 Open in Google Maps →
            </a>
          </div>`);
        infoWindow.open(map, propMarker);
      });

      newMarkers.push(propMarker);
      bounds.extend(pos);
      if (newMarkers.length > 1) map.fitBounds(bounds, { top: 60, right: 40, bottom: 60, left: 40 });
      else map.setCenter(pos);
    };

    if (propertyLocation) {
      const geocodeQuery = propertyLocation.toLowerCase().includes("india")
        ? propertyLocation
        : `${propertyLocation}, India`;
      const geocoder = new G.Geocoder();
      geocoder.geocode({ address: geocodeQuery }, (results, status) => {
        if (status === "OK" && results[0]) addPropertyMarker(results[0].geometry.location);
      });
    }

    markersRef.current = newMarkers;
    if (newMarkers.length > 1) map.fitBounds(bounds, { top: 60, right: 40, bottom: 60, left: 40 });
    else if (newMarkers.length === 1) map.setCenter(newMarkers[0].getPosition());

    setTimeout(() => G.event.trigger(map, "resize"), 400);

    return () => {
      markersRef.current.forEach((m) => m.setMap(null));
      markersRef.current = [];
      mapRef.current = null;
    };
  }, [mapsReady, locations, propertyLocation]);

  if (mapError) return null;

  return (
    <div className="nearby-map-wrapper">
      {!mapsReady && (
        <div className="nearby-map-loading">
          <span className="nearby-map-spinner" /> Loading map…
        </div>
      )}
      <div
        ref={containerRef}
        className="nearby-map-canvas"
        style={{ opacity: mapsReady ? 1 : 0, cursor: "pointer" }}
      />
      {/* Legend */}
      <div className="nearby-map-legend">
        <span style={{ display:"flex", alignItems:"center", gap:5 }}>
          <svg width="14" height="17" viewBox="0 0 36 44" xmlns="http://www.w3.org/2000/svg">
            <path d="M18 2C10.268 2 4 8.268 4 16c0 9 14 26 14 26S32 25 32 16C32 8.268 25.732 2 18 2z"
                  fill="#2563eb" stroke="white" strokeWidth="2"/>
            <text x="18" y="20" textAnchor="middle" dominantBaseline="middle"
                  fontFamily="sans-serif" fontSize="13" fontWeight="700" fill="white">1</text>
          </svg>
          Nearby places
        </span>
        <span style={{ display:"flex", alignItems:"center", gap:5 }}>
          <svg width="14" height="17" viewBox="0 0 36 44" xmlns="http://www.w3.org/2000/svg">
            <path d="M18 2C10.268 2 4 8.268 4 16c0 9 14 26 14 26S32 25 32 16C32 8.268 25.732 2 18 2z"
                  fill="#ef4444" stroke="white" strokeWidth="2"/>
          </svg>
          This property
        </span>
        <span style={{ fontSize:11, color:"#9ca3af", marginLeft:"auto" }}>
          Click map to open in Google Maps
        </span>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   NEARBY CARD — memoized so re-renders only when item changes
   ═══════════════════════════════════════════════════════════════ */
const NearbyCard = memo(function NearbyCard({ item }) {
  const [saved,     setSaved]     = useState(false);
  const [imgError,  setImgError]  = useState(false);

  /* Open Google Maps search for this location */
  const openMaps = useCallback(() => {
    const query = item.latitude && item.longitude
      ? `${item.latitude},${item.longitude}`
      : item.name;
    window.open(
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`,
      "_blank",
      "noopener,noreferrer"
    );
  }, [item.name, item.latitude, item.longitude]);

  /* Copy name to clipboard */
  const handleShare = useCallback(() => {
    navigator.clipboard?.writeText(item.name);
  }, [item.name]);

  /* Toggle saved */
  const handleSave = useCallback(() => setSaved((s) => !s), []);

  /* Image fallback */
  const handleImgError = useCallback(() => setImgError(true), []);

  return (
    <div className="nearby-card-premium">
      <div className="nearby-img-wrapper">
        {!imgError ? (
          <img
            src={item.image}
            alt={item.name}
            className="nearby-img"
            loading="lazy"
            onError={handleImgError}
          />
        ) : (
          /* Fallback when image fails to load */
          <div className="nearby-img-fallback">
            <MapPin size={32} color="#94a3b8" />
          </div>
        )}
        {item.category && (
          <span className="nearby-category">{item.category}</span>
        )}
      </div>

      <div className="nearby-footer">
        <div className="nearby-left">
          <MapPin size={18} className="nearby-pin" />
          <div className="nearby-text">
            <span className="nearby-name">{item.name}</span>
            {item.distance && (
              <span className="nearby-distance-chip">{item.distance}</span>
            )}
          </div>
        </div>

        <div className="nearby-icons">
          <Navigation
            size={18}
            className="nearby-icon"
            onClick={openMaps}
            title="Open in Maps"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && openMaps()}
          />
          <Share2
            size={18}
            className="nearby-icon"
            onClick={handleShare}
            title="Copy name"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && handleShare()}
          />
          <Bookmark
            size={18}
            className="nearby-icon"
            color={saved ? "#059669" : "#444"}
            fill={saved ? "#059669" : "none"}
            onClick={handleSave}
            title={saved ? "Remove bookmark" : "Bookmark"}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && handleSave()}
          />
        </div>
      </div>
    </div>
  );
});
