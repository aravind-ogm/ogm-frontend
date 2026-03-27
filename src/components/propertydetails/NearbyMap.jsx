import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import MapLegend from './MapLegend';
import {
    categoryColour,
    isImportant,
    formatTime,
    estimateTravelTime,
    CATEGORY_COLOURS,
    renderStars,
} from './utils';

/* ─── Google Maps SDK loader (singleton) ────────────────────────────────── */
const GMAPS_KEY =
    process.env.REACT_APP_GOOGLE_MAPS_API_KEY ||
    'AIzaSyAMOnmpGRW9d36CNRQTjAavV4EjHGlXzO4';

function loadGoogleMaps() {
    if (typeof window.google?.maps?.Map === 'function') return Promise.resolve();
    if (document.getElementById('gmaps-sdk')) {
        return new Promise((resolve) => {
            const t = setInterval(() => {
                if (typeof window.google?.maps?.Map === 'function') { clearInterval(t); resolve(); }
            }, 100);
        });
    }
    return new Promise((resolve, reject) => {
        const script   = document.createElement('script');
        script.id      = 'gmaps-sdk';
        // Request marker library for AdvancedMarkerElement
        script.src     = `https://maps.googleapis.com/maps/api/js?key=${GMAPS_KEY}&libraries=places,geometry,marker`;
        script.async   = true;
        script.defer   = true;
        script.onload  = resolve;
        script.onerror = () => reject(new Error('Failed to load Google Maps'));
        document.head.appendChild(script);
    });
}

/* ─── MarkerClusterer loader (graceful fallback if unavailable) ─────────── */
function loadMarkerClusterer() {
    if (window._MarkerClusterer) return Promise.resolve(window._MarkerClusterer);
    return new Promise((resolve) => {
        const script = document.createElement('script');
        script.src   = 'https://unpkg.com/@googlemaps/markerclusterer@2.3.1/dist/index.min.js';
        script.async = true;
        script.onload = () => {
            const MC = window.markerClusterer?.MarkerClusterer;
            if (MC) window._MarkerClusterer = MC;
            resolve(MC || null);
        };
        script.onerror = () => resolve(null);
        document.head.appendChild(script);
    });
}

/* ─── Build SVG pin element for AdvancedMarkerElement ───────────────────── */
function buildPinElement(colour, num, important, isSelected = false) {
    const w = important ? 46 : 38;
    const h = important ? 56 : 48;
    const glowStyle = isSelected
        ? `filter: drop-shadow(0 0 8px ${colour}) drop-shadow(0 0 16px ${colour}80);`
        : '';
    const scale = isSelected ? 'transform: scale(1.25); transform-origin: bottom center;' : '';

    const svg = important
        ? `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 46 56" style="${glowStyle}${scale}">
            <ellipse cx="23" cy="54" rx="13" ry="5" fill="rgba(0,0,0,0.22)"/>
            <circle cx="23" cy="18" r="18" fill="${colour}" opacity="0.18"/>
            <path d="M23 2C13.6 2 6 9.6 6 19c0 11 17 33 17 33S40 30 40 19C40 9.6 32.4 2 23 2z"
                  fill="${colour}" stroke="white" stroke-width="2.5"/>
            <text x="23" y="22" text-anchor="middle" dominant-baseline="middle"
                  font-family="-apple-system,sans-serif" font-size="14" font-weight="800" fill="white">${num}</text>
            <circle cx="37" cy="7" r="8" fill="#facc15" stroke="white" stroke-width="2"/>
            <text x="37" y="7" text-anchor="middle" dominant-baseline="middle"
                  font-family="sans-serif" font-size="11" fill="#78350f">★</text>
           </svg>`
        : `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 38 48" style="${glowStyle}${scale}">
            <ellipse cx="19" cy="46" rx="10" ry="4" fill="rgba(0,0,0,0.20)"/>
            <path d="M19 2C11.3 2 5 8.3 5 16c0 10 14 30 14 30S33 26 33 16C33 8.3 26.7 2 19 2z"
                  fill="${colour}" stroke="white" stroke-width="2.2"/>
            <text x="19" y="19" text-anchor="middle" dominant-baseline="middle"
                  font-family="-apple-system,sans-serif" font-size="13" font-weight="700" fill="white">${num}</text>
           </svg>`;

    const div = document.createElement('div');
    div.innerHTML = svg;
    div.style.cssText = 'cursor:pointer;transition:transform 0.2s ease,filter 0.2s ease;';
    return div;
}

