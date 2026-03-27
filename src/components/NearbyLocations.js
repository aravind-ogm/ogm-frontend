// /**
//  * NearbyLocations — Enterprise-grade Nearby Highlights
//  *
//  * Component tree:
//  *   NearbyLocations (orchestrator)
//  *     ├─ NearbySummary       (essentials snapshot above map)
//  *     ├─ NearbyFilterBar     (category filter pills with counts)
//  *     ├─ NearbySort          (sort dropdown)
//  *     ├─ NearbyMap           (Google Map — markers show/hide, no rebuild)
//  *     │    └─ MapLegend      (colour-coded floating legend)
//  *     └─ NearbyCard[]        (bi-directional map↔card sync)
//  *
//  * Each component can be extracted into its own file without changes.
//  */
//
// import React, {
//   useState,
//   useEffect,
//   useRef,
//   useCallback,
//   useMemo,
//   memo,
// } from "react";
// import { MapPin, Share2, Bookmark, Navigation, ChevronDown } from "lucide-react";
// import "../styles/NearbyLocations.css";
//
// /* ─────────────────────────────────────────────────────────────────────────────
//    GOOGLE MAPS LOADER  (singleton promise — identical to original)
// ───────────────────────────────────────────────────────────────────────────── */
// const GMAPS_KEY =
//   process.env.REACT_APP_GOOGLE_MAPS_API_KEY ||
//   "AIzaSyAMOnmpGRW9d36CNRQTjAavV4EjHGlXzO4";
//
// function loadGoogleMaps() {
//   if (typeof window.google?.maps?.Map === "function") return Promise.resolve();
//   if (document.getElementById("gmaps-sdk")) {
//     return new Promise((resolve) => {
//       const t = setInterval(() => {
//         if (typeof window.google?.maps?.Map === "function") {
//           clearInterval(t);
//           resolve();
//         }
//       }, 100);
//     });
//   }
//   return new Promise((resolve, reject) => {
//     const script   = document.createElement("script");
//     script.id      = "gmaps-sdk";
//     script.src     = `https://maps.googleapis.com/maps/api/js?key=${GMAPS_KEY}&libraries=places`;
//     script.async   = true;
//     script.defer   = true;
//     script.onload  = resolve;
//     script.onerror = () => reject(new Error("Failed to load Google Maps"));
//     document.head.appendChild(script);
//   });
// }
//
// /* ─────────────────────────────────────────────────────────────────────────────
//    CONSTANTS
// ───────────────────────────────────────────────────────────────────────────── */
// const CATEGORY_COLOURS = {
//   restaurant:  "#f97316",
//   play:        "#8b5cf6",
//   school:      "#0ea5e9",
//   hospital:    "#ef4444",
//   mall:        "#ec4899",
//   park:        "#22c55e",
//   gym:         "#f59e0b",
//   cafe:        "#92400e",
//   temple:      "#7c3aed",
//   metro:       "#0891b2",
//   supermarket: "#16a34a",
//   default:     "#2563eb",
// };
//
// // Categories shown in the map legend (only those present in data are rendered)
// const LEGEND_ITEMS = [
//   { key: "hospital",    label: "Hospital",     colour: "#ef4444" },
//   { key: "school",      label: "School",       colour: "#0ea5e9" },
//   { key: "park",        label: "Park",         colour: "#22c55e" },
//   { key: "restaurant",  label: "Restaurant",   colour: "#f97316" },
//   { key: "temple",      label: "Temple",       colour: "#7c3aed" },
//   { key: "mall",        label: "Mall",         colour: "#ec4899" },
//   { key: "gym",         label: "Gym",          colour: "#f59e0b" },
//   { key: "cafe",        label: "Cafe",         colour: "#92400e" },
//   { key: "metro",       label: "Metro",        colour: "#0891b2" },
//   { key: "supermarket", label: "Supermarket",  colour: "#16a34a" },
//   { key: "play",        label: "Play Area",    colour: "#8b5cf6" },
// ];
//
// // Filter bar — rendered in order; entries with count=0 are hidden automatically
// const FILTER_CATEGORIES = [
//   { key: "All",         label: "All",           icon: "🗺️" },
//   { key: "hospital",    label: "Hospitals",     icon: "🏥" },
//   { key: "school",      label: "Schools",       icon: "🏫" },
//   { key: "restaurant",  label: "Restaurants",   icon: "🍽️" },
//   { key: "park",        label: "Parks",         icon: "🌳" },
//   { key: "gym",         label: "Gyms",          icon: "💪" },
//   { key: "temple",      label: "Temples",       icon: "🛕" },
//   { key: "mall",        label: "Malls",         icon: "🛍️" },
//   { key: "cafe",        label: "Cafes",         icon: "☕" },
//   { key: "metro",       label: "Metro",         icon: "🚇" },
//   { key: "supermarket", label: "Supermarkets",  icon: "🛒" },
//   { key: "play",        label: "Play Areas",    icon: "🎠" },
// ];
//
// const SORT_OPTIONS = [
//   { value: "nearest",   label: "📍 Nearest First"      },
//   { value: "farthest",  label: "🔭 Farthest First"     },
//   { value: "important", label: "⭐ Most Important"     },
//   { value: "lifestyle", label: "🍹 Lifestyle"          },
//   { value: "family",    label: "👨‍👩‍👧 Family Friendly"  },
// ];
//
// // Categories treated as "important" — get larger markers + badge
// const IMPORTANT_CATEGORIES = ["hospital", "school", "metro", "supermarket"];
//
// // Groups displayed in the NearbySummary panel
// const SUMMARY_GROUPS = [
//   { key: "hospital",    label: "Hospital",     icon: "🏥", maxKm: 5 },
//   { key: "school",      label: "School",       icon: "🏫", maxKm: 3 },
//   { key: "metro",       label: "Metro Station",icon: "🚇", maxKm: 5 },
//   { key: "restaurant",  label: "Restaurant",   icon: "🍽️", maxKm: 2 },
//   { key: "park",        label: "Park",         icon: "🌳", maxKm: 3 },
//   { key: "supermarket", label: "Supermarket",  icon: "🛒", maxKm: 3 },
// ];
//
// /* ─────────────────────────────────────────────────────────────────────────────
//    UTILITY FUNCTIONS
// ───────────────────────────────────────────────────────────────────────────── */
//
// /** Returns the hex colour for a category string */
// function categoryColour(cat) {
//   if (!cat) return CATEGORY_COLOURS.default;
//   const lower = cat.toLowerCase();
//   const key   = Object.keys(CATEGORY_COLOURS).find((k) => lower.includes(k));
//   return key ? CATEGORY_COLOURS[key] : CATEGORY_COLOURS.default;
// }
//
// /** True if this category is designated "important" */
// function isImportant(category) {
//   if (!category) return false;
//   const lower = category.toLowerCase();
//   return IMPORTANT_CATEGORIES.some((k) => lower.includes(k));
// }
//
// /** Parse "3.2 km" or "800 m" → kilometres as a number */
// function parseDistanceKm(distanceStr) {
//   if (!distanceStr) return 99;
//   const m = String(distanceStr).toLowerCase().trim().match(/([\d.]+)\s*(km|m)/);
//   if (!m) return 99;
//   const val = parseFloat(m[1]);
//   return m[2] === "m" ? val / 1000 : val;
// }
//
// /**
//  * Estimate drive + walk times from a distance string.
//  * Uses Haversine fallback speeds (30 km/h drive, 5 km/h walk).
//  * Returns null when distance is unparseable.
//  */
// function estimateTravelTime(distanceStr) {
//   const km = parseDistanceKm(distanceStr);
//   if (km >= 90) return null;
//   return {
//     driveMin: Math.max(1, Math.round((km / 30) * 60)),
//     walkMin:  Math.max(1, Math.round((km / 5)  * 60)),
//   };
// }
//
// /** Format minutes as "8 min" or "1h 5m" */
// function formatTime(min) {
//   if (min < 60) return `${min} min`;
//   return `${Math.floor(min / 60)}h ${min % 60}m`;
// }
//
// /** Importance score for sort-by-important */
// function importanceScore(category) {
//   if (!category) return 0;
//   const c = category.toLowerCase();
//   if (c.includes("hospital"))    return 10;
//   if (c.includes("school"))      return 9;
//   if (c.includes("metro"))       return 8;
//   if (c.includes("supermarket")) return 7;
//   return 0;
// }
//
// /** Sort a copy of locations[] according to sortMode */
// function sortLocations(locations, sortMode) {
//   const arr = [...locations];
//   switch (sortMode) {
//     case "nearest":
//       return arr.sort((a, b) => parseDistanceKm(a.distance) - parseDistanceKm(b.distance));
//     case "farthest":
//       return arr.sort((a, b) => parseDistanceKm(b.distance) - parseDistanceKm(a.distance));
//     case "important":
//       return arr.sort((a, b) => {
//         const diff = importanceScore(b.category) - importanceScore(a.category);
//         return diff !== 0 ? diff : parseDistanceKm(a.distance) - parseDistanceKm(b.distance);
//       });
//     case "lifestyle": {
//       const order = ["restaurant", "cafe", "mall", "gym", "park", "play"];
//       return arr.sort((a, b) => {
//         const ai = order.findIndex((k) => (a.category || "").toLowerCase().includes(k));
//         const bi = order.findIndex((k) => (b.category || "").toLowerCase().includes(k));
//         return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
//       });
//     }
//     case "family": {
//       const order = ["school", "hospital", "park", "supermarket"];
//       return arr.sort((a, b) => {
//         const ai = order.findIndex((k) => (a.category || "").toLowerCase().includes(k));
//         const bi = order.findIndex((k) => (b.category || "").toLowerCase().includes(k));
//         return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
//       });
//     }
//     default:
//       return arr;
//   }
// }
//
// /** Open a lat/lng or place name in Google Maps */
// function openInGoogleMaps(lat, lng, name) {
//   const query = lat && lng
//     ? `${lat},${lng}`
//     : encodeURIComponent(name);
//   window.open(
//     `https://www.google.com/maps/search/?api=1&query=${query}`,
//     "_blank",
//     "noopener,noreferrer"
//   );
// }
//
// /* ─────────────────────────────────────────────────────────────────────────────
//    NEARBY SUMMARY
//    Shows a "nearby essentials" pill-grid above the map — quick overview
//    for buyers without them having to read every card.
// ───────────────────────────────────────────────────────────────────────────── */
// const NearbySummary = memo(function NearbySummary({ locations }) {
//   const groups = useMemo(() => {
//     return SUMMARY_GROUPS.map(({ key, label, icon, maxKm }) => {
//       const count = locations.filter((loc) => {
//         const c = (loc.category || "").toLowerCase();
//         return c.includes(key) && parseDistanceKm(loc.distance) <= maxKm;
//       }).length;
//       return { key, label, icon, maxKm, count };
//     }).filter((g) => g.count > 0);
//   }, [locations]);
//
//   if (!groups.length) return null;
//
//   return (
//     <div className="nearby-summary">
//       <p className="nearby-summary-title">📍 Nearby Essentials</p>
//       <div className="nearby-summary-grid">
//         {groups.map(({ key, label, icon, count, maxKm }) => (
//           <div key={key} className="nearby-summary-chip">
//             <span className="nearby-summary-chip-icon">{icon}</span>
//             <span className="nearby-summary-chip-text">
//               <strong>{count}</strong> {label}{count !== 1 ? "s" : ""}{" "}
//               <span className="nearby-summary-chip-range">within {maxKm} km</span>
//             </span>
//           </div>
//         ))}
//       </div>
//     </div>
//   );
// });
//
// /* ─────────────────────────────────────────────────────────────────────────────
//    FILTER BAR
//    Horizontal scrollable pill bar — counts come from the *full* list so
//    they never change when a filter is active.
// ───────────────────────────────────────────────────────────────────────────── */
// const NearbyFilterBar = memo(function NearbyFilterBar({
//   locations,
//   activeFilter,
//   onFilterChange,
// }) {
//   // Pre-compute count per category key
//   const counts = useMemo(() => {
//     const map = {};
//     locations.forEach((loc) => {
//       const c = (loc.category || "").toLowerCase();
//       FILTER_CATEGORIES.forEach(({ key }) => {
//         if (key !== "All" && c.includes(key.toLowerCase())) {
//           map[key] = (map[key] || 0) + 1;
//         }
//       });
//     });
//     return map;
//   }, [locations]);
//
//   return (
//     <div className="nearby-filter-bar" role="toolbar" aria-label="Filter nearby places">
//       {FILTER_CATEGORIES.map(({ key, label, icon }) => {
//         const count = key === "All" ? locations.length : (counts[key] || 0);
//         if (key !== "All" && count === 0) return null;
//         const isActive = activeFilter === key;
//         return (
//           <button
//             key={key}
//             className={`nearby-filter-pill${isActive ? " active" : ""}`}
//             onClick={() => onFilterChange(key)}
//             aria-pressed={isActive}
//             type="button"
//           >
//             <span className="filter-pill-icon" aria-hidden="true">{icon}</span>
//             <span className="filter-pill-label">{label}</span>
//             <span className="filter-pill-count">{count}</span>
//           </button>
//         );
//       })}
//     </div>
//   );
// });
//
// /* ─────────────────────────────────────────────────────────────────────────────
//    SORT DROPDOWN
// ───────────────────────────────────────────────────────────────────────────── */
// const NearbySort = memo(function NearbySort({ sortMode, onSortChange }) {
//   return (
//     <div className="nearby-sort-wrapper">
//       <select
//         className="nearby-sort-select"
//         value={sortMode}
//         onChange={(e) => onSortChange(e.target.value)}
//         aria-label="Sort nearby places"
//       >
//         {SORT_OPTIONS.map(({ value, label }) => (
//           <option key={value} value={value}>{label}</option>
//         ))}
//       </select>
//       <ChevronDown size={13} className="nearby-sort-chevron" aria-hidden="true" />
//     </div>
//   );
// });
//
// /* ─────────────────────────────────────────────────────────────────────────────
//    MAP LEGEND
//    Floats over the map (bottom-left). Only shows categories present in data.
// ───────────────────────────────────────────────────────────────────────────── */
// function MapLegend({ presentCategories }) {
//   const visible = LEGEND_ITEMS.filter((item) => presentCategories.has(item.key));
//   if (!visible.length) return null;
//
//   return (
//     <div className="nearby-map-legend" role="img" aria-label="Map legend">
//       <p className="legend-section-title">MAP LEGEND</p>
//
//       {/* Property pin */}
//       <div className="legend-row">
//         <span
//           className="legend-pin-dot"
//           style={{
//             background: "#ef4444",
//             boxShadow: "0 0 0 2px #fff, 0 0 0 4px #ef4444",
//           }}
//         />
//         <span>This Property</span>
//       </div>
//
//       <div className="legend-divider" />
//
//       {/* Dynamic category dots */}
//       {visible.map(({ key, label, colour }) => (
//         <div key={key} className="legend-row">
//           <span className="legend-pin-dot" style={{ background: colour }} />
//           <span>{label}</span>
//         </div>
//       ))}
//
//       <div className="legend-divider" />
//       <div className="legend-row legend-important-row">
//         <span className="legend-star-badge">★</span>
//         <span>Important Nearby</span>
//       </div>
//     </div>
//   );
// }
//
// /* ─────────────────────────────────────────────────────────────────────────────
//    NEARBY MAP
//    Performance contract:
//      • Map is created ONCE when SDK loads.
//      • Markers are created ONCE for allLocations, then show/hide on filter.
//      • activeId effect zooms + opens InfoWindow without marker recreation.
//      • hoveredId effect plays a brief bounce animation.
// ───────────────────────────────────────────────────────────────────────────── */
// function NearbyMap({
//   locations,       // filtered + sorted subset (for show/hide)
//   allLocations,    // full set (for building markers once)
//   propertyLocation,
//   activeId,        // click-locked → zoom + InfoWindow
//   hoveredId,       // hover → bounce only
//   onMarkerClick,
// }) {
//   const containerRef  = useRef(null);
//   const mapRef        = useRef(null);
//   // markersRef stores: { [_stableId]: { marker, infoContent, colour, position } }
//   const markersRef    = useRef({});
//   const propMarkerRef = useRef(null);
//   const infoWinRef    = useRef(null);
//
//   const [mapsReady, setMapsReady] = useState(
//     typeof window.google?.maps?.Map === "function"
//   );
//   const [mapError, setMapError] = useState(false);
//
//   // Derive which category keys are actually present (for the legend)
//   const presentCategories = useMemo(() => {
//     const s = new Set();
//     allLocations.forEach((loc) => {
//       if (loc.category) {
//         const c = loc.category.toLowerCase();
//         Object.keys(CATEGORY_COLOURS).forEach((k) => {
//           if (c.includes(k)) s.add(k);
//         });
//       }
//     });
//     return s;
//   }, [allLocations]);
//
//   /* ── 1. Load SDK ── */
//   useEffect(() => {
//     if (mapsReady) return;
//     loadGoogleMaps()
//       .then(() => setMapsReady(true))
//       .catch(() => setMapError(true));
//   }, [mapsReady]);
//
//   /* ── 2. Build map + ALL markers once ── */
//   useEffect(() => {
//     if (!mapsReady || !containerRef.current || mapRef.current) return;
//
//     const G   = window.google.maps;
//     const map = new G.Map(containerRef.current, {
//       zoom:              13,
//       center:            { lat: 12.9716, lng: 77.5946 },
//       mapTypeControl:    false,
//       streetViewControl: false,
//       fullscreenControl: true,
//       zoomControl:       true,
//       styles: [
//         { featureType: "poi.business", stylers: [{ visibility: "off" }] },
//         { featureType: "transit",      stylers: [{ visibility: "simplified" }] },
//       ],
//     });
//     mapRef.current = map;
//
//     const infoWindow = new G.InfoWindow();
//     infoWinRef.current = infoWindow;
//     const bounds = new G.LatLngBounds();
//
//     // Click on map background → open Google Maps
//     map.addListener("click", () => {
//       const c = map.getCenter();
//       window.open(
//         `https://www.google.com/maps/@${c.lat()},${c.lng()},15z`,
//         "_blank",
//         "noopener,noreferrer"
//       );
//     });
//
//     // Build a marker for every location in allLocations
//     allLocations.forEach((loc, i) => {
//       const lat = parseFloat(loc.latitude ?? loc.lat);
//       const lng = parseFloat(loc.longitude ?? loc.lng);
//       if (isNaN(lat) || isNaN(lng)) return;
//
//       const sid       = loc._stableId ?? String(i);
//       const colour    = categoryColour(loc.category);
//       const important = isImportant(loc.category);
//       const num       = String(loc._index !== undefined ? loc._index + 1 : i + 1);
//
//       // Important markers: larger (44×53), halo ring, gold star badge
//       // Normal markers: standard (36×44) — identical to original
//       const svgContent = important
//         ? `<svg xmlns="http://www.w3.org/2000/svg" width="44" height="53" viewBox="0 0 36 44">
//             <ellipse cx="18" cy="42" rx="11" ry="4.5" fill="rgba(0,0,0,0.20)"/>
//             <circle  cx="18" cy="15" r="16" fill="${colour}" opacity="0.18"/>
//             <path d="M18 2C10.268 2 4 8.268 4 16c0 9 14 26 14 26S32 25 32 16C32 8.268 25.732 2 18 2z"
//                   fill="${colour}" stroke="white" stroke-width="2.5"/>
//             <text x="18" y="20" text-anchor="middle" dominant-baseline="middle"
//                   font-family="sans-serif" font-size="13" font-weight="700" fill="white">${num}</text>
//             <circle cx="30" cy="5" r="7" fill="#facc15" stroke="white" stroke-width="1.5"/>
//             <text x="30" y="5" text-anchor="middle" dominant-baseline="middle"
//                   font-family="sans-serif" font-size="10" fill="#78350f">★</text>
//            </svg>`
//         : `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="44" viewBox="0 0 36 44">
//             <ellipse cx="18" cy="42" rx="8" ry="3" fill="rgba(0,0,0,0.18)"/>
//             <path d="M18 2C10.268 2 4 8.268 4 16c0 9 14 26 14 26S32 25 32 16C32 8.268 25.732 2 18 2z"
//                   fill="${colour}" stroke="white" stroke-width="2"/>
//             <text x="18" y="20" text-anchor="middle" dominant-baseline="middle"
//                   font-family="sans-serif" font-size="13" font-weight="700" fill="white">${num}</text>
//            </svg>`;
//
//       const pinW = important ? 44 : 36;
//       const pinH = important ? 53 : 44;
//
//       const icon = {
//         url:        "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svgContent),
//         scaledSize: new G.Size(pinW, pinH),
//         anchor:     new G.Point(pinW / 2, pinH),
//       };
//
//       const marker = new G.Marker({
//         position:  { lat, lng },
//         map,
//         title:     loc.name,
//         icon,
//         animation: G.Animation.DROP,
//         zIndex:    important ? i + 100 : i + 1,
//       });
//
//       // Build InfoWindow content once per marker
//       const travel     = estimateTravelTime(loc.distance);
//       const travelHtml = travel
//         ? `<div style="display:flex;gap:12px;margin-top:5px;">
//              <span style="font-size:11px;color:#4b5563;">🚗 ${formatTime(travel.driveMin)}</span>
//              <span style="font-size:11px;color:#4b5563;">🚶 ${formatTime(travel.walkMin)}</span>
//            </div>`
//         : "";
//
//       const infoContent = `
//         <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
//                     padding:8px 4px;min-width:200px;max-width:240px;">
//           <div style="display:flex;align-items:flex-start;gap:9px;margin-bottom:7px;">
//             <span style="background:${colour};color:#fff;border-radius:50%;width:24px;height:24px;
//               display:inline-flex;align-items:center;justify-content:center;
//               font-size:12px;font-weight:700;flex-shrink:0;margin-top:1px;">${num}</span>
//             <div>
//               <strong style="font-size:13px;color:#0f172a;line-height:1.3;">${loc.name}</strong>
//               ${important
//                 ? `<span style="display:inline-flex;align-items:center;gap:3px;
//                      background:#fef9c3;color:#92400e;padding:2px 7px;border-radius:9px;
//                      font-size:10px;font-weight:700;margin-left:5px;">★ Important</span>`
//                 : ""}
//             </div>
//           </div>
//           ${loc.category
//             ? `<span style="background:${colour}1a;color:${colour};padding:3px 10px;
//                  border-radius:12px;font-size:11px;font-weight:700;">${loc.category}</span><br/>`
//             : ""}
//           ${loc.distance
//             ? `<span style="color:#15803d;font-size:12px;font-weight:600;
//                  margin-top:6px;display:block;">📏 ${loc.distance}</span>`
//             : ""}
//           ${travelHtml}
//           <a href="https://www.google.com/maps/search/?api=1&query=${lat},${lng}"
//              target="_blank" rel="noopener noreferrer"
//              style="display:inline-flex;align-items:center;gap:5px;margin-top:9px;
//                     color:#2563eb;font-size:12px;font-weight:600;text-decoration:none;">
//             🗺 Open in Google Maps →
//           </a>
//         </div>`;
//
//       marker.addListener("click", () => {
//         infoWindow.setContent(infoContent);
//         infoWindow.open(map, marker);
//         onMarkerClick(sid);
//       });
//
//       markersRef.current[sid] = { marker, infoContent, colour, position: { lat, lng } };
//       bounds.extend({ lat, lng });
//     });
//
//     // Property marker (geocoded) — bounces briefly on load
//     const addPropertyMarker = (pos) => {
//       const propMarker = new G.Marker({
//         position:  pos,
//         map,
//         title:     "This Property",
//         zIndex:    9999,
//         animation: G.Animation.BOUNCE,
//       });
//       setTimeout(() => propMarker.setAnimation(null), 2100);
//
//       propMarker.addListener("click", () => {
//         infoWindow.setContent(`
//           <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
//                       padding:8px 4px;min-width:190px;">
//             <strong style="color:#ef4444;font-size:13px;">📍 This Property</strong>
//             <p style="font-size:12px;color:#374151;margin:4px 0 0;">${propertyLocation}</p>
//             <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
//               propertyLocation.toLowerCase().includes("india")
//                 ? propertyLocation
//                 : propertyLocation + ", India"
//             )}"
//                target="_blank" rel="noopener noreferrer"
//                style="display:inline-flex;align-items:center;gap:5px;margin-top:9px;
//                       color:#2563eb;font-size:12px;font-weight:600;text-decoration:none;">
//               🗺 Open in Google Maps →
//             </a>
//           </div>`);
//         infoWindow.open(map, propMarker);
//       });
//
//       propMarkerRef.current = propMarker;
//       bounds.extend(pos);
//       const total = Object.keys(markersRef.current).length;
//       if (total > 0) map.fitBounds(bounds, { top: 60, right: 40, bottom: 80, left: 60 });
//       else map.setCenter(pos);
//     };
//
//     if (propertyLocation) {
//       const geocodeQuery = propertyLocation.toLowerCase().includes("india")
//         ? propertyLocation
//         : `${propertyLocation}, India`;
//       new G.Geocoder().geocode({ address: geocodeQuery }, (results, status) => {
//         if (status === "OK" && results[0])
//           addPropertyMarker(results[0].geometry.location);
//       });
//     }
//
//     const total = Object.keys(markersRef.current).length;
//     if (total > 1) map.fitBounds(bounds, { top: 60, right: 40, bottom: 80, left: 60 });
//     else if (total === 1)
//       map.setCenter(Object.values(markersRef.current)[0].position);
//
//     setTimeout(() => G.event.trigger(map, "resize"), 400);
//
//     return () => {
//       Object.values(markersRef.current).forEach(({ marker }) =>
//         marker.setMap(null)
//       );
//       markersRef.current = {};
//       if (propMarkerRef.current) propMarkerRef.current.setMap(null);
//       mapRef.current = null;
//     };
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [mapsReady]); // intentional: map + markers are built once; allLocations captured via closure
//
//   /* ── 3. Show/hide markers based on filtered locations — NO map rebuild ── */
//   useEffect(() => {
//     if (!mapRef.current) return;
//     const G         = window.google.maps;
//     const visibleIds = new Set(locations.map((loc) => loc._stableId));
//     const bounds    = new G.LatLngBounds();
//     let hasVisible  = false;
//
//     Object.entries(markersRef.current).forEach(([sid, { marker, position }]) => {
//       const show = visibleIds.has(sid);
//       marker.setMap(show ? mapRef.current : null);
//       if (show) {
//         bounds.extend(position);
//         hasVisible = true;
//       }
//     });
//
//     if (propMarkerRef.current?.getPosition())
//       bounds.extend(propMarkerRef.current.getPosition());
//
//     if (hasVisible) {
//       mapRef.current.fitBounds(bounds, { top: 60, right: 40, bottom: 80, left: 60 });
//     }
//   }, [locations]);
//
//   /* ── 4. hoveredId → brief bounce animation on marker (no InfoWindow) ── */
//   useEffect(() => {
//     if (!mapRef.current) return;
//     if (hoveredId === null || hoveredId === undefined) return;
//
//     const entry =
//       markersRef.current[hoveredId] ??
//       markersRef.current[String(hoveredId)];
//     if (!entry?.marker.getMap()) return; // marker hidden → skip
//
//     entry.marker.setAnimation(window.google.maps.Animation.BOUNCE);
//     setTimeout(() => {
//       if (entry.marker.getMap()) entry.marker.setAnimation(null);
//     }, 700);
//   }, [hoveredId]);
//
//   /* ── 5. activeId → zoom + open InfoWindow (click-locked) ── */
//   useEffect(() => {
//     if (!mapRef.current) return;
//     if (activeId === null || activeId === undefined) {
//       infoWinRef.current?.close();
//       return;
//     }
//     const entry =
//       markersRef.current[activeId] ??
//       markersRef.current[String(activeId)];
//     if (!entry?.marker.getMap()) return; // marker hidden → skip
//
//     mapRef.current.panTo(entry.position);
//     mapRef.current.setZoom(16);
//     infoWinRef.current.setContent(entry.infoContent);
//     infoWinRef.current.open(mapRef.current, entry.marker);
//
//     entry.marker.setAnimation(window.google.maps.Animation.BOUNCE);
//     setTimeout(() => {
//       if (entry.marker.getMap()) entry.marker.setAnimation(null);
//     }, 1500);
//   }, [activeId]);
//
//   if (mapError) return null;
//
//   return (
//     <div className="nearby-map-wrapper">
//       {!mapsReady && (
//         <div className="nearby-map-loading">
//           <span className="nearby-map-spinner" />
//           Loading map…
//         </div>
//       )}
//       <div
//         ref={containerRef}
//         className="nearby-map-canvas"
//         style={{ opacity: mapsReady ? 1 : 0, cursor: "pointer" }}
//       />
//       {/* Colour-coded legend floating over map */}
//       <MapLegend presentCategories={presentCategories} />
//     </div>
//   );
// }
//
// /* ─────────────────────────────────────────────────────────────────────────────
//    NEARBY CARD
//    Fully memoized. Bi-directional sync: hover → map bounce, click → map zoom.
// ───────────────────────────────────────────────────────────────────────────── */
// const NearbyCard = memo(function NearbyCard({
//   item,
//   isActive,
//   onHover,
//   onCardClick,
// }) {
//   const [saved,    setSaved]    = useState(false);
//   const [imgError, setImgError] = useState(false);
//   const cardRef = useRef(null);
//
//   const colour    = useMemo(() => categoryColour(item.category), [item.category]);
//   const important = useMemo(() => isImportant(item.category),    [item.category]);
//   const travel    = useMemo(() => estimateTravelTime(item.distance), [item.distance]);
//   const sid       = item._stableId;
//   const markerNum = item._index !== undefined ? item._index + 1 : "·";
//
//   // Scroll card into view when activated by a marker click
//   useEffect(() => {
//     if (isActive && cardRef.current) {
//       cardRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
//     }
//   }, [isActive]);
//
//   const openMaps   = useCallback((e) => {
//     e?.stopPropagation();
//     openInGoogleMaps(
//       item.latitude  ?? item.lat,
//       item.longitude ?? item.lng,
//       item.name
//     );
//   }, [item]);
//
//   const handleShare = useCallback((e) => {
//     e?.stopPropagation();
//     navigator.clipboard?.writeText(item.name);
//   }, [item.name]);
//
//   const handleSave  = useCallback((e) => {
//     e?.stopPropagation();
//     setSaved((s) => !s);
//   }, []);
//
//   return (
//     <div
//       ref={cardRef}
//       className={[
//         "nearby-card-premium",
//         isActive    ? "is-active"    : "",
//         important   ? "is-important" : "",
//       ].filter(Boolean).join(" ")}
//       onMouseEnter={() => onHover(sid)}
//       onMouseLeave={() => onHover(null)}
//       onClick={() => onCardClick(sid)}
//       role="button"
//       tabIndex={0}
//       onKeyDown={(e) => e.key === "Enter" && onCardClick(sid)}
//       aria-label={`${item.name}${item.distance ? `, ${item.distance}` : ""}`}
//     >
//       {/* ── Image ── */}
//       <div className="nearby-img-wrapper">
//         {!imgError ? (
//           <img
//             src={item.image}
//             alt={item.name}
//             className="nearby-img"
//             loading="lazy"
//             onError={() => setImgError(true)}
//           />
//         ) : (
//           <div
//             className="nearby-img-fallback"
//             style={{ background: `${colour}12` }}
//           >
//             <MapPin size={32} color={colour} />
//           </div>
//         )}
//
//         {/* Category badge — colour-matched */}
//         {item.category && (
//           <span
//             className="nearby-category"
//             style={{
//               background: `linear-gradient(135deg, ${colour}ee, ${colour}bb)`,
//             }}
//           >
//             {item.category}
//           </span>
//         )}
//
//         {/* Important badge */}
//         {important && (
//           <span className="nearby-important-badge">⭐ Important Nearby</span>
//         )}
//
//         {/* Marker number chip (matches the map pin number) */}
//         <span className="nearby-card-num">{markerNum}</span>
//       </div>
//
//       {/* ── Footer ── */}
//       <div className="nearby-footer">
//         <div className="nearby-left">
//           <MapPin size={18} className="nearby-pin" style={{ color: colour }} />
//           <div className="nearby-text">
//             <span className="nearby-name">{item.name}</span>
//
//             {item.distance && (
//               <span className="nearby-distance-chip">{item.distance}</span>
//             )}
//
//             {/* Travel time row */}
//             {travel && (
//               <div className="nearby-travel-row">
//                 <span className="nearby-travel-chip">
//                   🚗 {formatTime(travel.driveMin)}
//                 </span>
//                 <span className="nearby-travel-chip">
//                   🚶 {formatTime(travel.walkMin)}
//                 </span>
//               </div>
//             )}
//           </div>
//         </div>
//
//         {/* Action icons */}
//         <div className="nearby-icons">
//           <Navigation
//             size={18}
//             className="nearby-icon"
//             onClick={openMaps}
//             title="Open in Google Maps"
//             role="button"
//             tabIndex={0}
//             onKeyDown={(e) => e.key === "Enter" && openMaps()}
//             aria-label="Open in Google Maps"
//           />
//           <Share2
//             size={18}
//             className="nearby-icon"
//             onClick={handleShare}
//             title="Copy name"
//             role="button"
//             tabIndex={0}
//             onKeyDown={(e) => e.key === "Enter" && handleShare()}
//             aria-label="Copy name"
//           />
//           <Bookmark
//             size={18}
//             className="nearby-icon"
//             color={saved ? "#059669" : "#94a3b8"}
//             fill={saved ? "#059669" : "none"}
//             onClick={handleSave}
//             title={saved ? "Remove bookmark" : "Save"}
//             role="button"
//             tabIndex={0}
//             onKeyDown={(e) => e.key === "Enter" && handleSave()}
//             aria-label={saved ? "Remove bookmark" : "Save"}
//           />
//         </div>
//       </div>
//     </div>
//   );
// });
//
// /* ─────────────────────────────────────────────────────────────────────────────
//    NEARBY LOCATIONS  (main export)
// ───────────────────────────────────────────────────────────────────────────── */
// export default function NearbyLocations({
//   locations = [],
//   propertyLocation = "",
// }) {
//   // Normalise: give every item a stable string ID and its original index
//   const allLocations = useMemo(
//     () =>
//       locations.map((loc, i) => ({
//         ...loc,
//         _stableId: loc.id !== undefined ? String(loc.id) : String(i),
//         _index:    i,
//       })),
//     [locations]
//   );
//
//   const [activeFilter, setActiveFilter] = useState("All");
//   const [sortMode,     setSortMode]     = useState("nearest");
//   // click-locked (zoom + InfoWindow)
//   const [activeId,     setActiveId]     = useState(null);
//   // hover-ephemeral (bounce animation only)
//   const [hoveredId,    setHoveredId]    = useState(null);
//
//   // Filtered + sorted subset — used for card rendering and marker visibility
//   const filteredLocations = useMemo(() => {
//     const base =
//       activeFilter === "All"
//         ? allLocations
//         : allLocations.filter((loc) =>
//             (loc.category || "").toLowerCase().includes(activeFilter.toLowerCase())
//           );
//     return sortLocations(base, sortMode);
//   }, [allLocations, activeFilter, sortMode]);
//
//   const handleFilterChange = useCallback((key) => {
//     setActiveFilter(key);
//     setActiveId(null);
//   }, []);
//
//   if (!allLocations.length) return null;
//
//   return (
//     <div className="nearby-section">
//       <h2 className="nearby-title">Nearby Highlights</h2>
//
//       {/* Quick essentials summary */}
//       <NearbySummary locations={allLocations} />
//
//       {/* Category filter pills */}
//       <NearbyFilterBar
//         locations={allLocations}
//         activeFilter={activeFilter}
//         onFilterChange={handleFilterChange}
//       />
//
//       {/* Result count + sort control */}
//       <div className="nearby-controls-row">
//         <span className="nearby-results-count">
//           {filteredLocations.length} place
//           {filteredLocations.length !== 1 ? "s" : ""} found
//         </span>
//         <NearbySort sortMode={sortMode} onSortChange={setSortMode} />
//       </div>
//
//       {/* Google Map */}
//       <NearbyMap
//         locations={filteredLocations}
//         allLocations={allLocations}
//         propertyLocation={propertyLocation}
//         activeId={activeId}
//         hoveredId={hoveredId}
//         onMarkerClick={setActiveId}
//       />
//
//       {/* Cards grid */}
//       <div className="nearby-grid">
//         {filteredLocations.map((item) => (
//           <NearbyCard
//             key={item._stableId}
//             item={item}
//             isActive={activeId === item._stableId}
//             onHover={setHoveredId}
//             onCardClick={setActiveId}
//           />
//         ))}
//       </div>
//     </div>
//   );
// }