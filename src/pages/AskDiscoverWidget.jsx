import React, { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import AiBottomSearchBar from "../components/ai/AiBottomSearchBar";
import "../styles/AskDiscoverWidget.css";
import "../styles/ai/ai-search.css";

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

/* ── Smart Map: route OR nearby place markers ── */
function SmartMap({ origin, destination, nearbyType, nearbyKeyword, onPlaceClick }) {
  const [distance, setDistance] = useState(null);
  const [duration, setDuration] = useState(null);
  const [places,   setPlaces]   = useState([]);
  const [mode,     setMode]     = useState("loading");
  const mapRef = useRef(null);
  const mapObj = useRef(null);

  useEffect(() => {
    if (!origin) return;
    const init = () => {
      if (!mapRef.current || !window.google?.maps) return;
      const map = new window.google.maps.Map(mapRef.current, {
        zoom: 13, center: { lat: 12.9716, lng: 77.5946 },
        mapTypeControl: false, streetViewControl: false, fullscreenControl: false,
      });
      mapObj.current = map;
      const oFull = /bengaluru|bangalore|india/i.test(origin) ? origin : origin + ", Bengaluru, India";

      if (nearbyKeyword) {
        new window.google.maps.Geocoder().geocode({ address: oFull }, (res, st) => {
          if (st !== "OK") { setMode("error"); return; }
          const center = res[0].geometry.location;
          map.setCenter(center); map.setZoom(14);
          new window.google.maps.Marker({ position: center, map,
            icon: { path: window.google.maps.SymbolPath.CIRCLE, scale: 10,
              fillColor: "#1B3A6B", fillOpacity: 1, strokeColor: "#fff", strokeWeight: 2 },
            title: "This Property", zIndex: 100 });
          const svc = new window.google.maps.places.PlacesService(map);
          svc.nearbySearch({ location: center, radius: 3000, type: nearbyType, keyword: nearbyKeyword },
            (results) => {
              const top = (results || []).slice(0, 6);
              setPlaces(top); setMode("nearby");
              const bounds = new window.google.maps.LatLngBounds();
              bounds.extend(center);
              top.forEach((pl, i) => {
                bounds.extend(pl.geometry.location);
                const mk = new window.google.maps.Marker({
                  position: pl.geometry.location, map,
                  label: { text: String(i+1), color:"#fff", fontSize:"11px", fontWeight:"700" },
                  icon: { path: window.google.maps.SymbolPath.CIRCLE, scale: 14,
                    fillColor:"#f97316", fillOpacity:1, strokeColor:"#fff", strokeWeight:2 },
                  title: pl.name,
                });
                mk.addListener("click", () => {
                  svc.getDetails({ placeId: pl.place_id,
                    fields: ["name","formatted_address","rating","photos","opening_hours","formatted_phone_number"] },
                    (det, ds) => { if (ds === "OK") onPlaceClick(det, i+1); });
                });
              });
              map.fitBounds(bounds);
            });
        });
      } else if (destination) {
        const dFull = /bengaluru|bangalore|india/i.test(destination) ? destination : destination + ", Bengaluru, India";
        const ds = new window.google.maps.DirectionsService();
        const dr = new window.google.maps.DirectionsRenderer({ map,
          polylineOptions: { strokeColor:"#f97316", strokeWeight:5, strokeOpacity:0.9 } });
        ds.route({ origin: oFull, destination: dFull, travelMode:"DRIVING" }, (res, status) => {
          if (status === "OK") {
            dr.setDirections(res);
            const leg = res.routes[0]?.legs[0];
            if (leg) { setDistance(leg.distance?.text); setDuration(leg.duration?.text); }
            setMode("route");
          } else { setMode("error"); }
        });
      }
    };

    if (typeof window.google?.maps?.Map === "function") { init(); }
    else if (!document.getElementById("gmaps-sdk")) {
      const s = document.createElement("script");
      s.id = "gmaps-sdk";
      s.src = "https://maps.googleapis.com/maps/api/js?key=" + GMAPS_KEY + "&libraries=places";
      s.async = true; s.onload = init;
      document.head.appendChild(s);
    } else {
      const t = setInterval(() => {
        if (typeof window.google?.maps?.Map === "function") { clearInterval(t); init(); }
      }, 150);
    }
  }, [origin, destination, nearbyType, nearbyKeyword]);

  return (
    <div className="adw-map-outer">
      <div className="adw-map-wrap">
        <div ref={mapRef} className="adw-map" />
        {mode === "route" && (distance || duration) && (
          <div className="adw-map-badge">
            <span className="adw-map-dist">📍 {distance}</span>
            <span className="adw-map-dur">🕐 {duration} by car</span>
          </div>
        )}
        {mode === "nearby" && <div className="adw-map-nearby-hint">Tap a marker for details →</div>}
        {mode === "error"  && <div className="adw-map-error">Could not load map — try a more specific query</div>}
      </div>
      {mode === "nearby" && places.length > 0 && (
        <div className="adw-nearby-list">
          {places.map((pl, i) => (
            <button key={pl.place_id} className="adw-nearby-item" onClick={() => {
              const svc = new window.google.maps.places.PlacesService(mapObj.current);
              svc.getDetails({ placeId: pl.place_id,
                fields: ["name","formatted_address","rating","photos","opening_hours","formatted_phone_number"] },
                (det, ds) => { if (ds === "OK") onPlaceClick(det, i+1); });
            }}>
              <span className="adw-nearby-num">{i+1}</span>
              <div className="adw-nearby-info">
                <div className="adw-nearby-name">{pl.name}</div>
                {pl.vicinity && <div className="adw-nearby-addr">{pl.vicinity}</div>}
                {pl.rating && <div className="adw-nearby-rating">{"★".repeat(Math.round(pl.rating))} {pl.rating}</div>}
              </div>
              <span className="adw-nearby-arrow">›</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Place detail side panel ── */
function PlacePanel({ place, number, onClose }) {
  const [photoIdx, setPhotoIdx] = useState(0);
  if (!place) return null;
  const photos = place.photos?.slice(0,5) || [];
  return (
    <div className="adw-place-panel">
      <button className="adw-place-close" onClick={onClose}>✕</button>
      <span className="adw-place-num">{number}</span>
      {photos.length > 0 && (
        <div className="adw-place-photo-wrap">
          <img src={photos[photoIdx].getUrl({ maxWidth:640 })} alt={place.name} className="adw-place-photo" />
          {photos.length > 1 && (
            <>
              <button className="adw-place-photo-arrow left" onClick={() => setPhotoIdx(i => (i-1+photos.length)%photos.length)}>‹</button>
              <button className="adw-place-photo-arrow right" onClick={() => setPhotoIdx(i => (i+1)%photos.length)}>›</button>
              <div className="adw-place-photo-dots">
                {photos.map((_,i) => <button key={i} className={"adw-place-dot"+(i===photoIdx?" active":"")} onClick={() => setPhotoIdx(i)} />)}
              </div>
            </>
          )}
        </div>
      )}
      <div className="adw-place-body">
        <h3 className="adw-place-name">{place.name}</h3>
        {place.rating && <div className="adw-place-rating">{"★".repeat(Math.round(place.rating))}{"☆".repeat(5-Math.round(place.rating))} <span>{place.rating}</span></div>}
        {place.formatted_address && <div className="adw-place-addr">📍 {place.formatted_address}</div>}
        {place.formatted_phone_number && <div className="adw-place-phone">📞 {place.formatted_phone_number}</div>}
        {place.opening_hours && (
          <div className={"adw-place-hours "+(place.opening_hours.isOpen?.() ? "open" : "closed")}>
            {place.opening_hours.isOpen?.() ? "✓ Open now" : "✗ Closed now"}
          </div>
        )}
      </div>
    </div>
  );
}



/* ── isNearby helpers ── */
function isNearbyQuery(q) {
  return /hotel|resort|stay|accommodation|hospital|school|college|mall|restaurant|food|dine|cafe|park|metro|station|supermarket|pharmacy|gym|fitness|temple|church|mosque|gurudwara|clinic|market|bank|atm|airport|office|tech park|it park|cinema|theatre|petrol|fuel|nearby|near|close to|around/i.test(q);
}
function extractNearbyType(q) {
  const types = {
    hotel:"lodging", resort:"lodging", stay:"lodging", accommodation:"lodging",
    hospital:"hospital", clinic:"hospital", healthcare:"hospital",
    school:"school", college:"school", university:"school",
    restaurant:"restaurant", food:"restaurant", dine:"restaurant", eating:"restaurant",
    cafe:"cafe", coffee:"cafe",
    mall:"shopping_mall", shop:"shopping_mall", supermarket:"supermarket", grocery:"supermarket",
    park:"park", garden:"park", playground:"park",
    pharmacy:"pharmacy", medical:"pharmacy", chemist:"pharmacy",
    gym:"gym", fitness:"gym", workout:"gym",
    bank:"bank", atm:"atm",
    temple:"hindu_temple", church:"church", mosque:"mosque", gurudwara:"place_of_worship",
    metro:"subway_station", station:"transit_station", bus:"bus_station",
    "it park":"premise", "tech park":"premise", office:"premise",
    cinema:"movie_theater", theatre:"movie_theater",
    petrol:"gas_station", fuel:"gas_station",
  };
  const lq = q.toLowerCase();
  for (const [k,v] of Object.entries(types)) { if (lq.includes(k)) return { keyword:k, type:v }; }
  return { keyword:"place", type:"point_of_interest" };
}

/* ── Suggestions ── */
const DEFAULT_SUGGESTIONS = [
  "What are the key highlights?",
  "Is the price negotiable?",
  "What schools are nearby?",
  "How do I book a site visit?",
];
const POST_QUERY_SUGGESTIONS = [
  "Are there good restaurants nearby?",
  "Show hotels near this property",
  "Are there good hospitals nearby?",
  "What gyms are close by?",
  "Show temples nearby",
  "What's the distance to Whitefield?",
];

/* ════════════════════
   MAIN WIDGET
════════════════════ */
/* ── PDF / download detection ── */
function isPdfQuery(q) {
  return /pdf|document|download|brochure|report|save.*details|create.*doc|generate.*doc|compile/i.test(q);
}

/* ── Chat history storage ── */
const HISTORY_KEY = "ogm_chat_history";

function loadHistory() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]"); } catch { return []; }
}

function saveSession(property, messages) {
  try {
    const hist = loadHistory();
    const session = {
      id:        Date.now(),
      propertyId: property?.id,
      title:     property?.title?.slice(0, 40) || "Property Chat",
      date:      new Date().toLocaleDateString("en-IN", { day:"2-digit", month:"short", hour:"2-digit", minute:"2-digit" }),
      preview:   messages.find(m => m.role === "user")?.content?.slice(0, 60) || "",
      messages,
    };
    hist.unshift(session);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(hist.slice(0, 20)));
  } catch {}
}

/* ── jsPDF loader ── */
function loadJsPDF() {
  return new Promise((resolve, reject) => {
    if (window.jspdf) { resolve(window.jspdf.jsPDF); return; }
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
    s.onload  = () => resolve(window.jspdf.jsPDF);
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

/* ── Generate premium PDF ── */
async function generatePropertyPDF(property, selections) {
  const JsPDF = await loadJsPDF();
  const doc   = new JsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W     = 210, M = 18;

  const navy   = [27, 58, 107];
  const orange = [249, 115, 22];
  const white  = [255, 255, 255];
  const gray   = [100, 116, 139];
  const light  = [248, 250, 252];
  const dark   = [15, 23, 42];

  const price = property.price >= 10_000_000
    ? "Rs " + (property.price / 10_000_000).toFixed(2) + " Cr"
    : "Rs " + (property.price / 100_000).toFixed(2) + " Lakhs";

  let y = 0;

  // ── Header bar ──
  doc.setFillColor(...navy);
  doc.rect(0, 0, W, 38, "F");
  doc.setFontSize(7); doc.setTextColor(...white);
  doc.text("ONE GLOBAL MARKETPLACE", M, 10);
  doc.setFontSize(16); doc.setFont("helvetica","bold");
  doc.text("Property Report", M, 22);
  doc.setFontSize(8); doc.setFont("helvetica","normal");
  doc.text("www.oneglobalmarketplace.com", M, 32);
  doc.setFillColor(...orange);
  doc.rect(W - 45, 10, 35, 18, "F");
  doc.setFontSize(7); doc.setFont("helvetica","bold"); doc.setTextColor(...white);
  doc.text("RERA", W - 40, 17);
  doc.text(property.reraApproved ? "APPROVED" : "PENDING", W - 40, 24);

  y = 50;

  // ── Title + price ──
  doc.setFontSize(17); doc.setFont("helvetica","bold"); doc.setTextColor(...dark);
  const titleLines = doc.splitTextToSize(property.title, W - 2*M);
  doc.text(titleLines, M, y); y += titleLines.length * 7 + 3;

  doc.setFontSize(10); doc.setTextColor(...gray);
  doc.text("📍 " + (property.location || ""), M, y); y += 7;

  doc.setFontSize(20); doc.setFont("helvetica","bold"); doc.setTextColor(...navy);
  doc.text(price, M, y);
  if (property.reraApproved) {
    doc.setFillColor(240, 253, 244); doc.roundedRect(M + 52, y - 7, 32, 9, 2, 2, "F");
    doc.setFontSize(7); doc.setTextColor(21, 128, 61);
    doc.text("RERA Approved", M + 54, y - 1);
  }
  y += 12;

  // ── Divider ──
  doc.setDrawColor(...orange); doc.setLineWidth(0.7);
  doc.line(M, y, W - M, y); y += 8;

  // ── Spec boxes ──
  const specs = [
    ["Bedrooms",   property.bedrooms    || "N/A"],
    ["Bathrooms",  property.bathrooms   || "N/A"],
    ["Area",       (property.builtupArea || property.sqft || "N/A") + " sqft"],
    ["Parking",    property.parking     || "N/A"],
    ["Facing",     property.facing      || "N/A"],
    ["Furnishing", property.furnishing  || "N/A"],
  ];
  const boxW = (W - 2*M - 8) / 3, boxH = 20;
  specs.forEach(([label, val], i) => {
    const col = i % 3, row = Math.floor(i / 3);
    const bx = M + col*(boxW+4), by = y + row*(boxH+4);
    doc.setFillColor(...light); doc.roundedRect(bx, by, boxW, boxH, 2, 2, "F");
    doc.setDrawColor(226, 232, 240); doc.setLineWidth(0.3); doc.roundedRect(bx, by, boxW, boxH, 2, 2, "S");
    doc.setFontSize(7); doc.setTextColor(...gray); doc.setFont("helvetica","normal");
    doc.text(label.toUpperCase(), bx + 4, by + 7);
    doc.setFontSize(10); doc.setFont("helvetica","bold"); doc.setTextColor(...dark);
    doc.text(String(val), bx + 4, by + 15);
  });
  y += 2 * (boxH + 4) + 8;

  // ── Selected sections ──
  const section = (title) => {
    doc.setFillColor(...navy); doc.rect(M, y, 4, 8, "F");
    doc.setFontSize(12); doc.setFont("helvetica","bold"); doc.setTextColor(...dark);
    doc.text(title, M + 7, y + 6); y += 13;
  };

  if (selections.includes("overview") && property.description) {
    section("Property Overview");
    doc.setFontSize(9); doc.setFont("helvetica","normal"); doc.setTextColor(55, 65, 81);
    const lines = doc.splitTextToSize(property.description, W - 2*M);
    doc.text(lines, M, y); y += lines.length * 5 + 8;
  }

  if (selections.includes("details")) {
    section("Property Details");
    const rows = [
      ["Type",         property.type        || "N/A"],
      ["Built-up Area",property.builtupArea  || "N/A"],
      ["Carpet Area",  property.carpetArea   || "N/A"],
      ["Maintenance",  property.maintenance  || "N/A"],
      ["Developer",    property.developerName|| "N/A"],
      ["Possession",   property.possessionStatus || "N/A"],
    ];
    rows.forEach(([lbl, val], i) => {
      const rowY = y + i*9;
      if (i % 2 === 0) { doc.setFillColor(248,250,252); doc.rect(M, rowY - 3, W - 2*M, 9, "F"); }
      doc.setFontSize(8); doc.setFont("helvetica","normal"); doc.setTextColor(...gray);
      doc.text(lbl, M + 2, rowY + 3);
      doc.setFont("helvetica","bold"); doc.setTextColor(...dark);
      doc.text(String(val), W/2, rowY + 3);
    });
    y += rows.length * 9 + 8;
  }

  if (selections.includes("amenities") && property.amenities?.length) {
    section("Features & Amenities");
    const cols = 3, gap = 4;
    const aw = (W - 2*M - gap*(cols-1)) / cols;
    property.amenities.forEach((a, i) => {
      const col = i % cols, row = Math.floor(i / cols);
      const ax = M + col*(aw+gap), ay = y + row*9;
      doc.setFillColor(239,246,255); doc.roundedRect(ax, ay-3, aw, 8, 1, 1, "F");
      doc.setFontSize(7.5); doc.setFont("helvetica","normal"); doc.setTextColor(...navy);
      doc.text("• " + a, ax+3, ay+2);
    });
    y += (Math.ceil(property.amenities.length/cols)) * 9 + 8;
  }

  if (selections.includes("contact")) {
    if (y > 240) { doc.addPage(); y = 20; }
    doc.setFillColor(...navy); doc.rect(M, y, W - 2*M, 40, "F");
    doc.setFontSize(11); doc.setFont("helvetica","bold"); doc.setTextColor(...white);
    doc.text("Contact Us", M + 8, y + 10);
    doc.setFontSize(8); doc.setFont("helvetica","normal");
    doc.text("📞 +91 83091 20616", M + 8, y + 20);
    doc.text("🌐 www.oneglobalmarketplace.com", M + 8, y + 28);
    doc.text("📍 Bengaluru, Karnataka, India", M + 8, y + 36);
    y += 50;
  }

  // ── Footer ──
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFillColor(...light); doc.rect(0, 285, W, 12, "F");
    doc.setDrawColor(...orange); doc.setLineWidth(0.5); doc.line(0, 285, W, 285);
    doc.setFontSize(7); doc.setTextColor(...gray);
    doc.text("One Global Marketplace — Trusted Real Estate Discovery", M, 291);
    doc.text("Page " + i + " of " + pageCount, W - M - 12, 291);
    doc.text("Generated: " + new Date().toLocaleDateString("en-IN"), W/2 - 10, 291);
  }

  doc.save(`OGM-${property.title?.slice(0,25).replace(/\s+/g, "-") || "Property"}.pdf`);
}

export default function AskDiscoverWidget({ property }) {
  const [phase,         setPhase]         = useState("pill");
  const [input,         setInput]         = useState("");
  const [messages,      setMessages]      = useState([]);
  const [loading,       setLoading]       = useState(false);
  const [visible,       setVisible]       = useState(false);
  const [expanded,      setExpanded]      = useState(false);
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [showHistory,   setShowHistory]   = useState(false);
  const [history,       setHistory]       = useState(() => loadHistory());
  // PDF flow: null | "asking" | "generating"
  const [pdfMode,       setPdfMode]       = useState(null);
  const [pdfSelections, setPdfSelections] = useState(["overview","details","amenities","contact"]);
  const [pdfGenerating, setPdfGenerating] = useState(false);

  const chatIdRef = useRef(`prop-${property?.id}-${Date.now()}`);
  const inputRef  = useRef(null);
  const bottomRef = useRef(null);
  const timerRef  = useRef(null);

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
  useEffect(() => { if (phase === "search") setTimeout(() => inputRef.current?.focus(), 200); }, [phase]);

  const send = useCallback(async (text) => {
    const q = (text || input).trim();
    if (!q || loading) return;
    setInput("");
    setPhase("chat");
    // PDF request?
    if (isPdfQuery(q) && pdfMode === null) {
      setPdfMode("asking");
      setMessages(prev => [...prev,
        { role: "user", content: q },
        { role: "assistant", content: null, isPdfAsk: true },
      ]);
      setLoading(false);
      return;
    }
    const isNearby    = isNearbyQuery(q);
    const isDist      = isDistanceQuery(q);
    const nInfo       = isNearby ? extractNearbyType(q) : {};
    const userMsg = {
      role: "user", content: q,
      needsMap:      isDist || isNearby,
      destination:   isDist ? extractDestination(q) : null,
      nearbyType:    isNearby ? nInfo.type : null,
      nearbyKeyword: isNearby ? nInfo.keyword : null,
    };
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

  const price = property?.price >= 10_000_000
    ? `₹ ${(property.price / 10_000_000).toFixed(2)} Cr`
    : property?.price >= 100_000 ? `₹ ${(property.price / 100_000).toFixed(2)} Lakhs` : "Price on request";

  const thumbImg = property?.mainImages?.[0] || property?.images?.[0] || property?.image;

  const widget = (
    <>
      {/* PILL */}
      {phase === "pill" && (
        <div className={`adw-pill-trigger ${visible ? "adw-pill-visible" : ""}`} onClick={() => setPhase("search")}>
          <div className={`adw-pill-text ${expanded ? "adw-pill-text-expanded" : ""}`}>
            <span className="adw-pill-label">Ask. Discover. Invest...</span>
          </div>
          <div className="adw-pill-robot-wrap">
            <img src={ROBOT_IMG} alt="AI" className="adw-pill-robot" />
            <span className="adw-online-dot" />
          </div>
        </div>
      )}

      {/* SEARCH BAR */}
      {phase === "search" && (
        <>
          <div className="adw-search-bar-wrap">
            <div className="adw-search-bar">
              <img src={ROBOT_IMG} alt="AI" className="adw-search-robot" />
              <input ref={inputRef} className="adw-search-input"
                placeholder="Have more questions? Ask your AI Property Advisor..."
                value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKey} />
              <button className="adw-search-btn" onClick={() => send()} disabled={!input.trim()}>
                <svg width="20" height="20" fill="none" stroke="#fff" strokeWidth="2.5" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
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

      {/* FULL CHAT */}
      {phase === "chat" && (
        <div className="adw-chat-overlay">
          {/* History sidebar */}
          {showHistory && (
            <div className="adw-history-sidebar">
              <div className="adw-history-header">
                <span>Chat History</span>
                <button className="adw-history-close" onClick={() => setShowHistory(false)}>✕</button>
              </div>
              <div className="adw-history-list">
                {history.length === 0 && <div className="adw-history-empty">No previous chats yet</div>}
                {history.map(session => (
                  <div key={session.id} className="adw-history-item"
                    onClick={() => { setMessages(session.messages); setShowHistory(false); }}>
                    <div className="adw-history-title">{session.title}</div>
                    <div className="adw-history-preview">{session.preview}</div>
                    <div className="adw-history-date">{session.date}</div>
                  </div>
                ))}
              </div>
              <button className="adw-history-clear" onClick={() => { localStorage.removeItem("ogm_chat_history"); setHistory([]); }}>
                Clear all history
              </button>
            </div>
          )}

        <div className="adw-chat-inner">

            {/* Mini card */}
            {property && (
              <div className="adw-mini-card">
                {thumbImg && <MiniImageCarousel images={property.mainImages || property.images || [thumbImg]} title={property.title} />}
                <div className="adw-mini-info">
                  <div className="adw-mini-loc">{property.location}</div>
                  <div className="adw-mini-title">{property.title}</div>
                  <div className="adw-mini-specs">
                    <span>{property.type}</span>
                    {property.bedrooms  && <><span className="adw-dot">·</span><svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M3 7v13M21 7v13M3 14h18M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2M5 12V9a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v3M13 12V9a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v3"/></svg><span>{property.bedrooms}</span></>}
                    {property.bathrooms && <><span className="adw-dot">·</span><span>🚿 {property.bathrooms}</span></>}
                  </div>
                  {property.description && (
                    <p className="adw-mini-desc">{property.description.slice(0,110)}{property.description.length>110?"…":""}</p>
                  )}
                  <div className="adw-mini-bullets">
                    <div className="adw-mini-bullet">RERA {property.reraApproved ? "✓ Approved" : "Pending"}</div>
                    {property.parking && <div className="adw-mini-bullet">{property.parking} Parking</div>}
                  </div>
                  <div className="adw-mini-price-row">
                    <span className="adw-mini-price">{price}</span>
                    <div className="adw-mini-actions">
                      <a href="tel:+918309120616" className="adw-mini-action-btn">
                        <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.6 3.27 2 2 0 0 1 3.58 1h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 8.54a16 16 0 0 0 6 6l.91-.91a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                        Contact
                      </a>
                      <button className="adw-mini-action-btn">
                        <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                        Save
                      </button>
                      <button className="adw-mini-action-btn" onClick={() => { setPhase("pill"); setMessages([]); }}>
                        <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                        View
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Messages */}
            <div className="adw-chat-messages">
              {messages.map((msg, i) => (
                <div key={i}>
                  {msg.role === "user" && <div className="adw-user-q">{msg.content}</div>}
                  {msg.role === "assistant" && !msg.isPdfAsk && msg.content && (
                    <div className="adw-assistant-msg">
                      <img src={ROBOT_IMG} alt="AI" className="adw-msg-avatar" />
                      <div className="adw-msg-text">{msg.content}</div>
                    </div>
                  )}
                  {msg.role === "assistant" && msg.isPdfAsk && (
                    <div className="adw-assistant-msg">
                      <img src={ROBOT_IMG} alt="AI" className="adw-msg-avatar" />
                      <div className="adw-pdf-ask-card">
                        <div className="adw-pdf-ask-title">What should I include in the document?</div>
                        <div className="adw-pdf-options">
                          {[
                            { key:"overview",  label:"📝 Property Overview" },
                            { key:"details",   label:"📋 Property Details" },
                            { key:"amenities", label:"✨ Features & Amenities" },
                            { key:"contact",   label:"📞 Contact Information" },
                          ].map(({ key, label }) => (
                            <label key={key} className={`adw-pdf-opt ${pdfSelections.includes(key) ? "selected" : ""}`}>
                              <input type="checkbox" checked={pdfSelections.includes(key)}
                                onChange={e => setPdfSelections(prev =>
                                  e.target.checked ? [...prev, key] : prev.filter(k => k !== key))}
                              />
                              {label}
                            </label>
                          ))}
                        </div>
                        <button
                          className="adw-pdf-generate-btn"
                          disabled={pdfSelections.length === 0 || pdfGenerating}
                          onClick={async () => {
                            setPdfGenerating(true);
                            setMessages(prev => [...prev, { role:"user", content:"Generate the PDF with: " + pdfSelections.join(", ") }]);
                            try {
                              await generatePropertyPDF(property, pdfSelections);
                              setMessages(prev => [...prev, { role:"assistant", content:"✅ Your PDF has been downloaded! It includes: " + pdfSelections.join(", ") + ". Let me know if you need any other information." }]);
                            } catch {
                              setMessages(prev => [...prev, { role:"assistant", content:"Sorry, there was an issue generating the PDF. Please try again." }]);
                            } finally {
                              setPdfGenerating(false);
                              setPdfMode(null);
                            }
                          }}
                        >
                          {pdfGenerating ? "⏳ Generating PDF…" : "⬇ Download PDF"}
                        </button>
                      </div>
                    </div>
                  )}
                  {msg.role === "assistant" && messages[i-1]?.needsMap && (
                    <SmartMap
                      origin={property?.location}
                      destination={messages[i-1].destination}
                      nearbyType={messages[i-1].nearbyType}
                      nearbyKeyword={messages[i-1].nearbyKeyword}
                      onPlaceClick={(pl, num) => setSelectedPlace({ place: pl, number: num })}
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
              <div ref={bottomRef} />
            </div>

            {/* Follow-ups */}
            {!loading && messages.length > 0 && (
              <div className="adw-followups">
                {POST_QUERY_SUGGESTIONS.map(s => (
                  <button key={s} className="adw-followup-chip" onClick={() => send(s)}>{s}</button>
                ))}
              </div>
            )}

            {/* Wide input */}
            <div className="adw-chat-input-wrap">
              <AiBottomSearchBar onSend={(text) => send(text)} />
            </div>

            {selectedPlace && (
              <PlacePanel place={selectedPlace.place} number={selectedPlace.number} onClose={() => setSelectedPlace(null)} />
            )}
            <button className="adw-history-toggle" onClick={() => setShowHistory(v => !v)} title="Chat history">
              <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
              </svg>
            </button>
            <button className="adw-chat-close" onClick={() => {
                if (messages.length > 0) {
                  saveSession(property, messages);
                  setHistory(loadHistory());
                }
                setPhase("pill"); setMessages([]); setSelectedPlace(null); setPdfMode(null);
              }}>✕</button>
          </div>
        </div>
      )}
    </>
  );

  return createPortal(widget, document.body);
}