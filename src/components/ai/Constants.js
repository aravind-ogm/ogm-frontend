/* ─────────────────────────────────────────────
   APP CONSTANTS
   ───────────────────────────────────────────── */

export const API_BASE = "http://localhost:8080/api";

export const ENDPOINTS = {
  AI_ASK: `${API_BASE}/ai/ask`,
  AGENT_ASK: `${API_BASE}/agent/ask`,
};

export const FALLBACK_IMAGE = "/images/placeholder.jpg";

export const DEFAULT_SUGGESTIONS = [
  { label: "2 BHK in Whitefield",      value: "2 bhk in whitefield" },
  { label: "Villa under 1 Cr",         value: "villa under 1 crore" },
  { label: "3 BHK near metro",         value: "3 bhk near metro" },
  { label: "Luxury apartments Sarjapur", value: "luxury apartments in sarjapur road" },
  { label: "Gated community villas",   value: "gated community villas in bangalore" },
  { label: "Ready to move 2 BHK",      value: "ready to move 2 bhk apartments" },
];

export const KEYBOARD_SHORTCUTS = {
  NEW_CHAT: "n",       // Ctrl+N
  SEARCH: "k",         // Ctrl+K
  TOGGLE_SIDEBAR: "b", // Ctrl+B
  TOGGLE_THEME: "j",   // Ctrl+J
};