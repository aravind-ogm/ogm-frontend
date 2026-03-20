import React, { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import "../styles/AskDiscoverWidget.css";

const ROBOT_IMG = "/images/ai-robot.png";
const API_BASE  = process.env.REACT_APP_API_BASE || "http://localhost:8080";
const GMAPS_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY || "AIzaSyAMOnmpGRW9d36CNRQTjAavV4EjHGlXzO4";

/* ── Gemini via backend ────────────────────────────────────────────────── */
async function askGemini(question, chatId, systemContext) {
  const res = await fetch(`${API_BASE}/api/ai/property-ask`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, chatId, systemContext }),
  });
  if (!res.ok) throw new Error(`${res.status}`);
  const d = await res.json();
  return d.message || "Sorry, I couldn't get a response.";
}

/* ── Property system prompt ────────────────────────────────────────────── */
function buildPrompt(p) {
  if (!p) return "You are a helpful real estate assistant for OGM.";
  const price = p.price >= 10_000_000
    ? `₹ ${(p.price / 10_000_000).toFixed(2)} Cr`
    : `₹ ${(p.price / 100_000).toFixed(2)} Lakhs`;
  return `You are an expert property advisor for One Global Marketplace (OGM).
Property: ${p.title} | Location: ${p.location} | Price: ${price}
Type: ${p.type} | ${p.bedrooms} BHK | ${p.bathrooms} Baths | ${p.builtupArea || p.sqft || ""} sqft
RERA: ${p.reraApproved ? "Yes" : "No"} | Facing: ${p.facing} | Parking: ${p.parking}
Amenities: ${(p.amenities || []).join(", ")}
Description: ${p.description || ""}
Be concise, helpful and positive. For distance/route queries, mention the property location.
If asked about distance, tell the user you're showing the route on the map below.`;
}

/* ── Detect distance/route query ───────────────────────────────────────── */
function isDistanceQuery(q) {
  return /distance|route|far|km|kilometer|mile|drive|walk|commute|reach|how.*get|way.*to|direction/i.test(q);
}

function extractDestination(q) {
  const m = q.match(/(?:to|from|between.*and|and)\s+([A-Z][^?.,!]+)/i);
  return m ? m[1].trim() : q.replace(/distance|route|how far|km|to|from|between|and/gi, "").trim();
}

/* ── Mini image carousel — clickable arrows ────────────────────────────── */
function MiniImageCarousel({ images, title }) {
  const [idx, setIdx] = useState(0);
  const all = images.filter(Boolean);
  if (!all.length) return null;

  const prev = (e) => { e.stopPropagation(); setIdx(i => (i - 1 + all.length) % all.length); };
  const next = (e) => { e.stopPropagation(); setIdx(i => (i + 1) % all.length); };

  return (
    <div className="adw-mini-imgs">
      <img src={all[idx]} alt={title} className="adw-mini-img-single" />
      {all.length > 1 && (
        <>
          <button className="adw-mini-arrow adw-mini-arrow-l" onClick={prev}>‹</button>
          <button className="adw-mini-arrow adw-mini-arrow-r" onClick={next}>›</button>
        </>
      )}
      <span className="adw-mini-count">{idx + 1}/{all.length}</span>
    </div>
  );
}

/* ── Google Maps route — uses Directions API with geocoding fallback ── */
function RouteMap({ origin, destination }) {
  const [distance, setDistance] = useState(null);
  const [duration, setDuration] = useState(null);
  const [error,    setError]    = useState(false);
  const mapRef    = useRef(null);

  useEffect(() => {
    if (!origin || !destination) return;

    const tryLoad = () => {
      if (!mapRef.current || !window.google?.maps) return;

      const map = new window.google.maps.Map(mapRef.current, {
        zoom: 11,
        center: { lat: 12.9716, lng: 77.5946 },
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        zoomControl: true,
      });

      const ds = new window.google.maps.DirectionsService();
      const dr = new window.google.maps.DirectionsRenderer({
        map,
        polylineOptions: {
          strokeColor: "#f97316",
          strokeWeight: 5,
          strokeOpacity: 0.9,
        },
        markerOptions: { animation: window.google.maps.Animation.DROP },
      });

      // Append ", Bengaluru, India" to improve geocoding if not already detailed
      const originFull      = /bengaluru|bangalore|india/i.test(origin)      ? origin      : `${origin}, Bengaluru, India`;
      const destinationFull = /bengaluru|bangalore|india/i.test(destination) ? destination : `${destination}, Bengaluru, India`;

      ds.route(
        { origin: originFull, destination: destinationFull, travelMode: "DRIVING" },
        (res, status) => {
          if (status === "OK") {
            dr.setDirections(res);
            const leg = res.routes[0]?.legs[0];
            if (leg) {
              setDistance(leg.distance?.text || null);
              setDuration(leg.duration?.text || null);
            }
          } else {
            console.warn("Directions failed:", status);
            setError(true);
            // Fallback: just center map between the two points using Geocoder
            const gc = new window.google.maps.Geocoder();
            gc.geocode({ address: destinationFull }, (r2, s2) => {
              if (s2 === "OK") map.setCenter(r2[0].geometry.location);
            });
          }
        }
      );
    };

    if (typeof window.google?.maps?.Map === "function") {
      tryLoad();
    } else if (!document.getElementById("gmaps-sdk")) {
      const s = document.createElement("script");
      s.id = "gmaps-sdk";
      s.src = `https://maps.googleapis.com/maps/api/js?key=${GMAPS_KEY}&libraries=places`;
      s.async = true;
      s.onload = tryLoad;
      document.head.appendChild(s);
    } else {
      // SDK script already appended — wait for it
      const t = setInterval(() => {
        if (typeof window.google?.maps?.Map === "function") {
          clearInterval(t); tryLoad();
        }
      }, 150);
    }
  }, [origin, destination]);

  return (
    <div className="adw-map-wrap">
      <div ref={mapRef} className="adw-map" />
      {(distance || duration) && (
        <div className="adw-map-badge">
          <span className="adw-map-dist">📍 {distance}</span>
          <span className="adw-map-dur">🕐 {duration} by car</span>
        </div>
      )}
      {error && (
        <div className="adw-map-error">
          Could not load route — try a more specific location name
        </div>
      )}
    </div>
  );
}

