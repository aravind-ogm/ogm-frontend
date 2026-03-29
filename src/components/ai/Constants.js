/* ─────────────────────────────────────────────
   APP CONSTANTS
   ───────────────────────────────────────────── */

// Ensure API_BASE always ends with /api
// If REACT_APP_API_URL is set to "http://localhost:8080" (missing /api), we add it
const _rawBase = process.env.REACT_APP_API_URL || "http://localhost:8080/api";
export const API_BASE = _rawBase.endsWith("/api") ? _rawBase : _rawBase.replace(/\/$/, "") + "/api";

export const ENDPOINTS = {
  AI_ASK:   `${API_BASE}/ai/ask`,
  AGENT_ASK:`${API_BASE}/agent/ask`,
};

export const FALLBACK_IMAGE = "/images/placeholder.jpg";

/* ─────────────────────────────────────────────
   SUGGESTION CHIPS
   Based on actual DB properties:
   - 20 properties across Bengaluru + Tamil Nadu
   - Price range: ₹32L – ₹6.3 Cr
   - Types: Apartment (9), Villa (5), Plot (2),
            Rowhouse (1), Studio (1), Penthouse (1)
   - Hot areas: Whitefield, Koramangala, Sarjapur,
                Electronic City, Hebbal, MG Road
   - 18/20 RERA approved
   ───────────────────────────────────────────── */

export const DEFAULT_SUGGESTIONS = [
  // ── Affordable entry points (most searched) ──
  {
    label: "2 BHK under ₹70L",
    value: "find me 2 bhk apartments under 70 lakhs",
    icon:  "🏠",
    category: "budget",
  },
  {
    label: "Apartments under ₹1 Cr",
    value: "show me apartments under 1 crore in Bengaluru",
    icon:  "💰",
    category: "budget",
  },

  // ── Location-specific (areas with actual listings) ──
  {
    label: "2 BHK in Whitefield",
    value: "2 bhk apartments in whitefield",
    icon:  "📍",
    category: "location",
  },
  {
    label: "Properties in Sarjapur",
    value: "show me properties on sarjapur road",
    icon:  "📍",
    category: "location",
  },
  {
    label: "Flats near Electronic City",
    value: "apartments near electronic city",
    icon:  "📍",
    category: "location",
  },
  {
    label: "3 BHK in Koramangala",
    value: "3 bhk in koramangala",
    icon:  "📍",
    category: "location",
  },

  // ── Property types (all exist in DB) ──
  {
    label: "Luxury villas",
    value: "show me luxury villas in bengaluru",
    icon:  "🏡",
    category: "type",
  },
  {
    label: "Villa plots",
    value: "villa plots in gated community",
    icon:  "🌱",
    category: "type",
  },
  {
    label: "Premium penthouses",
    value: "luxury penthouse in bengaluru",
    icon:  "🏙️",
    category: "type",
  },
  {
    label: "Studio apartments",
    value: "studio apartments in electronic city",
    icon:  "🎓",
    category: "type",
  },

  // ── Lifestyle / investment ──
  {
    label: "Gated community 3 BHK",
    value: "3 bhk in gated community in bengaluru",
    icon:  "🔐",
    category: "lifestyle",
  },
  {
    label: "Investment properties",
    value: "properties with good rental yield in south bangalore",
    icon:  "📈",
    category: "investment",
  },
  {
    label: "RERA approved projects",
    value: "show me only rera approved properties",
    icon:  "✅",
    category: "trust",
  },
  {
    label: "Holiday homes",
    value: "holiday homes and resort villas near bangalore",
    icon:  "🌴",
    category: "lifestyle",
  },
];

/* ─────────────────────────────────────────────
   SUGGESTION CARDS  (shown on empty state screen)
   Curated cards with real price ranges from DB
   ───────────────────────────────────────────── */

export const SUGGESTION_CARDS = [
  {
    title:    "Affordable 2 BHKs",
    subtitle: "₹56L – ₹68L · Whitefield & Bannerghatta",
    query:    "2 bhk apartments under 70 lakhs",
    icon:     "🏠",
    tag:      "Best Value",
    tagColor: "#16a34a",
  },
  {
    title:    "Luxury Villas",
    subtitle: "₹1.25 Cr – ₹6.3 Cr · Whitefield, Yelahanka",
    query:    "luxury villas in bangalore",
    icon:     "🏡",
    tag:      "Premium",
    tagColor: "#f97316",
  },
  {
    title:    "IT Corridor Flats",
    subtitle: "₹32L – ₹75L · Electronic City & Sarjapur",
    query:    "apartments near electronic city and sarjapur road",
    icon:     "💻",
    tag:      "IT Hub",
    tagColor: "#2563eb",
  },
  {
    title:    "Premium 3 BHKs",
    subtitle: "₹40L – ₹2.95 Cr · Junnasandra, Hebbal, MG Road",
    query:    "3 bhk apartments in bengaluru",
    icon:     "🌟",
    tag:      "Popular",
    tagColor: "#7c3aed",
  },
  {
    title:    "Villa Plots",
    subtitle: "₹82L – ₹95L · Sarjapur & Devanahalli",
    query:    "villa plots in gated community bengaluru",
    icon:     "🌱",
    tag:      "High ROI",
    tagColor: "#059669",
  },
  {
    title:    "Holiday Homes",
    subtitle: "₹1.25 Cr · Bali-themed resort near Bangalore",
    query:    "holiday homes resort villas near bangalore",
    icon:     "🌴",
    tag:      "Weekend Retreat",
    tagColor: "#0891b2",
  },
];

export const KEYBOARD_SHORTCUTS = {
  NEW_CHAT:       "n",  // Ctrl+N
  SEARCH:         "k",  // Ctrl+K
  TOGGLE_SIDEBAR: "b",  // Ctrl+B
  TOGGLE_THEME:   "j",  // Ctrl+J
};