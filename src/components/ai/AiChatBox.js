import React, { useState, useEffect, useRef, useCallback } from "react";
import Icon from "./Icon";
import AiMessage from "./AiMessage";
import SuggestionChips, { SuggestionCards } from "./SuggestionChips";
import AiBottomSearchBar from "./AiBottomSearchBar";
import { formatPrice } from "./Helpers";
import { detectRouteIntent } from "./RouteHelper";
import "../../styles/ai/ai-chatbox.css";
import "../../styles/ai/ai-search.css";

/* ─────────────────────────────────────────────────────────────────────────────
   FIX 1: Removed hardcoded API key fallback.
   The key "AIzaSyAMOnmpGRW9d36CNRQTjAavV4EjHGlXzO4" was visible to every user
   in browser DevTools. Rotate that key immediately in Google Cloud Console.
   Add to your .env:  REACT_APP_GOOGLE_MAPS_API_KEY=your_new_key
   ───────────────────────────────────────────────────────────────────────────── */
const GMAPS_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;

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
    if (!GMAPS_KEY) {
      reject(new Error("REACT_APP_GOOGLE_MAPS_API_KEY is not set in .env"));
      return;
    }
    const script   = document.createElement("script");
    script.id      = "gmaps-sdk";
    script.src     = `https://maps.googleapis.com/maps/api/js?key=${GMAPS_KEY}&libraries=places,geometry,marker`;
    script.async   = true;
    script.defer   = true;
    script.onload  = resolve;
    script.onerror = () => reject(new Error("Failed to load Google Maps SDK"));
    document.head.appendChild(script);
  });
}

