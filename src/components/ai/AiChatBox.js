import React, { useState, useEffect, useRef, useCallback } from "react";
import Icon from "./Icon";
import AiMessage from "./AiMessage";
import SuggestionChips from "./SuggestionChips";
import { formatPrice } from "./Helpers";
import "../../styles/ai/ai-chatbox.css";

/* ─── Google Maps API key ────────────────────────────────────────────────────
   Prefer env var so the key stays out of source control.                    */
const GMAPS_KEY =
  process.env.REACT_APP_GOOGLE_MAPS_API_KEY ||
  "AIzaSyAMOnmpGRW9d36CNRQTjAavV4EjHGlXzO4";

/* Load SDK once — includes Places library for the search box */
function loadGoogleMaps() {
  if (window.google?.maps?.places) return Promise.resolve();

  if (document.getElementById("gmaps-sdk")) {
    return new Promise((resolve) => {
      const t = setInterval(() => {
        if (window.google?.maps?.places) { clearInterval(t); resolve(); }
      }, 100);
    });
  }

  return new Promise((resolve, reject) => {
    const script   = document.createElement("script");
    script.id      = "gmaps-sdk";
    // libraries=places  ← required for the Places Autocomplete search box
    script.src     = `https://maps.googleapis.com/maps/api/js?key=${GMAPS_KEY}&libraries=places&loading=async`;
    script.async   = true;
    script.defer   = true;
    script.onload  = resolve;
    script.onerror = () => reject(new Error("Failed to load Google Maps SDK"));
    document.head.appendChild(script);
  });
}

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
  const [mapsReady,      setMapsReady]      = useState(!!window.google?.maps?.places);
  const [activeListItem, setActiveListItem] = useState(null); // highlighted list row index

  const messagesEndRef  = useRef(null);
  const textareaRef     = useRef(null);
  const mapContainerRef = useRef(null);
  const searchInputRef  = useRef(null);   // <input> DOM node for Places Autocomplete
  const mapInstanceRef  = useRef(null);   // google.maps.Map
  const markersRef      = useRef([]);     // google.maps.Marker[] — index matches mapProperties
  const infoWindowRef   = useRef(null);   // shared InfoWindow
  const autocompleteRef = useRef(null);   // google.maps.places.Autocomplete instance

  /* ── Auto-scroll ── */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat?.messages?.length, loading]);

  /* ── Focus textarea on chat switch ── */
  useEffect(() => { setTimeout(() => textareaRef.current?.focus(), 60); }, [chat?.id]);

  /* ── Close map on chat switch ── */
  useEffect(() => { setMapProperties(null); }, [chat?.id]);

  /* ── Load Google Maps SDK (with Places) once ── */
  useEffect(() => {
    if (mapsReady) return;
    loadGoogleMaps()
      .then(() => setMapsReady(true))
      .catch((err) => console.error("[AiChatBox]", err.message));
  }, [mapsReady]);

  /* ── Tear down map + autocomplete ── */
  const destroyMap = useCallback(() => {
    autocompleteRef.current = null;
    markersRef.current.forEach((m) => m?.setMap(null));
    markersRef.current = [];
    infoWindowRef.current?.close();
    if (mapContainerRef.current) mapContainerRef.current.innerHTML = "";
    mapInstanceRef.current = null;
    setActiveListItem(null);
  }, []);

  /* ─────────────────────────────────────────────────────────────────────────
     focusMarker(index)
     Called when the user clicks a row in the right-hand property list.
     Pans the map to that marker, zooms in, and opens the InfoWindow.
     ───────────────────────────────────────────────────────────────────────── */
  const focusMarker = useCallback((index) => {
    const map     = mapInstanceRef.current;
    const marker  = markersRef.current[index];
    const iw      = infoWindowRef.current;
    const prop    = mapProperties?.[index];

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

  /* ── Build / rebuild Google Map whenever mapProperties or mapsReady changes ── */
  useEffect(() => {
    if (!mapProperties) { destroyMap(); return; }
    if (!mapsReady)      return;

    destroyMap();
    if (!mapContainerRef.current) return;

    const G = window.google.maps;

    /* Pre-parse coordinates — null entry means no real coords for that property */
    const parsedCoords = mapProperties.map((p) => {
      const lat = parseFloat(p.latitude ?? p.lat);
      const lng = parseFloat(p.longitude ?? p.lng ?? p.lon);
      return !isNaN(lat) && !isNaN(lng) ? { lat, lng } : null;
    });

    const validCoords = parsedCoords.filter(Boolean);

    /* Map centre */
    let center = { lat: 12.9716, lng: 77.5946 }; // Bangalore fallback
    if (validCoords.length > 0) {
      center = {
        lat: validCoords.reduce((s, c) => s + c.lat, 0) / validCoords.length,
        lng: validCoords.reduce((s, c) => s + c.lng, 0) / validCoords.length,
      };
    }

    /* Create map */
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

    const makeIcon = (colour) => ({
      path:         G.SymbolPath.CIRCLE,
      fillColor:    colour,
      fillOpacity:  1,
      strokeColor:  "#ffffff",
      strokeWeight: 2,
      scale:        15,
    });

    /* Create markers — one per property, index matches mapProperties */
    const bounds     = new G.LatLngBounds();
    const newMarkers = mapProperties.map((prop, i) => {
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

      /* Clicking a marker → highlight list row + open InfoWindow */
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
    if (mapProperties.length > 1) map.fitBounds(bounds, 60);

    /* ── Attach Places Autocomplete to the search input ── */
    if (searchInputRef.current) {
      const autocomplete = new G.places.Autocomplete(searchInputRef.current, {
        fields: ["geometry", "name", "formatted_address"],
      });

      autocomplete.addListener("place_changed", () => {
        const place = autocomplete.getPlace();
        if (!place.geometry?.location) return;

        map.panTo(place.geometry.location);
        map.setZoom(15);

        // Temporary "search result" pin in red
        new G.Marker({
          position: place.geometry.location,
          map,
          title: place.name,
          icon: {
            path:         G.SymbolPath.BACKWARD_CLOSED_ARROW,
            fillColor:    "#ef4444",
            fillOpacity:  1,
            strokeColor:  "#fff",
            strokeWeight: 1.5,
            scale:        7,
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

    setTimeout(() => G.event.trigger(map, "resize"), 420);
    return destroyMap;
  }, [mapProperties, mapsReady, destroyMap]);

  /* ── Textarea auto-resize ── */
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
    setMapProperties((prev) => (prev === properties ? null : properties));
  }, []);

  const isMapOpen = !!mapProperties;

  /* ── Empty state (no chat) ── */
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
            LEFT PANEL — CHAT
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
                    isMapOpen={isMapOpen}
                    userPosition={userPosition}
                  />
                ))}
                {loading && (
                  <div className="message-row ai">
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
            RIGHT PANEL — MAP
            ══════════════════════════════ */}
        {isMapOpen && mapProperties && (
          <div className="ai-map-panel">

            {/* Header row */}
            <div className="ai-map-header">
              <span className="ai-map-title">📍 Properties on Map</span>
              <span className="ai-map-count">{mapProperties.length} properties</span>
              <button className="ai-map-close" onClick={() => setMapProperties(null)}>
                ✕ Close
              </button>
            </div>

            {/* ── Places search bar ──────────────────────────────────────────
                Sits between the header and the map canvas.
                google.maps.places.Autocomplete wires up to searchInputRef.   */}
            <div className="ai-map-search-bar">
              <svg
                className="ai-map-search-icon"
                width="15" height="15" viewBox="0 0 24 24"
                fill="none" stroke="currentColor"
                strokeWidth="2.5" strokeLinecap="round"
              >
                <circle cx="11" cy="11" r="7" />
                <line x1="16.5" y1="16.5" x2="22" y2="22" />
              </svg>
              <input
                ref={searchInputRef}
                className="ai-map-search-input"
                type="text"
                placeholder="Search any location on map…"
              />
            </div>

            {/* Map canvas */}
            <div className="ai-map-frame-wrap" ref={mapContainerRef} />

            {/* ── Property list ─────────────────────────────────────────────
                Each row is clickable — calls focusMarker(i) which pans the
                map and opens the InfoWindow for that property.               */}
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
          </div>
        )}
      </div>
    </div>
  );
}
