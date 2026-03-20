import React, { memo } from "react";
import "../styles/Amenities.css";

/* ─── Icon map — matches keywords in amenity names ──────────────────────── */
const ICON_MAP = [
  // Parking & Cars
  { keys: ["parking", "car", "garage", "vehicle"],
    svg: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M5 17H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v9a2 2 0 0 1-2 2h-2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/></svg> },
  // Lift / Elevator
  { keys: ["lift", "elevator"],
    svg: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2"/><path d="M9 9l3-3 3 3"/><path d="M9 15l3 3 3-3"/></svg> },
  // Swimming pool
  { keys: ["pool", "swimming"],
    svg: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12h20"/><path d="M2 16c2.5 0 2.5 2 5 2s2.5-2 5-2 2.5 2 5 2 2.5-2 5-2"/><path d="M6 12V6a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v6"/></svg> },
  // Gym / Fitness
  { keys: ["gym", "fitness", "workout", "exercise"],
    svg: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M6.5 6.5h11"/><path d="M6.5 17.5h11"/><path d="M3 9.5h18"/><path d="M3 14.5h18"/><rect x="1" y="8" width="4" height="8" rx="1"/><rect x="19" y="8" width="4" height="8" rx="1"/></svg> },
  // Garden / Outdoor
  { keys: ["garden", "terrace", "balcony", "courtyard", "outdoor", "open-to-sky", "sit-out", "landscape"],
    svg: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22V12"/><path d="M5 12s1-5 7-5 7 5 7 5"/><path d="M3 22h18"/><path d="M8 22v-4c0-1 .5-2 2-2h4c1.5 0 2 1 2 2v4"/></svg> },
  // Security / CCTV
  { keys: ["security", "cctv", "guard", "surveillance", "intercom"],
    svg: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg> },
  // Power backup
  { keys: ["power", "generator", "backup", "electricity", "solar"],
    svg: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg> },
  // Kitchen
  { keys: ["kitchen", "modular", "cooking"],
    svg: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3zm0 0v7"/></svg> },
  // Dining
  { keys: ["dining", "lounge", "living room", "family"],
    svg: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 11l19-9-9 19-2-8-8-2z"/></svg> },
  // Staircase
  { keys: ["staircase", "stair"],
    svg: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 20 4 14 10 14 10 8 16 8 16 2 20 2"/><polyline points="4 20 20 20"/></svg> },
  // Utility / Laundry
  { keys: ["utility", "laundry", "washing", "store"],
    svg: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="18" rx="2"/><circle cx="12" cy="13" r="4"/><path d="M5 7h.01M8 7h.01"/></svg> },
  // Pooja / Temple
  { keys: ["pooja", "temple", "prayer", "meditation"],
    svg: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg> },
  // Media / Entertainment
  { keys: ["media", "entertainment", "theatre", "theater", "home cinema", "av"],
    svg: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg> },
  // WiFi / Internet
  { keys: ["wifi", "internet", "broadband", "fibre"],
    svg: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><circle cx="12" cy="20" r="1" fill="currentColor"/></svg> },
  // Powder room / Toilet / Bathroom
  { keys: ["powder", "toilet", "bathroom", "washroom", "wc"],
    svg: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6 C9 4 7 3 5 4 L5 11 L9 11"/><path d="M5 11 C5 16 9 20 14 20 C19 20 21 16 21 11 L9 11"/><path d="M3 20 L5 11"/></svg> },
  // Bedroom / Room
  { keys: ["bedroom", "room", "suite", "master"],
    svg: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7v13"/><path d="M21 7v13"/><path d="M3 14h18"/><path d="M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2"/><path d="M5 12V9a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v3"/><path d="M13 12V9a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v3"/></svg> },
  // Clubhouse / Community
  { keys: ["club", "community", "society", "association"],
    svg: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg> },
  // Play / Kids
  { keys: ["play", "kids", "children", "park", "playground"],
    svg: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg> },
  // Water / Supply
  { keys: ["water", "supply", "borewell", "tank", "rainwater"],
    svg: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2C6 9 4 13 4 16a8 8 0 0 0 16 0c0-3-2-7-8-14z"/></svg> },
  // Vastu
  { keys: ["vastu"],
    svg: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg> },
  // Default fallback
  { keys: [],
    svg: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="m9 12 2 2 4-4"/><path d="M5 7c0-1.1.9-2 2-2h10a2 2 0 0 1 2 2v12H5V7z"/><path d="M22 19H2"/></svg> },
];

function getIcon(name) {
  if (!name) return ICON_MAP[ICON_MAP.length - 1].svg;
  const lower = name.toLowerCase();
  for (const entry of ICON_MAP) {
    if (entry.keys.some(k => lower.includes(k))) return entry.svg;
  }
  return ICON_MAP[ICON_MAP.length - 1].svg;
}

/* ─── Color cycling for variety ─────────────────────────────────────────── */
const COLORS = [
  { bg: "#eff6ff", stroke: "#2563eb" },
  { bg: "#fff7ed", stroke: "#f97316" },
  { bg: "#f0fdf4", stroke: "#059669" },
  { bg: "#fdf4ff", stroke: "#9333ea" },
  { bg: "#fff1f2", stroke: "#e11d48" },
  { bg: "#f0f9ff", stroke: "#0891b2" },
];

function AmenityCard({ name, index }) {
  const color = COLORS[index % COLORS.length];
  return (
    <div className="amenity-card">
      <div className="amenity-icon" style={{ background: color.bg, color: color.stroke }}>
        {getIcon(name)}
      </div>
      <span className="amenity-name">{name}</span>
    </div>
  );
}

function Amenities({ amenities = [] }) {
  if (!amenities.length) return null;
  return (
    <div className="amenities-grid">
      {amenities.map((a, i) => (
        <AmenityCard key={i} name={a} index={i} />
      ))}
    </div>
  );
}

export default memo(Amenities);