const TRAVEL_MODES = [
  { key: "DRIVING",   label: "Drive",   icon: "🚗" },
  { key: "TRANSIT",   label: "Transit", icon: "🚌" },
  { key: "WALKING",   label: "Walk",    icon: "🚶" },
  { key: "BICYCLING", label: "Cycle",   icon: "🚲" },
];

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
  const [mapsReady,      setMapsReady]      = useState(
      typeof window.google?.maps?.Map === "function"
  );
  const [activeListItem, setActiveListItem] = useState(null);
  const [routeRequest,   setRouteRequest]   = useState(null);
  const [routeMode,      setRouteMode]      = useState("DRIVING");
  const [routeResult,    setRouteResult]    = useState(null);
  const [routeError,     setRouteError]     = useState(null);
  const [routeLoading,   setRouteLoading]   = useState(false);

  const messagesEndRef  = useRef(null);
  const textareaRef     = useRef(null);
  const mapContainerRef = useRef(null);
  const searchInputRef  = useRef(null);
  const mapInstanceRef  = useRef(null);
  const markersRef      = useRef([]);
  const infoWindowRef   = useRef(null);
  const autocompleteRef = useRef(null);
  const dirRendererRef  = useRef(null);

  /* ── Scroll to latest message ── */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat?.messages?.length, loading]);

  /* ── Focus input on chat switch ── */
  useEffect(() => {
    setTimeout(() => textareaRef.current?.focus(), 60);
  }, [chat?.id]);

  /* ── Reset map state on chat switch ── */
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
        .catch((err) => console.error("[AiChatBox] Maps SDK:", err.message));
  }, [mapsReady]);

  /* ── Auto-detect route intent from last user message ──
     Resolves __PROPERTY__ token to actual property coords/name before storing.
  ── */
  useEffect(() => {
    if (!chat?.messages?.length) return;
    const msgs     = chat.messages;
    const lastUser = [...msgs].reverse().find((m) => m.role === "user");
    if (!lastUser) return;

    const route = detectRouteIntent(lastUser.text);
    if (!route) return;

    // Resolve __PROPERTY__ to actual coords or name from the last AI result
    if (route.usePropAsOrigin) {
      const lastAi = [...msgs].reverse().find((m) => m.role === "ai" && m.properties?.length);
      if (lastAi?.properties?.length) {
        const prop = lastAi.properties[0];
        const pLat = parseFloat(prop.latitude ?? prop.lat);
        const pLng = parseFloat(prop.longitude ?? prop.lng ?? prop.lon);
        if (!isNaN(pLat) && !isNaN(pLng) && pLat !== 0 && pLng !== 0) {
          // Use lat/lng object — DirectionsService handles it without geocoding
          route.origin      = { lat: pLat, lng: pLng };
          route.originLabel = prop.title || prop.location || "This Property";
        } else if (prop.location) {
          // Append city to avoid NOT_FOUND errors (e.g. "Bannerghatta Road, Bengaluru")
          route.origin      = prop.location;
          route.originLabel = prop.title || prop.location;
        }
      }
    }

    // Append ", Bengaluru" to single-word destinations to help geocoding
    if (route.destination && !route.destination.includes(",") && typeof route.destination === "string") {
      const lower = route.destination.toLowerCase();
      const isCityAlready = ["bengaluru","bangalore","mumbai","delhi","hyderabad","chennai","pune"].some(c => lower.includes(c));
      if (!isCityAlready) {
        route.destination = route.destination + ", Bengaluru";
      }
    }

    setRouteRequest(route);
    setRouteResult(null);
    setRouteError(null);
    const lastAi = [...msgs].reverse().find((m) => m.role === "ai");
    if (lastAi?.properties?.length) {
      setMapProperties(lastAi.properties);
    } else if (!mapProperties) {
      setMapProperties([]);
    }
  }, [chat?.messages]);

  /* ── Destroy map cleanly ── */
  const destroyMap = useCallback(() => {
    dirRendererRef.current?.setMap(null);
    dirRendererRef.current  = null;
    autocompleteRef.current = null;
    markersRef.current.forEach((m) => m?.setMap(null));
    markersRef.current = [];
    infoWindowRef.current?.close();
    if (mapContainerRef.current) mapContainerRef.current.innerHTML = "";
    mapInstanceRef.current = null;
    setActiveListItem(null);
  }, []);

  /* ── Render route on map — uses DirectionsService (still functional despite deprecation warning) ── */
  const renderRoute = useCallback((map, originArg, destinationArg, mode = "DRIVING") => {
    if (!map || !originArg || !destinationArg) return;
    const G = window.google.maps;

    setRouteLoading(true);
    setRouteError(null);

    if (dirRendererRef.current) {
      dirRendererRef.current.setMap(null);
      dirRendererRef.current = null;
    }

    const renderer = new G.DirectionsRenderer({
      suppressMarkers: false,
      polylineOptions: { strokeColor: "#2563eb", strokeWeight: 5, strokeOpacity: 0.85 },
    });
    renderer.setMap(map);
    dirRendererRef.current = renderer;

    // Build origin — handle {lat, lng} object or string address
    const buildLatLng = (val) => {
      if (!val) return null;
      if (typeof val === "object" && val.lat != null && val.lng != null) {
        return new G.LatLng(parseFloat(val.lat), parseFloat(val.lng));
      }
      return String(val); // address string — DirectionsService geocodes it
    };

    const origin      = buildLatLng(originArg);
    const destination = buildLatLng(destinationArg);

    if (!origin || !destination) {
      setRouteLoading(false);
      setRouteError("Could not resolve location. Please specify a full address or area name.");
      return;
    }

    new G.DirectionsService().route(
        { origin, destination, travelMode: G.TravelMode[mode] },
        (result, status) => {
          setRouteLoading(false);
          if (status === "OK") {
            renderer.setDirections(result);
            const leg = result.routes[0].legs[0];
            setRouteResult({
              distance:    leg.distance.text,
              duration:    leg.duration.text,
              origin:      leg.start_address,
              destination: leg.end_address,
              steps: leg.steps.map((s) => ({
                instruction: s.instructions.replace(/<[^>]+>/g, ""),
                distance:    s.distance.text,
              })),
            });
            setRouteError(null);
          } else {
            setRouteError(
                status === "NOT_FOUND"    ? "Could not find one of the locations. Please be more specific (e.g. \"Whitefield, Bengaluru\" instead of \"Whitefield\")" :
                    status === "ZERO_RESULTS" ? "No route found between these locations." :
                        `Directions unavailable (${status}). Try different locations.`
            );
            setRouteResult(null);
          }
        }
    );
  }, []);

  /* ── Re-render route when travel mode changes ──
     FIX 3: Proper deps — routeRequest and renderRoute now included
  ── */
  useEffect(() => {
    if (!routeRequest || !mapInstanceRef.current || !mapsReady) return;
    renderRoute(
        mapInstanceRef.current,
        routeRequest.origin,
        routeRequest.destination,
        routeMode
    );
  }, [routeMode, routeRequest, mapsReady, renderRoute]);

  /* ── Focus marker in map list ── */
  const focusMarker = useCallback((index) => {
    const map    = mapInstanceRef.current;
    const marker = markersRef.current[index];
    const prop   = mapProperties?.[index];
    if (!map || !marker || !prop) return;

    map.panTo(marker.getPosition());
    map.setZoom(15);
    const pos  = marker.getPosition();
    const mUrl = pos
        ? `https://www.google.com/maps/search/?api=1&query=${pos.lat()},${pos.lng()}`
        : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((prop.location ?? "") + ", India")}`;

    infoWindowRef.current?.setContent(
        `<div style="font-family:sans-serif;min-width:210px;padding:4px 2px;">
         <strong style="font-size:14px;display:block;margin-bottom:4px;">${prop.title ?? ""}</strong>
         <span style="color:#6b7280;font-size:12px;">${prop.location ?? ""}</span><br/>
         <span style="color:#2563eb;font-weight:700;font-size:14px;">${formatPrice(prop.price)}</span>
         <a href="${mUrl}" target="_blank" rel="noopener noreferrer"
            style="display:inline-flex;align-items:center;gap:4px;margin-top:8px;
                   color:#2563eb;font-size:12px;font-weight:600;text-decoration:none;
                   background:#eff6ff;padding:4px 12px;border-radius:20px;border:1px solid #bfdbfe;">
           🗺 Open in Google Maps →
         </a>
       </div>`
    );
    infoWindowRef.current?.open(map, marker);
    setActiveListItem(index);
  }, [mapProperties]);

  /* ── Build / rebuild map ──
     FIX 4: Split into two effects — one for building the map, one for the route.
     Original had both in one effect with eslint-disable hiding stale closure bugs.
  ── */
  useEffect(() => {
    if (mapProperties === null) { destroyMap(); return; }
    if (!mapsReady) return;

    destroyMap();
    if (!mapContainerRef.current) return;

    const G = window.google.maps;

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

    map.addListener("click", (e) => {
      window.open(
          `https://www.google.com/maps/@${e.latLng.lat()},${e.latLng.lng()},15z`,
          "_blank", "noopener,noreferrer"
      );
    });

    const infoWindow = new G.InfoWindow();
    infoWindowRef.current = infoWindow;

    const makeIcon = (colour) => ({
      path:         G.SymbolPath.CIRCLE,
      fillColor:    colour,
      fillOpacity:  1,
      strokeColor:  "#ffffff",
      strokeWeight: 2,
      scale:        15,
    });

    const bounds = new G.LatLngBounds();
    markersRef.current = (mapProperties || []).map((prop, i) => {
      const coords = parsedCoords[i];
      const lat    = coords ? coords.lat : 12.9716 + (Math.floor(i / 3) - 1) * 0.04;
      const lng    = coords ? coords.lng : 77.5946 + ((i % 3) - 1) * 0.05;

      const marker = new G.Marker({
        position: { lat, lng },
        map,
        label: { text: String(i + 1), color: "#fff", fontWeight: "700", fontSize: "12px" },
        title: prop.title,
        icon:  makeIcon(coords ? "#2563eb" : "#9ca3af"),
      });

      marker.addListener("click", () => {
        const mPos = marker.getPosition();
        const mUrl = mPos
            ? `https://www.google.com/maps/search/?api=1&query=${mPos.lat()},${mPos.lng()}`
            : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((prop.location ?? "") + ", India")}`;
        infoWindow.setContent(
            `<div style="font-family:sans-serif;min-width:210px;padding:4px 2px;">
             <strong style="font-size:14px;display:block;margin-bottom:4px;">${prop.title ?? ""}</strong>
             <span style="color:#6b7280;font-size:12px;">${prop.location ?? ""}</span><br/>
             <span style="color:#2563eb;font-weight:700;font-size:14px;">${formatPrice(prop.price)}</span>
             ${!coords ? '<br/><em style="font-size:11px;color:#9ca3af;">Approximate location</em>' : ""}
             <a href="${mUrl}" target="_blank" rel="noopener noreferrer"
                style="display:inline-flex;align-items:center;gap:4px;margin-top:8px;
                       color:#2563eb;font-size:12px;font-weight:600;text-decoration:none;
                       background:#eff6ff;padding:4px 12px;border-radius:20px;border:1px solid #bfdbfe;">
               🗺 Open in Google Maps →
             </a>
           </div>`
        );
        infoWindow.open(map, marker);
        setActiveListItem(i);
      });

      bounds.extend({ lat, lng });
      return marker;
    });

    if ((mapProperties || []).length > 1) map.fitBounds(bounds, 60);

    if (searchInputRef.current) {
      const ac = new G.places.Autocomplete(searchInputRef.current, {
        fields: ["geometry", "name", "formatted_address"],
      });
      ac.addListener("place_changed", () => {
        const place = ac.getPlace();
        if (!place.geometry?.location) return;
        map.panTo(place.geometry.location);
        map.setZoom(15);
        new G.Marker({
          position: place.geometry.location,
          map,
          title: place.name,
          icon: { path: G.SymbolPath.BACKWARD_CLOSED_ARROW, fillColor: "#ef4444", fillOpacity: 1, strokeColor: "#fff", strokeWeight: 1.5, scale: 7 },
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
      autocompleteRef.current = ac;
    }

    setTimeout(() => G.event.trigger(map, "resize"), 420);
    return destroyMap;
  }, [mapProperties, mapsReady, destroyMap]);

  /* ── Route effect (separate from map build) ── */
  useEffect(() => {
    if (!routeRequest || !mapInstanceRef.current || !mapsReady) return;
    renderRoute(
        mapInstanceRef.current,
        routeRequest.origin,
        routeRequest.destination,
        routeMode
    );
  }, [routeRequest, mapsReady, renderRoute]); // routeMode handled separately above

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
      setRouteRequest(null);
      setRouteResult(null);
      return properties;
    });
  }, []);

  const handleRouteView = useCallback((origin, destination) => {
    // origin may be a string address or {lat, lng} object from property coords
    setRouteRequest({ origin, destination });
    setRouteResult(null);
    setRouteError(null);
    setRouteMode("DRIVING");
    setMapProperties((prev) => prev ?? []);
  }, []);

  const closeMap = useCallback(() => {
    setMapProperties(null);
    setRouteRequest(null);
    setRouteResult(null);
    setRouteError(null);
  }, []);

  const isMapOpen     = mapProperties !== null;
  const hasProperties = (mapProperties?.length ?? 0) > 0;
  const isRouteActive = !!routeRequest;

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

          {/* ── CHAT PANEL ── */}
          <div className={`ai-chat-panel ${isMapOpen ? "with-map" : ""}`}>
            <div className="chat-messages-area" role="log" aria-live="polite">
              {messages.length === 0 && !loading ? (
                  <div className="chat-empty-state">
                    <div className="chat-empty-icon"><Icon name="sparkle" size={28} /></div>
                    <h2>What can I help you find?</h2>
                    <p>“Discover Properties. Ask Anything. Explore Smarter.”</p>
                    <SuggestionCards onSelect={handleSend} />
                    <SuggestionChips onSelect={handleSend} />
                    <div className="chat-empty-bar">
                      <AiBottomSearchBar onSend={handleSend} />
                    </div>
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
                            prevMessages={messages.slice(0, i)}
                        />
                    ))}
                    {loading && (
                        <div className="message-row ai" role="status" aria-label="AI is thinking">
                          <div className="typing-indicator">
                            <div className="typing-dot" />
                            <div className="typing-dot" />
                            <div className="typing-dot" />
                          </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>
              )}
            </div>

            {(messages.length > 0 || loading) && (
                <div className="chat-input-bar">
                  <AiBottomSearchBar onSend={handleSend} />
                </div>
            )}
          </div>

          {/* ── MAP PANEL ── */}
          {isMapOpen && (
              <div className="ai-map-panel">
                <div className="ai-map-header">
              <span className="ai-map-title">
                {isRouteActive ? "🗺 Route & Directions" : "📍 Properties on Map"}
              </span>
                  {hasProperties && !isRouteActive && (
                      <span className="ai-map-count">{mapProperties.length} properties</span>
                  )}
                  <button className="ai-map-close" onClick={closeMap} aria-label="Close map">
                    ✕ Close
                  </button>
                </div>

                {isRouteActive && (
                    <div className="ai-route-card">
                      <div className="ai-route-od">
                        <div className="ai-route-od-row">
                          <span className="ai-route-dot origin" />
                          <span className="ai-route-od-label">
                      {routeResult?.origin || routeRequest.originLabel ||
                          (typeof routeRequest.origin === "object" ? "This Property" : routeRequest.origin)}
                    </span>
                        </div>
                        <div className="ai-route-od-line" />
                        <div className="ai-route-od-row">
                          <span className="ai-route-dot dest" />
                          <span className="ai-route-od-label">
                      {routeResult?.destination ||
                          (typeof routeRequest.destination === "string"
                              ? routeRequest.destination.replace(/, Bengaluru$/i, "").replace(/, Bangalore$/i, "")
                              : routeRequest.destination)}
                    </span>
                        </div>
                      </div>

                      <div className="ai-route-modes" role="group" aria-label="Travel mode">
                        {TRAVEL_MODES.map(({ key, label, icon }) => (
                            <button
                                key={key}
                                className={`ai-route-mode-btn${routeMode === key ? " active" : ""}`}
                                onClick={() => setRouteMode(key)}
                                aria-pressed={routeMode === key}
                                title={label}
                            >
                              <span>{icon}</span>
                              <span>{label}</span>
                            </button>
                        ))}
                      </div>

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
                                  {routeMode === "DRIVING" ? "Drive time" :
                                      routeMode === "TRANSIT" ? "Transit time" :
                                          routeMode === "WALKING" ? "Walk time" : "Cycle time"}
                                </div>
                              </div>
                            </div>
                          </div>
                      )}
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
                      aria-label="Search location on map"
                  />
                </div>

                <div className="ai-map-frame-wrap" ref={mapContainerRef} />

                {hasProperties && (
                    <div className="ai-map-list" role="list">
                      {mapProperties.map((p, i) => (
                          <div
                              key={p.id || i}
                              className={`ai-map-item${activeListItem === i ? " active" : ""}`}
                              onClick={() => focusMarker(i)}
                              role="button"
                              tabIndex={0}
                              onKeyDown={(e) => e.key === "Enter" && focusMarker(i)}
                              aria-label={`${p.title} - ${p.location}`}
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