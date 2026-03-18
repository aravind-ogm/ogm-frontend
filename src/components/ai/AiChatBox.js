import React, { useState, useEffect, useRef, useCallback } from "react";
import Icon from "./Icon";
import AiMessage from "./AiMessage";
import SuggestionChips from "./SuggestionChips";
import { formatPrice } from "./Helpers";
import { detectRouteIntent } from "./RouteHelper";
import "../../styles/ai/ai-chatbox.css";

/* ─── Google Maps API key ──────────────────────────────────────────────────── */
const GMAPS_KEY =
  process.env.REACT_APP_GOOGLE_MAPS_API_KEY ||
  "AIzaSyAMOnmpGRW9d36CNRQTjAavV4EjHGlXzO4";

/* Load SDK once — Places library needed for the search box.
   IMPORTANT: Do NOT add &loading=async — that switches to the modular API
   which breaks the legacy  new google.maps.Map()  constructor.             */
function loadGoogleMaps() {
  // Check Map constructor is actually callable, not just that the namespace exists
  if (typeof window.google?.maps?.Map === "function") return Promise.resolve();

  if (document.getElementById("gmaps-sdk")) {
    // Script already injected — poll until Map constructor is ready
    return new Promise((resolve) => {
      const t = setInterval(() => {
        if (typeof window.google?.maps?.Map === "function") { clearInterval(t); resolve(); }
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
    script.onerror = () => reject(new Error("Failed to load Google Maps SDK"));
    document.head.appendChild(script);
  });
}

/* Travel mode config */
const TRAVEL_MODES = [
  { key: "DRIVING",   label: "Drive",   icon: "🚗" },
  { key: "TRANSIT",   label: "Transit", icon: "🚌" },
  { key: "WALKING",   label: "Walk",    icon: "🚶" },
  { key: "BICYCLING", label: "Cycle",   icon: "🚲" },
];

/* ─────────────────────────────────────────────────────────────────────────── */

export default function AiChatBox({
  chat,
  loading = false,
  onSend,
  onEditMessage,
  onRetry,
  onCopy,
  userPosition,
}) {
  const [input,          setInput]          = useState("");
  const [mapProperties,  setMapProperties]  = useState(null);
  const [mapsReady,      setMapsReady]      = useState(typeof window.google?.maps?.Map === "function");
  const [activeListItem, setActiveListItem] = useState(null);

  /* Route state */
  const [routeRequest,   setRouteRequest]   = useState(null);  // { origin, destination }
  const [routeMode,      setRouteMode]      = useState("DRIVING");
  const [routeResult,    setRouteResult]    = useState(null);  // { distance, duration, steps }
  const [routeError,     setRouteError]     = useState(null);
  const [routeLoading,   setRouteLoading]   = useState(false);

  const messagesEndRef   = useRef(null);
  const textareaRef      = useRef(null);
  const mapContainerRef  = useRef(null);
  const searchInputRef   = useRef(null);
  const mapInstanceRef   = useRef(null);
  const markersRef       = useRef([]);
  const infoWindowRef    = useRef(null);
  const autocompleteRef  = useRef(null);
  const dirRendererRef   = useRef(null);   // google.maps.DirectionsRenderer

  /* ── Scroll / focus / reset ── */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat?.messages?.length, loading]);

  useEffect(() => { setTimeout(() => textareaRef.current?.focus(), 60); }, [chat?.id]);

  useEffect(() => {
    setMapProperties(null);
    setRouteRequest(null);
    setRouteResult(null);
    setRouteError(null);
  }, [chat?.id]);

  /* ── Load Maps SDK ── */
  useEffect(() => {
    if (mapsReady) return;
    loadGoogleMaps()
      .then(() => setMapsReady(true))
      .catch((err) => console.error("[AiChatBox]", err.message));
  }, [mapsReady]);

  /* ─────────────────────────────────────────────────────────────────────────
     AUTO-DETECT route intent from the LAST user message in the chat.
     When the user sends something like "distance between X and Y", we
     automatically open the map and trigger a directions request.
     ───────────────────────────────────────────────────────────────────────── */
  useEffect(() => {
    if (!chat?.messages?.length) return;

    const msgs     = chat.messages;
    const lastUser = [...msgs].reverse().find((m) => m.role === "user");
    if (!lastUser) return;

    const route = detectRouteIntent(lastUser.text);
    if (route) {
      // Auto-open map and set route request
      setRouteRequest(route);
      setRouteResult(null);
      setRouteError(null);
      // If there are also properties in the last AI reply, show them too
      const lastAi = [...msgs].reverse().find((m) => m.role === "ai");
      if (lastAi?.properties?.length) {
        setMapProperties(lastAi.properties);
      } else if (!mapProperties) {
        // open map even with no properties so route is visible
        setMapProperties([]);
      }
    }
  }, [chat?.messages?.length]); // eslint-disable-line

  /* ── Destroy map cleanly ── */
  const destroyMap = useCallback(() => {
    dirRendererRef.current?.setMap(null);
    dirRendererRef.current = null;
    autocompleteRef.current = null;
    markersRef.current.forEach((m) => m?.setMap(null));
    markersRef.current = [];
    infoWindowRef.current?.close();
    if (mapContainerRef.current) mapContainerRef.current.innerHTML = "";
    mapInstanceRef.current = null;
    setActiveListItem(null);
  }, []);

  /* ── Compute & render route ── */
  const renderRoute = useCallback((map, origin, destination, mode = "DRIVING") => {
    if (!map || !origin || !destination) return;
    const G = window.google.maps;

    setRouteLoading(true);
    setRouteError(null);

    // Clear previous route
    if (dirRendererRef.current) {
      dirRendererRef.current.setMap(null);
      dirRendererRef.current = null;
    }

    const directionsService  = new G.DirectionsService();
    const directionsRenderer = new G.DirectionsRenderer({
      suppressMarkers: false,
      polylineOptions: {
        strokeColor:   "#2563eb",
        strokeWeight:  5,
        strokeOpacity: 0.85,
      },
    });
    directionsRenderer.setMap(map);
    dirRendererRef.current = directionsRenderer;

    directionsService.route(
      {
        origin,
        destination,
        travelMode: G.TravelMode[mode],
        provideRouteAlternatives: false,
      },
      (result, status) => {
        setRouteLoading(false);
        if (status === "OK") {
          directionsRenderer.setDirections(result);
          const leg = result.routes[0].legs[0];
          setRouteResult({
            distance:    leg.distance.text,
            duration:    leg.duration.text,
            origin:      leg.start_address,
            destination: leg.end_address,
            steps:       leg.steps.map((s) => ({
              instruction: s.instructions.replace(/<[^>]+>/g, ""), // strip HTML tags
              distance:    s.distance.text,
            })),
          });
          setRouteError(null);
        } else {
          setRouteError(
            status === "NOT_FOUND"
              ? "Could not find one of the locations. Try being more specific."
              : status === "ZERO_RESULTS"
              ? "No route found between these locations."
              : `Directions failed: ${status}`
          );
          setRouteResult(null);
        }
      }
    );
  }, []);

  /* ── Re-run route when mode changes ── */
  useEffect(() => {
    if (!routeRequest || !mapInstanceRef.current || !mapsReady) return;
    renderRoute(mapInstanceRef.current, routeRequest.origin, routeRequest.destination, routeMode);
  }, [routeMode, routeRequest, mapsReady, renderRoute]);

  /* ── Focus a marker by index ── */
  const focusMarker = useCallback((index) => {
    const map    = mapInstanceRef.current;
    const marker = markersRef.current[index];
    const iw     = infoWindowRef.current;
    const prop   = mapProperties?.[index];
    if (!map || !marker || !prop) return;

    map.panTo(marker.getPosition());
    map.setZoom(15);
    iw.setContent(
      `<div style="font-family:sans-serif;min-width:200px;padding:4px 2px;">
         <strong style="font-size:14px;display:block;margin-bottom:4px;">${prop.title ?? ""}</strong>
         <span style="color:#6b7280;font-size:12px;">${prop.location ?? ""}</span><br/>
         <span style="color:#2563eb;font-weight:700;font-size:14px;">${formatPrice(prop.price)}</span>
       </div>`
    );
    iw.open(map, marker);
    setActiveListItem(index);
  }, [mapProperties]);

  /* ── Build / rebuild map ── */
  useEffect(() => {
    // mapProperties === null  → panel is completely closed
    // mapProperties === []    → panel open for route only (no property pins)
    if (mapProperties === null) { destroyMap(); return; }
    if (!mapsReady)              return;

    destroyMap();
    if (!mapContainerRef.current) return;

    const G = window.google.maps;

    /* Parse property coords */
    const parsedCoords = (mapProperties || []).map((p) => {
      const lat = parseFloat(p.latitude ?? p.lat);
      const lng = parseFloat(p.longitude ?? p.lng ?? p.lon);
      return !isNaN(lat) && !isNaN(lng) ? { lat, lng } : null;
    });
    const validCoords = parsedCoords.filter(Boolean);

    let center = { lat: 12.9716, lng: 77.5946 };
    if (validCoords.length > 0) {
      center = {
        lat: validCoords.reduce((s, c) => s + c.lat, 0) / validCoords.length,
        lng: validCoords.reduce((s, c) => s + c.lng, 0) / validCoords.length,
      };
    }

    const map = new G.Map(mapContainerRef.current, {
      center,
      zoom:              validCoords.length === 1 ? 15 : 12,
      mapTypeControl:    false,
      streetViewControl: false,
      fullscreenControl: true,
      zoomControl:       true,
    });
    mapInstanceRef.current = map;

    const infoWindow = new G.InfoWindow();
    infoWindowRef.current = infoWindow;

    /* Property markers */
    const makeIcon = (colour) => ({
      path:         G.SymbolPath.CIRCLE,
      fillColor:    colour,
      fillOpacity:  1,
      strokeColor:  "#ffffff",
      strokeWeight: 2,
      scale:        15,
    });

    const bounds     = new G.LatLngBounds();
    const newMarkers = (mapProperties || []).map((prop, i) => {
      const coords      = parsedCoords[i];
      const approximate = !coords;
      const lat = coords ? coords.lat : 12.9716 + (Math.floor(i / 3) - 1) * 0.04;
      const lng = coords ? coords.lng : 77.5946 + ((i % 3) - 1) * 0.05;

      const marker = new G.Marker({
        position: { lat, lng },
        map,
        label:    { text: String(i + 1), color: "#fff", fontWeight: "700", fontSize: "12px" },
        title:    prop.title,
        icon:     makeIcon(approximate ? "#9ca3af" : "#2563eb"),
      });

      marker.addListener("click", () => {
        infoWindow.setContent(
          `<div style="font-family:sans-serif;min-width:200px;padding:4px 2px;">
             <strong style="font-size:14px;display:block;margin-bottom:4px;">${prop.title ?? ""}</strong>
             <span style="color:#6b7280;font-size:12px;">${prop.location ?? ""}</span><br/>
             <span style="color:#2563eb;font-weight:700;font-size:14px;">${formatPrice(prop.price)}</span>
             ${approximate ? '<br/><em style="font-size:11px;color:#9ca3af;">Approximate location</em>' : ""}
           </div>`
        );
        infoWindow.open(map, marker);
        setActiveListItem(i);
      });

      bounds.extend({ lat, lng });
      return marker;
    });

    markersRef.current = newMarkers;
    if ((mapProperties || []).length > 1) map.fitBounds(bounds, 60);

    /* Places Autocomplete */
    if (searchInputRef.current) {
      const autocomplete = new G.places.Autocomplete(searchInputRef.current, {
        fields: ["geometry", "name", "formatted_address"],
      });
      autocomplete.addListener("place_changed", () => {
        const place = autocomplete.getPlace();
        if (!place.geometry?.location) return;
        map.panTo(place.geometry.location);
        map.setZoom(15);
        new G.Marker({
          position: place.geometry.location,
          map,
          title: place.name,
          icon: {
            path: G.SymbolPath.BACKWARD_CLOSED_ARROW,
            fillColor: "#ef4444", fillOpacity: 1,
            strokeColor: "#fff", strokeWeight: 1.5, scale: 7,
          },
        });
        infoWindow.setContent(
          `<div style="font-family:sans-serif;padding:4px 2px;">
             <strong>${place.name ?? ""}</strong><br/>
             <span style="color:#6b7280;font-size:12px;">${place.formatted_address ?? ""}</span>
           </div>`
        );
        infoWindow.setPosition(place.geometry.location);
        infoWindow.open(map);
      });
      autocompleteRef.current = autocomplete;
    }

    /* If a route was already requested (e.g. auto-detected), render it now */
    if (routeRequest) {
      renderRoute(map, routeRequest.origin, routeRequest.destination, routeMode);
    }

    setTimeout(() => G.event.trigger(map, "resize"), 420);
    return destroyMap;
  }, [mapProperties, mapsReady]); // eslint-disable-line

  /* ── Input handlers ── */
  const handleInputChange = useCallback((e) => {
    setInput(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 140) + "px";
  }, []);

  const handleSend = useCallback((t) => {
    const text = (t || input).trim();
    if (!text || loading) return;
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    onSend?.(text);
  }, [input, loading, onSend]);

  const handleFollowUp = useCallback((s) => {
    if (!loading) onSend?.(s);
  }, [loading, onSend]);

  const handleMapView = useCallback((properties) => {
    setMapProperties((prev) => {
      if (prev === properties) return null;
      // Clear route when switching property sets
      setRouteRequest(null);
      setRouteResult(null);
      return properties;
    });
  }, []);

  /* Called from AiMessage when user clicks "Show Route" button */
  const handleRouteView = useCallback((origin, destination) => {
    setRouteRequest({ origin, destination });
    setRouteResult(null);
    setRouteError(null);
    setRouteMode("DRIVING");
    // Ensure map is open (with whatever properties are showing, or empty)
    setMapProperties((prev) => prev ?? []);
  }, []);

  const closeMap = useCallback(() => {
    setMapProperties(null);
    setRouteRequest(null);
    setRouteResult(null);
    setRouteError(null);
  }, []);

  const isMapOpen       = mapProperties !== null;
  const hasProperties   = (mapProperties?.length ?? 0) > 0;
  const isRouteActive   = !!routeRequest;

  /* ── Empty state ── */
  if (!chat) {
    return (
      <div className="ai-content">
        <div className="chat-empty-state">
          <div className="chat-empty-icon"><Icon name="sparkle" size={28} /></div>
          <h2>AI Property Agent</h2>
          <p>Search, compare, and discover properties. Ask anything to get started.</p>
        </div>
      </div>
    );
  }

  const messages = chat.messages || [];

  return (
    <div className="ai-content">
      <div className="ai-split-wrapper">

        {/* ══════════════════════════════
            LEFT: CHAT PANEL
            ══════════════════════════════ */}
        <div className={`ai-chat-panel ${isMapOpen ? "with-map" : ""}`}>
          <div className="chat-messages-area">
            {messages.length === 0 && !loading ? (
              <div className="chat-empty-state">
                <div className="chat-empty-icon"><Icon name="sparkle" size={28} /></div>
                <h2>What can I help you find?</h2>
                <p>Search for properties, compare listings, or ask anything about real estate.</p>
                <SuggestionChips onSelect={(v) => handleSend(v)} />
              </div>
            ) : (
              <div className="chat-messages-container">
                {messages.map((msg, i) => (
                  <AiMessage
                    key={msg.id || `msg-${i}`}
                    msg={msg}
                    chatId={chat.id}
                    index={i}
                    onEdit={onEditMessage}
                    onRetry={onRetry}
                    onCopy={onCopy}
                    onFollowUp={handleFollowUp}
                    onMapView={handleMapView}
                    onRouteView={handleRouteView}
                    isMapOpen={isMapOpen}
                    userPosition={userPosition}
                  />
                ))}
                {loading && (
                  <div className="message-row ai">
                    <div className="typing-indicator">
                      <div className="typing-dot" /><div className="typing-dot" /><div className="typing-dot" />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          <div className="chat-input-bar">
            <div className="chat-input-wrapper">
              <textarea
                ref={textareaRef}
                rows={1}
                value={input}
                onChange={handleInputChange}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
                }}
                placeholder="Ask anything — find, compare, and locate properties"
                disabled={loading}
              />
              <button
                className="chat-send-btn"
                onClick={() => handleSend()}
                disabled={!input.trim() || loading}
              >
                <Icon name="send" size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* ══════════════════════════════
            RIGHT: MAP PANEL
            ══════════════════════════════ */}
        {isMapOpen && (
          <div className="ai-map-panel">

            {/* ── Header ── */}
            <div className="ai-map-header">
              <span className="ai-map-title">
                {isRouteActive ? "🗺 Route & Directions" : "📍 Properties on Map"}
              </span>
              {hasProperties && !isRouteActive && (
                <span className="ai-map-count">{mapProperties.length} properties</span>
              )}
              <button className="ai-map-close" onClick={closeMap}>✕ Close</button>
            </div>

            {/* ── Route info card (shown when directions are computed) ── */}
            {isRouteActive && (
              <div className="ai-route-card">
                {/* Origin / Destination */}
                <div className="ai-route-od">
                  <div className="ai-route-od-row">
                    <span className="ai-route-dot origin" />
                    <span className="ai-route-od-label">
                      {routeResult?.origin || routeRequest.origin}
                    </span>
                  </div>
                  <div className="ai-route-od-line" />
                  <div className="ai-route-od-row">
                    <span className="ai-route-dot dest" />
                    <span className="ai-route-od-label">
                      {routeResult?.destination || routeRequest.destination}
                    </span>
                  </div>
                </div>

                {/* Travel mode tabs */}
                <div className="ai-route-modes">
                  {TRAVEL_MODES.map(({ key, label, icon }) => (
                    <button
                      key={key}
                      className={`ai-route-mode-btn${routeMode === key ? " active" : ""}`}
                      onClick={() => setRouteMode(key)}
                      title={label}
                    >
                      <span>{icon}</span>
                      <span>{label}</span>
                    </button>
                  ))}
                </div>

                {/* Result: distance + duration */}
                {routeLoading && (
                  <div className="ai-route-loading">
                    <span className="ai-route-spinner" /> Calculating route…
                  </div>
                )}

                {routeError && !routeLoading && (
                  <div className="ai-route-error">⚠️ {routeError}</div>
                )}

                {routeResult && !routeLoading && (
                  <div className="ai-route-summary">
                    <div className="ai-route-stat">
                      <span className="ai-route-stat-icon">📏</span>
                      <div>
                        <div className="ai-route-stat-value">{routeResult.distance}</div>
                        <div className="ai-route-stat-label">Distance</div>
                      </div>
                    </div>
                    <div className="ai-route-divider" />
                    <div className="ai-route-stat">
                      <span className="ai-route-stat-icon">⏱</span>
                      <div>
                        <div className="ai-route-stat-value">{routeResult.duration}</div>
                        <div className="ai-route-stat-label">
                          {routeMode === "DRIVING"   ? "Drive time"   :
                           routeMode === "TRANSIT"   ? "Transit time" :
                           routeMode === "WALKING"   ? "Walk time"    :
                           "Cycle time"}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Step-by-step directions toggle */}
                {routeResult?.steps?.length > 0 && (
                  <details className="ai-route-steps">
                    <summary>Step-by-step directions ({routeResult.steps.length} steps)</summary>
                    <ol className="ai-route-steps-list">
                      {routeResult.steps.map((s, i) => (
                        <li key={i}>
                          <span className="ai-route-step-instr">{s.instruction}</span>
                          <span className="ai-route-step-dist">{s.distance}</span>
                        </li>
                      ))}
                    </ol>
                  </details>
                )}
              </div>
            )}

            {/* ── Places search bar ── */}
            <div className="ai-map-search-bar">
              <svg className="ai-map-search-icon" width="15" height="15" viewBox="0 0 24 24"
                fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <circle cx="11" cy="11" r="7" /><line x1="16.5" y1="16.5" x2="22" y2="22" />
              </svg>
              <input
                ref={searchInputRef}
                className="ai-map-search-input"
                type="text"
                placeholder="Search any location on map…"
              />
            </div>

            {/* ── Map canvas ── */}
            <div className="ai-map-frame-wrap" ref={mapContainerRef} />

            {/* ── Property list (only shown when not in pure route mode) ── */}
            {hasProperties && (
              <div className="ai-map-list">
                {mapProperties.map((p, i) => (
                  <div
                    key={p.id || i}
                    className={`ai-map-item${activeListItem === i ? " active" : ""}`}
                    onClick={() => focusMarker(i)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === "Enter" && focusMarker(i)}
                    title="Click to show on map"
                  >
                    <div className="ai-map-item-marker">{i + 1}</div>
                    <div className="ai-map-item-info">
                      <div className="ai-map-item-title">{p.title}</div>
                      <div className="ai-map-item-loc">{p.location || "—"}</div>
                    </div>
                    <div className="ai-map-item-price">{formatPrice(p.price)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}