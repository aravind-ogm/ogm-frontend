import React, { useState, useEffect, useRef, useCallback } from "react";
import Icon from "./Icon";
import AiMessage from "./AiMessage";
import SuggestionChips from "./SuggestionChips";
import { formatPrice } from "./Helpers";
import "../../styles/ai/ai-chatbox.css";

export default function AiChatBox({ chat, loading = false, onSend, onEditMessage, onRetry, onCopy }) {
  const [input, setInput] = useState("");
  const [mapProperties, setMapProperties] = useState(null);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chat?.messages?.length, loading]);
  useEffect(() => { setTimeout(() => textareaRef.current?.focus(), 60); }, [chat?.id]);
  useEffect(() => { setMapProperties(null); }, [chat?.id]);

  /* ── Load Leaflet CSS + JS dynamically ── */
  useEffect(() => {
    if (!document.getElementById("leaflet-css")) {
      const link = document.createElement("link");
      link.id = "leaflet-css";
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }
    if (!window.L && !document.getElementById("leaflet-js")) {
      const script = document.createElement("script");
      script.id = "leaflet-js";
      script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      document.head.appendChild(script);
    }
  }, []);

  /* ── Initialize / update Leaflet map when mapProperties changes ── */
  useEffect(() => {
    if (!mapProperties || !mapContainerRef.current) {
      // Cleanup old map
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      return;
    }

    const initMap = () => {
      if (!window.L) {
        // Wait for Leaflet to load
        setTimeout(initMap, 200);
        return;
      }

      // Remove old map if exists
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      const L = window.L;

      // Default center (Bangalore)
      let center = [12.9716, 77.5946];
      let zoom = 11;

      // Collect valid coordinates
      const markers = [];
      mapProperties.forEach((p, i) => {
        const lat = parseFloat(p.latitude || p.lat);
        const lng = parseFloat(p.longitude || p.lng || p.lon);
        if (!isNaN(lat) && !isNaN(lng)) {
          markers.push({ lat, lng, title: p.title, location: p.location, price: formatPrice(p.price), index: i + 1 });
        }
      });

      // If we have markers, center on them
      if (markers.length > 0) {
        const avgLat = markers.reduce((s, m) => s + m.lat, 0) / markers.length;
        const avgLng = markers.reduce((s, m) => s + m.lng, 0) / markers.length;
        center = [avgLat, avgLng];
        zoom = markers.length === 1 ? 14 : 12;
      }

      // Create map
      const map = L.map(mapContainerRef.current, {
        center,
        zoom,
        zoomControl: true,
        scrollWheelZoom: true,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '© OpenStreetMap',
        maxZoom: 19,
      }).addTo(map);

      // Custom red marker icon
      const redIcon = L.divIcon({
        className: "custom-map-marker",
        html: '<div class="map-pin"></div>',
        iconSize: [30, 30],
        iconAnchor: [15, 30],
        popupAnchor: [0, -30],
      });

      // Add markers
      if (markers.length > 0) {
        const bounds = [];
        markers.forEach((m) => {
          const numberedIcon = L.divIcon({
            className: "custom-map-marker",
            html: `<div class="map-pin"><span>${m.index}</span></div>`,
            iconSize: [32, 40],
            iconAnchor: [16, 40],
            popupAnchor: [0, -40],
          });

          const marker = L.marker([m.lat, m.lng], { icon: numberedIcon }).addTo(map);
          marker.bindPopup(
            `<div style="font-family:sans-serif;min-width:180px;">
              <strong style="font-size:14px;">${m.title}</strong><br/>
              <span style="color:#666;font-size:12px;">${m.location || ""}</span><br/>
              <span style="color:#4f6ef7;font-weight:700;font-size:14px;">${m.price}</span>
            </div>`
          );
          bounds.push([m.lat, m.lng]);
        });

        if (bounds.length > 1) {
          map.fitBounds(bounds, { padding: [40, 40] });
        }
      } else {
        // No coordinates — add property labels on default Bangalore map
        mapProperties.forEach((p, i) => {
          // Place markers in a grid pattern around Bangalore center
          const offsetLat = (Math.floor(i / 3) - 1) * 0.04;
          const offsetLng = ((i % 3) - 1) * 0.05;
          const lat = 12.9716 + offsetLat;
          const lng = 77.5946 + offsetLng;

          const numberedIcon = L.divIcon({
            className: "custom-map-marker",
            html: `<div class="map-pin"><span>${i + 1}</span></div>`,
            iconSize: [32, 40],
            iconAnchor: [16, 40],
            popupAnchor: [0, -40],
          });

          const marker = L.marker([lat, lng], { icon: numberedIcon }).addTo(map);
          marker.bindPopup(
            `<div style="font-family:sans-serif;min-width:180px;">
              <strong style="font-size:14px;">${p.title}</strong><br/>
              <span style="color:#666;font-size:12px;">${p.location || ""}</span><br/>
              <span style="color:#4f6ef7;font-weight:700;font-size:14px;">${formatPrice(p.price)}</span>
              <br/><em style="font-size:11px;color:#999;">Approximate location</em>
            </div>`
          );
        });
      }

      mapInstanceRef.current = map;

      // Force resize after animation
      setTimeout(() => map.invalidateSize(), 400);
    };

    initMap();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [mapProperties]);

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

  const handleFollowUp = useCallback((s) => { if (!loading) onSend?.(s); }, [loading, onSend]);
  const handleMapView = useCallback((properties) => { setMapProperties((prev) => prev ? null : properties); }, []);

  const isMapOpen = !!mapProperties;

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
        {/* LEFT: CHAT */}
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
                  <AiMessage key={msg.id || `msg-${i}`} msg={msg} chatId={chat.id} index={i}
                    onEdit={onEditMessage} onRetry={onRetry} onCopy={onCopy}
                    onFollowUp={handleFollowUp} onMapView={handleMapView} isMapOpen={isMapOpen} />
                ))}
                {loading && (
                  <div className="message-row ai">
                    <div className="typing-indicator"><div className="typing-dot" /><div className="typing-dot" /><div className="typing-dot" /></div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          <div className="chat-input-bar">
            <div className="chat-input-wrapper">
              <textarea ref={textareaRef} rows={1} value={input} onChange={handleInputChange}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                placeholder="Ask anything - find, compare, and locate properties" disabled={loading} />
              <button className="chat-send-btn" onClick={() => handleSend()} disabled={!input.trim() || loading}>
                <Icon name="send" size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT: MAP */}
        {isMapOpen && mapProperties && (
          <div className="ai-map-panel">
            <div className="ai-map-header">
              <span className="ai-map-title">📍 Properties on Map</span>
              <span className="ai-map-count">{mapProperties.length} properties</span>
              <button className="ai-map-close" onClick={() => setMapProperties(null)}>✕ Close</button>
            </div>

            <div className="ai-map-frame-wrap" ref={mapContainerRef} />

            <div className="ai-map-list">
              {mapProperties.map((p, i) => (
                <div key={p.id || i} className="ai-map-item">
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