/* ─── Build property pin element ─────────────────────────────────────────── */
function buildPropertyPinElement() {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="60" viewBox="0 0 48 60">
        <ellipse cx="24" cy="58" rx="12" ry="5" fill="rgba(0,0,0,0.25)"/>
        <path d="M24 2C14.6 2 7 9.6 7 19c0 12 17 37 17 37S41 31 41 19C41 9.6 33.4 2 24 2z"
              fill="#ef4444" stroke="white" stroke-width="2.8"/>
        <text x="24" y="21" text-anchor="middle" dominant-baseline="middle"
              font-family="-apple-system,sans-serif" font-size="13" font-weight="800" fill="white">P</text>
    </svg>`;
    const div = document.createElement('div');
    div.innerHTML = svg;
    div.style.cssText = 'cursor:pointer;filter:drop-shadow(0 2px 8px rgba(239,68,68,0.5));';
    return div;
}

/* ─── Build InfoWindow HTML for a place ─────────────────────────────────── */
function buildInfoContent(loc, colour, num) {
    const travel     = estimateTravelTime(loc.distance);
    const stars      = renderStars(loc.rating);
    const travelHtml = travel
        ? `<div style="display:flex;gap:10px;margin-top:5px;">
             <span style="font-size:11px;color:#4b5563;">🚗 ${formatTime(travel.driveMin)}</span>
             <span style="font-size:11px;color:#4b5563;">🚶 ${formatTime(travel.walkMin)}</span>
           </div>`
        : '';
    const starsHtml  = stars
        ? `<div style="color:#f59e0b;font-size:12px;margin-top:3px;">${stars} <span style="color:#6b7280">${loc.rating}</span></div>`
        : '';
    const lat = parseFloat(loc.latitude ?? loc.lat);
    const lng = parseFloat(loc.longitude ?? loc.lng);

    return `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
                padding:10px 6px;min-width:210px;max-width:250px;">
      <div style="display:flex;align-items:flex-start;gap:9px;margin-bottom:8px;">
        <span style="background:${colour};color:#fff;border-radius:50%;width:26px;height:26px;
          display:inline-flex;align-items:center;justify-content:center;
          font-size:12px;font-weight:700;flex-shrink:0;margin-top:1px;">${num}</span>
        <strong style="font-size:14px;color:#0f172a;line-height:1.3;">${loc.name}</strong>
      </div>
      ${loc.category
        ? `<span style="background:${colour}1a;color:${colour};padding:3px 10px;
             border-radius:12px;font-size:11px;font-weight:700;">${loc.category}</span><br/>`
        : ''}
      ${starsHtml}
      ${loc.distance
        ? `<span style="color:#15803d;font-size:12px;font-weight:600;
             margin-top:6px;display:block;">📏 ${loc.distance}</span>`
        : ''}
      ${travelHtml}
      <div style="margin-top:10px;">
        <a href="https://www.google.com/maps/search/?api=1&query=${lat},${lng}"
           target="_blank" rel="noopener noreferrer"
           style="display:inline-flex;align-items:center;gap:5px;
                  color:#2563eb;font-size:12px;font-weight:600;text-decoration:none;">
          🗺 Open in Maps →
        </a>
      </div>
    </div>`;
}

/* ═══════════════════════════════════════════════════════════════════════════
   NearbyMap Component
═══════════════════════════════════════════════════════════════════════════ */
export default function NearbyMap({
                                      locations,              // filtered + sorted (currently visible)
                                      allLocations,           // full set (markers created once from this)
                                      propertyLocation,
                                      propertyName,
                                      activeId,               // click-selected place _stableId
                                      hoveredId,              // hovered card _stableId (bounce only)
                                      activeFilter,           // 'All' | 'restaurant' | 'hospital' … — drives highlight logic
                                      isPanelOpen,
                                      travelMode,             // 'DRIVING' | 'WALKING'
                                      directionsRequest,      // { from, to } | null
                                      onMarkerClick,          // (sid) => void
                                      onPropertyMarkerClick,  // () => void
                                      onPropertyCoordsReady,  // (LatLng) => void
                                      onMapBackgroundClick,   // () => void — close panel when map bg clicked
                                  }) {
    const containerRef   = useRef(null);
    const mapRef         = useRef(null);
    // { [_stableId]: { marker, element, infoContent, colour, position, isImportant } }
    const markersRef     = useRef({});
    const propMarkerRef  = useRef(null);
    const infoWinRef     = useRef(null);
    const dirServiceRef  = useRef(null);
    const dirRendererRef = useRef(null);
    const clustererRef   = useRef(null);
    const bounceTimerRef = useRef({});
    const glowTimerRef   = useRef({});

    const [mapsReady, setMapsReady] = useState(
        typeof window.google?.maps?.Map === 'function'
    );
    const [mapError, setMapError] = useState(false);

    /* Derive categories present (for legend) */
    const presentCategories = useMemo(() => {
        const s = new Set();
        allLocations.forEach((loc) => {
            if (loc.category) {
                const c = loc.category.toLowerCase();
                Object.keys(CATEGORY_COLOURS).forEach((k) => {
                    if (c.includes(k)) s.add(k);
                });
            }
        });
        return s;
    }, [allLocations]);

    /* ── 1. Load SDK ── */
    useEffect(() => {
        if (mapsReady) return;
        loadGoogleMaps()
            .then(() => setMapsReady(true))
            .catch(() => setMapError(true));
    }, [mapsReady]);

    /* ── 2. Build map + markers once ── */
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
            clickableIcons:    false, // prevent POI popups from interfering
            mapId:             'DEMO_MAP_ID', // required for AdvancedMarkerElement
            styles: [
                { featureType: 'poi.business', stylers: [{ visibility: 'off' }] },
                { featureType: 'transit',      stylers: [{ visibility: 'simplified' }] },
            ],
        });
        mapRef.current = map;

        const infoWindow = new G.InfoWindow({ maxWidth: 260 });
        infoWinRef.current = infoWindow;

        // Directions
        const dirService  = new G.DirectionsService();
        const dirRenderer = new G.DirectionsRenderer({
            suppressMarkers: true,
            polylineOptions: {
                strokeColor:   '#2563eb',
                strokeOpacity: 0,
                strokeWeight:  6,
                icons: [{
                    icon: {
                        path:          'M 0,-1 0,1',
                        strokeOpacity: 1,
                        strokeWeight:  5,
                        strokeColor:   '#2563eb',
                        scale:         4,
                    },
                    offset: '0',
                    repeat: '20px',
                }],
            },
            preserveViewport: false,  // ← allow map to zoom/pan to show full route
        });
        dirRenderer.setMap(map);
        dirServiceRef.current  = dirService;
        dirRendererRef.current = dirRenderer;

        const bounds = new G.LatLngBounds();

        // Map background click → close panel (deselect)
        map.addListener('click', () => {
            infoWindow.close();
            if (onMapBackgroundClick) onMapBackgroundClick();
        });

        /* ── Build markers for all locations ── */
        const useAdvanced = !!window.google?.maps?.marker?.AdvancedMarkerElement;
        const markersForClustering = [];

        allLocations.forEach((loc, i) => {
            const lat = parseFloat(loc.latitude ?? loc.lat);
            const lng = parseFloat(loc.longitude ?? loc.lng);
            if (isNaN(lat) || isNaN(lng)) return;

            const sid       = loc._stableId ?? String(i);
            const colour    = categoryColour(loc.category);
            const important = isImportant(loc.category);
            const num       = String(loc._index !== undefined ? loc._index + 1 : i + 1);
            const position  = { lat, lng };
            const infoContent = buildInfoContent(loc, colour, num);

            let marker;
            let element = null;

            if (useAdvanced) {
                element = buildPinElement(colour, num, important, false);
                marker  = new window.google.maps.marker.AdvancedMarkerElement({
                    position,
                    map,
                    title:   loc.name,
                    content: element,
                    zIndex:  important ? i + 100 : i + 1,
                });
                marker.addListener('click', (e) => {
                    // Stop event bubbling so map background click doesn't also fire
                    if (e?.domEvent) e.domEvent.stopPropagation();
                    infoWindow.setContent(infoContent);
                    infoWindow.open(map, marker);
                    onMarkerClick(sid);
                });
            } else {
                // Fallback to legacy Marker
                const icon = buildLegacyIcon(G, colour, num, important);
                marker = new G.Marker({
                    position,
                    map,
                    title:     loc.name,
                    icon,
                    animation: G.Animation.DROP,
                    zIndex:    important ? i + 100 : i + 1,
                });
                marker.addListener('click', () => {
                    infoWindow.setContent(infoContent);
                    infoWindow.open(map, marker);
                    onMarkerClick(sid);
                });
            }

            markersRef.current[sid] = {
                marker, element, infoContent, colour, position,
                isImportant: important, num,
            };
            markersForClustering.push(marker);
            bounds.extend(position);
        });

        // Clustering (only for legacy markers; AdvancedMarker clustering requires extra setup)
        if (!useAdvanced) {
            loadMarkerClusterer().then((MC) => {
                if (MC && markersForClustering.length > 12) {
                    try {
                        clustererRef.current = new MC({ map, markers: markersForClustering });
                    } catch (_) {}
                }
            });
        }

        /* ── Property marker ── */
        const addPropertyMarker = (pos) => {
            let propMarker;
            if (useAdvanced) {
                const el = buildPropertyPinElement();
                propMarker = new window.google.maps.marker.AdvancedMarkerElement({
                    position:  pos,
                    map,
                    title:     propertyName || 'This Property',
                    content:   el,
                    zIndex:    9999,
                });
            } else {
                propMarker = new G.Marker({
                    position:  pos,
                    map,
                    title:     propertyName || 'This Property',
                    zIndex:    9999,
                    animation: G.Animation.BOUNCE,
                    icon: {
                        url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(buildPropertySVG()),
                        scaledSize: new G.Size(44, 54),
                        anchor:     new G.Point(22, 54),
                    },
                });
                setTimeout(() => propMarker.setAnimation(null), 2200);
            }

            const propInfoHtml = `
              <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;padding:10px 6px;min-width:190px;">
                <strong style="color:#ef4444;font-size:14px;">📍 ${propertyName || 'This Property'}</strong>
                <p style="font-size:12px;color:#374151;margin:5px 0 10px;">${propertyLocation}</p>
                <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                propertyLocation.toLowerCase().includes('india')
                    ? propertyLocation
                    : propertyLocation + ', India'
            )}" target="_blank" rel="noopener noreferrer"
                   style="color:#2563eb;font-size:12px;font-weight:600;text-decoration:none;">
                  🗺 Open in Google Maps →
                </a>
              </div>`;

            propMarker.addListener('click', (e) => {
                if (e?.domEvent) e.domEvent.stopPropagation();
                onPropertyMarkerClick();
                infoWindow.setContent(propInfoHtml);
                infoWindow.open(map, propMarker);
            });

            propMarkerRef.current = propMarker;
            if (onPropertyCoordsReady) {
                onPropertyCoordsReady({ lat: pos.lat(), lng: pos.lng() });
            }
            bounds.extend(pos);

            const total = Object.keys(markersRef.current).length;
            if (total > 0) map.fitBounds(bounds, { top: 60, right: 40, bottom: 80, left: 60 });
            else map.setCenter(pos);
        };

        if (propertyLocation) {
            const q = propertyLocation.toLowerCase().includes('india')
                ? propertyLocation
                : `${propertyLocation}, India`;
            new G.Geocoder().geocode({ address: q }, (results, status) => {
                if (status === 'OK' && results[0]) addPropertyMarker(results[0].geometry.location);
            });
        }

        const total = Object.keys(markersRef.current).length;
        if (total > 1) map.fitBounds(bounds, { top: 60, right: 40, bottom: 80, left: 60 });
        else if (total === 1) map.setCenter(Object.values(markersRef.current)[0].position);

        setTimeout(() => G.event.trigger(map, 'resize'), 400);

        return () => {
            Object.values(markersRef.current).forEach(({ marker }) => {
                if (marker.setMap) marker.setMap(null);
                else marker.map = null;
            });
            markersRef.current = {};
            if (propMarkerRef.current) {
                if (propMarkerRef.current.setMap) propMarkerRef.current.setMap(null);
                else propMarkerRef.current.map = null;
            }
            if (dirRendererRef.current) dirRendererRef.current.setMap(null);
            if (clustererRef.current) {
                try { clustererRef.current.clearMarkers(); } catch (_) {}
            }
            mapRef.current = null;
        };
    }, [mapsReady]); // eslint-disable-line -- marker setup runs once when SDK is ready

    /* ── 3. Filter changes → highlight matching markers, dim the rest ──────
       ALL markers stay on the map. When a category filter is active:
         • Matching markers  → full opacity + glow ring + scale up (highlighted)
         • Non-matching      → dimmed to 22% opacity, shrunk slightly
         • 'All' selected    → every marker at full opacity, no glow
       Map auto-fits to the highlighted set.
    ─────────────────────────────────────────────────────────────────────── */
    useEffect(() => {
        if (!mapRef.current) return;
        const G            = window.google.maps;
        const isFiltered   = activeFilter && activeFilter !== 'All';
        const highlightIds = new Set(locations.map((l) => l._stableId));
        const bounds       = new G.LatLngBounds();
        let   hasHighlight = false;

        Object.entries(markersRef.current).forEach(([sid, entry]) => {
            const { marker, element, position, colour } = entry;
            const highlighted = !isFiltered || highlightIds.has(sid);

            // Always keep ALL markers on the map
            if (marker.map !== undefined) {
                marker.map = mapRef.current;
            } else if (marker.setMap) {
                marker.setMap(mapRef.current);
            }

            if (element) {
                // AdvancedMarkerElement — style the DOM element directly
                if (highlighted) {
                    element.style.opacity        = '1';
                    element.style.transform      = isFiltered ? 'scale(1.22)' : 'scale(1)';
                    element.style.transformOrigin = 'bottom center';
                    element.style.filter         = isFiltered
                        ? `drop-shadow(0 0 8px ${colour}) drop-shadow(0 0 18px ${colour}80)`
                        : '';
                    element.style.transition     = 'opacity 0.3s ease, transform 0.3s ease, filter 0.3s ease';
                    element.style.zIndex         = '10';
                } else {
                    element.style.opacity        = '0.22';
                    element.style.transform      = 'scale(0.85)';
                    element.style.transformOrigin = 'bottom center';
                    element.style.filter         = 'grayscale(70%)';
                    element.style.transition     = 'opacity 0.3s ease, transform 0.3s ease, filter 0.3s ease';
                    element.style.zIndex         = '1';
                }
            } else if (marker.setOpacity) {
                // Legacy marker fallback
                marker.setOpacity(highlighted ? 1 : 0.22);
                if (marker.setZIndex) marker.setZIndex(highlighted ? 10 : 1);
            }

            if (highlighted) {
                bounds.extend(position);
                hasHighlight = true;
            }
        });

        // Always include property marker in bounds
        if (propMarkerRef.current?.position)
            bounds.extend(propMarkerRef.current.position);
        else if (propMarkerRef.current?.getPosition?.())
            bounds.extend(propMarkerRef.current.getPosition());

        if (hasHighlight)
            mapRef.current.fitBounds(bounds, { top: 70, right: 50, bottom: 90, left: 60 });
    }, [locations, activeFilter]); // eslint-disable-line

    /* ── 4. Resize map when panel opens/closes ── */
    useEffect(() => {
        if (!mapRef.current) return;
        setTimeout(() => {
            window.google?.maps?.event.trigger(mapRef.current, 'resize');
        }, 350);
    }, [isPanelOpen]);

    /* ── 5. hoveredId → glow effect (no InfoWindow) ── */
    useEffect(() => {
        if (!mapRef.current) return;

        // Clear previous glow
        Object.entries(glowTimerRef.current).forEach(([sid, timer]) => {
            clearTimeout(timer);
            const entry = markersRef.current[sid];
            if (entry?.element && !activeId) {
                entry.element.style.filter = '';
                entry.element.style.transform = '';
            }
        });
        glowTimerRef.current = {};

        if (hoveredId == null) return;
        const entry = markersRef.current[hoveredId] ?? markersRef.current[String(hoveredId)];
        if (!entry) return;

        const isVisible = entry.marker.map !== undefined
            ? !!entry.marker.map
            : entry.marker.getMap?.() !== null;
        if (!isVisible) return;

        if (entry.element) {
            // AdvancedMarker: apply glow via element style
            entry.element.style.filter = `drop-shadow(0 0 10px ${entry.colour})`;
            entry.element.style.transform = 'scale(1.15)';
            entry.element.style.transformOrigin = 'bottom center';
            entry.element.style.transition = 'transform 0.2s ease, filter 0.2s ease';
            glowTimerRef.current[hoveredId] = setTimeout(() => {
                if (entry.element && hoveredId !== activeId) {
                    entry.element.style.filter = '';
                    entry.element.style.transform = '';
                }
            }, 800);
        } else if (entry.marker.setAnimation) {
            // Legacy marker: bounce
            entry.marker.setAnimation(window.google.maps.Animation.BOUNCE);
            glowTimerRef.current[hoveredId] = setTimeout(() => {
                if (entry.marker.getMap()) entry.marker.setAnimation(null);
            }, 700);
        }
    }, [hoveredId, activeId]);

    /* ── 6. activeId → zoom + InfoWindow + dim others + highlight selected ── */
    useEffect(() => {
        if (!mapRef.current) return;
        const G = window.google.maps;

        // Build the currently-highlighted set from the filter (so we can restore it)
        const isFiltered     = activeFilter && activeFilter !== 'All';
        const highlightIds   = new Set(locations.map((l) => l._stableId));

        // Update all non-selected markers
        Object.entries(markersRef.current).forEach(([sid, entry]) => {
            if (sid === activeId) return; // selected marker handled below

            const inFilterSet  = !isFiltered || highlightIds.has(sid);
            // When a place is selected: dim everything else uniformly
            // When nothing selected: restore filter-highlight appearance
            const targetOpacity   = activeId ? '0.22' : (inFilterSet ? '1' : '0.22');
            const targetTransform = activeId ? 'scale(0.85)' : (inFilterSet && isFiltered ? 'scale(1.22)' : (inFilterSet ? 'scale(1)' : 'scale(0.85)'));
            const targetFilter    = activeId ? 'grayscale(70%)' : (inFilterSet && isFiltered ? `drop-shadow(0 0 8px ${entry.colour}) drop-shadow(0 0 18px ${entry.colour}80)` : (inFilterSet ? '' : 'grayscale(70%)'));

            if (entry.element) {
                entry.element.style.opacity        = targetOpacity;
                entry.element.style.transform      = targetTransform;
                entry.element.style.transformOrigin = 'bottom center';
                entry.element.style.filter         = targetFilter;
                entry.element.style.transition     = 'opacity 0.25s ease, transform 0.25s ease, filter 0.25s ease';
                entry.element.style.zIndex         = activeId ? '1' : (inFilterSet ? '10' : '1');
            } else if (entry.marker.setOpacity) {
                entry.marker.setOpacity(activeId ? 0.22 : (inFilterSet ? 1 : 0.22));
            }
        });

        if (!activeId) {
            infoWinRef.current?.close();
            dirRendererRef.current?.setDirections({ routes: [] });
            return;
        }

        const entry = markersRef.current[activeId] ?? markersRef.current[String(activeId)];
        if (!entry) return;

        const isVisible = entry.marker.map !== undefined
            ? !!entry.marker.map
            : entry.marker.getMap?.() !== null;
        if (!isVisible) return;

        // Highlight the active marker
        if (entry.element) {
            entry.element.style.opacity = '1';
            entry.element.style.filter  = `drop-shadow(0 0 12px ${entry.colour}) drop-shadow(0 0 24px ${entry.colour}80)`;
            entry.element.style.transform = 'scale(1.3)';
            entry.element.style.transformOrigin = 'bottom center';
            entry.element.style.transition = 'transform 0.25s ease, filter 0.25s ease';
            entry.element.style.zIndex = '9999';
        } else if (entry.marker.setZIndex) {
            entry.marker.setZIndex(9998);
        }

        // Pan + smooth zoom
        mapRef.current.panTo(entry.position);
        if (mapRef.current.getZoom() < 15) {
            mapRef.current.setZoom(15);
        }

        // Open InfoWindow
        infoWinRef.current.setContent(entry.infoContent);
        infoWinRef.current.open(mapRef.current, entry.marker);

        // Legacy bounce
        if (entry.marker.setAnimation) {
            clearTimeout(bounceTimerRef.current[activeId]);
            entry.marker.setAnimation(G.Animation.BOUNCE);
            bounceTimerRef.current[activeId] = setTimeout(() => {
                if (entry.marker.getMap()) entry.marker.setAnimation(null);
            }, 1400);
        }

        // Cleanup glow when deselected
        return () => {
            if (entry.element) {
                entry.element.style.filter    = '';
                entry.element.style.transform = '';
            }
        };
    }, [activeId, activeFilter, locations]); // eslint-disable-line

    /* ── 7. Draw / update directions route ── */
    useEffect(() => {
        if (!dirServiceRef.current || !dirRendererRef.current) return;

        if (!directionsRequest) {
            dirRendererRef.current.setDirections({ routes: [] });
            return;
        }

        const { from, to } = directionsRequest;
        if (!from || !to) return;

        console.log('[NearbyMap] Route:', `FROM ${from.lat},${from.lng}  →  TO ${to.lat},${to.lng}`);

        dirServiceRef.current.route(
            {
                origin:      new window.google.maps.LatLng(from.lat, from.lng),
                destination: new window.google.maps.LatLng(to.lat,   to.lng),
                travelMode:  window.google.maps.TravelMode[travelMode] || window.google.maps.TravelMode.DRIVING,
            },
            (result, status) => {
                if (status === 'OK') {
                    dirRendererRef.current.setDirections(result);
                } else {
                    console.warn('Directions API failed:', status);
                }
            },
        );
    }, [directionsRequest, travelMode]);

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
                style={{ opacity: mapsReady ? 1 : 0 }}
            />
            <MapLegend presentCategories={presentCategories} />
        </div>
    );
}

/* ─── Helpers for fallback legacy markers ────────────────────────────────── */
function buildLegacyIcon(G, colour, num, important) {
    const w = important ? 44 : 36;
    const h = important ? 53 : 44;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 36 44">
        <ellipse cx="18" cy="42" rx="8" ry="3" fill="rgba(0,0,0,0.18)"/>
        <path d="M18 2C10.268 2 4 8.268 4 16c0 9 14 26 14 26S32 25 32 16C32 8.268 25.732 2 18 2z"
              fill="${colour}" stroke="white" stroke-width="2"/>
        <text x="18" y="20" text-anchor="middle" dominant-baseline="middle"
              font-family="sans-serif" font-size="13" font-weight="700" fill="white">${num}</text>
       </svg>`;
    return {
        url:        'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg),
        scaledSize: new G.Size(w, h),
        anchor:     new G.Point(w / 2, h),
    };
}

function buildPropertySVG() {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="44" height="54" viewBox="0 0 44 54">
        <ellipse cx="22" cy="52" rx="11" ry="4.5" fill="rgba(0,0,0,0.22)"/>
        <path d="M22 2C13.7 2 7 8.7 7 17c0 10.5 15 33 15 33S37 27.5 37 17C37 8.7 30.3 2 22 2z"
              fill="#ef4444" stroke="white" stroke-width="2.5"/>
        <text x="22" y="19" text-anchor="middle" dominant-baseline="middle"
              font-family="sans-serif" font-size="12" font-weight="800" fill="white">P</text>
    </svg>`;
}