/* ── Suggestions ───────────────────────────────────────────────────────── */
const DEFAULT_SUGGESTIONS = [
  "What are the key highlights?",
  "Is the price negotiable?",
  "What schools are nearby?",
  "How do I book a site visit?",
];

const POST_QUERY_SUGGESTIONS = [
  "What's the distance to Whitefield?",
  "Are there good hospitals nearby?",
  "What is the current resale value?",
  "Can I schedule a live tour?",
];

/* ════════════════════════════════════════════════════════════════════════
   MAIN WIDGET
════════════════════════════════════════════════════════════════════════ */
export default function AskDiscoverWidget({ property }) {
  const [phase, setPhase]       = useState("pill");   // pill | search | chat
  const [input, setInput]       = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading]   = useState(false);
  const [visible, setVisible]   = useState(false);
  const [expanded, setExpanded] = useState(false);    // breathing pill

  const chatIdRef = useRef(`prop-${property?.id}-${Date.now()}`);
  const inputRef  = useRef(null);
  const bottomRef = useRef(null);
  const timerRef  = useRef(null);

  /* ── Breathing animation (pill phase only) ── */
  useEffect(() => {
    setTimeout(() => setVisible(true), 800);
    if (phase !== "pill") return;
    const cycle = () => {
      setExpanded(true);
      timerRef.current = setTimeout(() => {
        setExpanded(false);
        timerRef.current = setTimeout(cycle, 3500);
      }, 4000);
    };
    timerRef.current = setTimeout(cycle, 1800);
    return () => clearTimeout(timerRef.current);
  }, [phase]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

  useEffect(() => {
    if (phase === "search") setTimeout(() => inputRef.current?.focus(), 200);
  }, [phase]);

  /* ── Send message ── */
  const send = useCallback(async (text) => {
    const q = (text || input).trim();
    if (!q || loading) return;
    setInput("");
    setPhase("chat");
    const userMsg = { role: "user", content: q, isDistance: isDistanceQuery(q), destination: isDistanceQuery(q) ? extractDestination(q) : null };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);
    try {
      const reply = await askGemini(q, chatIdRef.current, buildPrompt(property));
      setMessages(prev => [...prev, { role: "assistant", content: reply }]);
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "Having trouble connecting. Please try again." }]);
    } finally { setLoading(false); }
  }, [input, loading, property]);

  const handleKey = (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } };

  /* ── Price formatter ── */
  const price = property?.price >= 10_000_000
    ? `₹ ${(property.price / 10_000_000).toFixed(2)} Cr`
    : property?.price >= 100_000
      ? `₹ ${(property.price / 100_000).toFixed(2)} Lakhs`
      : "Price on request";

  const thumbImg = property?.mainImages?.[0] || property?.images?.[0] || property?.image;

  /* ════════════════════════════
     PORTAL CONTENT
  ════════════════════════════ */
  const widget = (
    <>
      {/* ── PILL (default state) ── */}
      {phase === "pill" && (
        <div className={`adw-pill-trigger ${visible ? "adw-pill-visible" : ""}`}
             onClick={() => setPhase("search")}>
          <div className={`adw-pill-text ${expanded ? "adw-pill-text-expanded" : ""}`}>
            <span className="adw-pill-label">Ask. Discover. Invest...</span>
          </div>
          <div className="adw-pill-robot-wrap">
            <img src={ROBOT_IMG} alt="AI" className="adw-pill-robot" />
            <span className="adw-online-dot" />
          </div>
        </div>
      )}

      {/* ── SEARCH BAR (after pill click, before query) ── */}
      {phase === "search" && (
        <>
          <div className="adw-search-bar-wrap">
            <div className="adw-search-bar">
              <img src={ROBOT_IMG} alt="AI" className="adw-search-robot" />
              <input
                ref={inputRef}
                className="adw-search-input"
                placeholder="Have more questions? Ask your AI Property Advisor..."
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKey}
              />
              <button className="adw-search-btn" onClick={() => send()} disabled={!input.trim()}>
                <svg width="20" height="20" fill="none" stroke="#fff" strokeWidth="2.5" viewBox="0 0 24 24">
                  <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                </svg>
              </button>
            </div>
            <div className="adw-search-suggestions">
              {DEFAULT_SUGGESTIONS.map(s => (
                <button key={s} className="adw-search-chip" onClick={() => send(s)}>{s}</button>
              ))}
            </div>
            <button className="adw-search-close" onClick={() => setPhase("pill")}>✕ Close</button>
          </div>
          <div className="adw-backdrop" onClick={() => setPhase("pill")} />
        </>
      )}

      {/* ── FULL CHAT VIEW ── */}
      {phase === "chat" && (
        <div className="adw-chat-overlay">
          <div className="adw-chat-inner">

            {/* ── Mini consolidated property card ── */}
            {property && (
              <div className="adw-mini-card">
                {thumbImg && (
                  <MiniImageCarousel
                    images={property.mainImages || property.images || [thumbImg]}
                    title={property.title}
                  />
                )}
                <div className="adw-mini-info">
                  <div className="adw-mini-loc">{property.location}</div>
                  <div className="adw-mini-title">{property.title}</div>
                  <div className="adw-mini-specs">
                    <span>{property.type}</span>
                    {property.bedrooms && <><span className="adw-dot">·</span><svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M3 7v13M21 7v13M3 14h18M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2M5 12V9a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v3M13 12V9a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v3"/></svg><span>{property.bedrooms}</span></>}
                    {property.bathrooms && <><span className="adw-dot">·</span><svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M3 11h18M3 11V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v6M3 11v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M7 11V9"/></svg><span>{property.bathrooms}</span></>}
                  </div>
                  {property.description && (
                    <p className="adw-mini-desc">{property.description.slice(0, 110)}{property.description.length > 110 ? "…" : ""}</p>
                  )}
                  <div className="adw-mini-bullets">
                    <div className="adw-mini-bullet">RERA {property.reraApproved ? "✓ Approved" : "Pending"}</div>
                    {property.parking && <div className="adw-mini-bullet">{property.parking} Parking</div>}
                  </div>
                  <div className="adw-mini-price-row">
                    <span className="adw-mini-price">{price}</span>
                    <div className="adw-mini-actions">
                      <a href={`tel:+918309120616`} className="adw-mini-action-btn">
                        <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.6 3.27 2 2 0 0 1 3.58 1h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 8.54a16 16 0 0 0 6 6l.91-.91a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                        Contact
                      </a>
                      <button className="adw-mini-action-btn">
                        <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                        Save
                      </button>
                      <button className="adw-mini-action-btn" onClick={() => setPhase("pill")}>
                        <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                        View
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── Chat messages ── */}
            <div className="adw-chat-messages" ref={bottomRef}>
              {messages.map((msg, i) => (
                <div key={i}>
                  {msg.role === "user" && (
                    <div className="adw-user-q">{msg.content}</div>
                  )}
                  {msg.role === "assistant" && (
                    <div className="adw-assistant-msg">
                      <img src={ROBOT_IMG} alt="AI" className="adw-msg-avatar" />
                      <div className="adw-msg-text">{msg.content}</div>
                    </div>
                  )}
                  {/* Show map if previous user message was a distance query */}
                  {msg.role === "assistant" && messages[i-1]?.isDistance && (
                    <RouteMap
                      origin={property?.location}
                      destination={messages[i-1].destination}
                    />
                  )}
                </div>
              ))}

              {loading && (
                <div className="adw-assistant-msg">
                  <img src={ROBOT_IMG} alt="AI" className="adw-msg-avatar" />
                  <div className="adw-typing"><span/><span/><span/></div>
                </div>
              )}
            </div>

            {/* ── Suggested follow-ups ── */}
            {!loading && messages.length > 0 && (
              <div className="adw-followups">
                {POST_QUERY_SUGGESTIONS.map(s => (
                  <button key={s} className="adw-followup-chip" onClick={() => send(s)}>{s}</button>
                ))}
              </div>
            )}

            {/* ── Wide search bar at bottom ── */}
            <div className="adw-chat-input-wrap">
              <input
                className="adw-chat-input"
                placeholder="Have more questions? Ask your AI Property Advisor..."
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKey}
                disabled={loading}
              />
              <button className="adw-chat-send" onClick={() => send()} disabled={!input.trim() || loading}>
                <svg width="20" height="20" fill="none" stroke="#fff" strokeWidth="2.5" viewBox="0 0 24 24">
                  <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                </svg>
              </button>
            </div>

            <button className="adw-chat-close" onClick={() => { setPhase("pill"); setMessages([]); }}>✕</button>
          </div>
        </div>
      )}
    </>
  );

  return createPortal(widget, document.body);
}