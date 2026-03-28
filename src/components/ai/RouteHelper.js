/* ─────────────────────────────────────────────────────────────────────────────
   ROUTE INTENT + NEARBY PLACES DETECTION

   KEY RULE: A route query MUST contain explicit navigation language.
   Property search phrases like "ready to move", "2 bhk", "apartments"
   must NEVER be detected as route origins/destinations.
   ───────────────────────────────────────────────────────────────────────────── */

/* ── Property search keywords that disqualify a route match ─────────────── */
// If the query contains ANY of these, it is a property search — never a route.
const PROPERTY_SEARCH_DISQUALIFIERS = [
  "bhk", "bedroom", "bathroom", "sqft", "sq ft", "square feet",
  "apartment", "villa", "flat", "plot", "penthouse", "studio", "duplex", "farmhouse",
  "ready to move", "ready-to-move", "under construction", "new launch", "pre launch",
  "resale", "rera", "furnished", "unfurnished", "semi-furnished",
  "gated community", "luxury", "affordable", "premium",
  "budget", "crore", "lakh", "lakhs", " cr ", "under ₹", "below ₹",
  "amenities", "swimming pool", "gym", "clubhouse",
  "vastu", "possession", "listing", "developer",
];

/* ── Mandatory navigation keywords — at least one MUST be present ────────── */
// A route query must contain at least one of these to be valid.
const NAVIGATION_KEYWORDS = [
  "distance", "route", "directions", "navigate", "navigation",
  "how far", "travel time", "commute", "driving time", "drive time",
  "time to reach", "km from", "kilometers from", "miles from",
  "get directions", "show route", "find route",
];

/* ── Tokens meaning "this property" as origin ───────────────────────────── */
const THIS_PROPERTY_TOKENS = [
  "this property", "the property", "this place", "this home",
  "this flat", "this apartment", "this villa", "this location",
];

/* ── Route patterns — ordered from most specific to least ───────────────── */
const ROUTE_PATTERNS = [
  // "what is the distance between X to/and Y"
  /what\s+is\s+(?:the\s+)?distance\s+(?:between\s+)?(.+?)\s+(?:to|and|from)\s+(.+)/i,

  // "distance this/the property to Y"
  /distance\s+(?:this|the)\s+(?:property|place|home|flat|apartment|villa)\s+(?:to|from)\s+(.+)/i,

  // "distance between X and/to Y"
  /distance\s+between\s+(.+?)\s+(?:and|to)\s+(.+)/i,

  // "distance from X to Y"
  /distance\s+from\s+(.+?)\s+to\s+(.+)/i,

  // "route/directions/navigate from X to Y"
  /(?:route|directions?|navigate|navigation|path)\s+from\s+(.+?)\s+to\s+(.+)/i,

  // "how far is X from Y"
  /\bhow\s+far\s+(?:is\s+)?(.+?)\s+from\s+(.+)/i,

  // "X to Y distance/route/km"  ← requires explicit navigation word at end
  /^(.+?)\s+to\s+(.+?)\s+(?:distance|route|directions?|km|kilometers?|miles?)\s*\??$/i,

  // "travel time/commute/driving from X to Y"
  /(?:travel\s+time|commute|drive|driving)\s+from\s+(.+?)\s+to\s+(.+)/i,

  // "show route/directions X to Y"
  /show\s+(?:route|directions?|path)\s+(?:from\s+)?(.+?)\s+to\s+(.+)/i,

  // "find/get me route from X to Y"
  /(?:find|get)\s+(?:me\s+)?(?:route|directions?)\s+(?:from\s+)?(.+?)\s+to\s+(.+)/i,

  // "time to reach X from Y"
  /time\s+to\s+reach\s+(.+?)\s+from\s+(.+)/i,
];

/**
 * Returns true if the text is clearly a property search query, not a route query.
 * Used to prevent false positives like "ready to move 2 bhk apartments".
 */
function isPropertySearch(text) {
  const lower = text.toLowerCase();
  return PROPERTY_SEARCH_DISQUALIFIERS.some(kw => lower.includes(kw));
}

/**
 * Returns true if the text contains at least one explicit navigation keyword.
 * Prevents "X to Y" from matching general sentences.
 */
function hasNavigationKeyword(text) {
  const lower = text.toLowerCase();
  return NAVIGATION_KEYWORDS.some(kw => lower.includes(kw));
}

/**
 * Returns true if the extracted origin/destination looks like a real place name.
 * Rejects property-search terms that were incorrectly matched.
 */
function isValidLocation(str) {
  if (!str || str.length < 2) return false;
  const lower = str.toLowerCase().trim();

  // Reject if it contains property search terms
  const badTerms = [
    "bhk", "bedroom", "apartment", "villa", "flat", "plot", "studio",
    "ready", "move", "crore", "lakh", "sqft", "furnished", "rera",
    "luxury", "affordable", "gated", "community", "amenities",
    "find", "show", "looking", "want", "need", "suggest", "budget",
  ];
  if (badTerms.some(t => lower.includes(t))) return false;

  // Reject very long phrases (real place names are short)
  if (str.split(/\s+/).length > 6) return false;

  return true;
}

/* ─────────────────────────────────────────────────────────────────────────────
   PUBLIC: detectRouteIntent
   Returns { origin, destination, usePropAsOrigin } or null.
───────────────────────────────────────────────────────────────────────────── */
export function detectRouteIntent(text) {
  if (!text) return null;
  const cleaned = text.trim();

  // GUARD 1: If this looks like a property search, never treat as route
  if (isPropertySearch(cleaned)) return null;

  // GUARD 2: Must contain at least one navigation keyword
  if (!hasNavigationKeyword(cleaned)) return null;

  for (const pattern of ROUTE_PATTERNS) {
    const match = cleaned.match(pattern);
    if (!match) continue;

    // Single-capture pattern: "distance to X" (property is implied origin)
    if (match[1] && !match[2]) {
      const destination = match[1].trim().replace(/[?!.,]+$/, "").trim();
      if (isValidLocation(destination)) {
        return { origin: "__PROPERTY__", destination, usePropAsOrigin: true };
      }
      continue;
    }

    const origin      = match[1].trim().replace(/[?!.,]+$/, "").trim();
    const destination = match[2].trim().replace(/[?!.,]+$/, "").trim();

    if (!isValidLocation(origin) || !isValidLocation(destination)) continue;
    if (origin.toLowerCase() === destination.toLowerCase()) continue;

    const isPropertyOrigin = THIS_PROPERTY_TOKENS.some(t =>
        origin.toLowerCase().includes(t.toLowerCase())
    );

    return {
      origin:          isPropertyOrigin ? "__PROPERTY__" : origin,
      destination,
      usePropAsOrigin: isPropertyOrigin,
    };
  }

  // LAST RESORT: "X to Y" plain — only if explicit navigation keyword present
  // e.g. "whitefield to marathahalli distance"
  if (hasNavigationKeyword(cleaned)) {
    const simpleMatch = cleaned.match(/^(.+?)\s+to\s+(.+?)\s*\??$/i);
    if (simpleMatch) {
      const a = simpleMatch[1].trim();
      const b = simpleMatch[2].trim();
      if (isValidLocation(a) && isValidLocation(b)) {
        const isPropertyOrigin = THIS_PROPERTY_TOKENS.some(t => a.toLowerCase().includes(t));
        return {
          origin:          isPropertyOrigin ? "__PROPERTY__" : a,
          destination:     b,
          usePropAsOrigin: isPropertyOrigin,
        };
      }
    }
  }

  return null;
}

/* ─────────────────────────────────────────────────────────────────────────────
   PUBLIC: detectNearbyIntent
   Returns { type, label, useCurrentLocation, location } or null.
───────────────────────────────────────────────────────────────────────────── */
const PLACE_TYPE_MAP = {
  "school":      { type: "school",            label: "Schools"      },
  "schools":     { type: "school",            label: "Schools"      },
  "hospital":    { type: "hospital",          label: "Hospitals"    },
  "hospitals":   { type: "hospital",          label: "Hospitals"    },
  "restaurant":  { type: "restaurant",        label: "Restaurants"  },
  "restaurants": { type: "restaurant",        label: "Restaurants"  },
  "hotel":       { type: "lodging",           label: "Hotels"       },
  "hotels":      { type: "lodging",           label: "Hotels"       },
  "gym":         { type: "gym",               label: "Gyms"         },
  "gyms":        { type: "gym",               label: "Gyms"         },
  "mall":        { type: "shopping_mall",     label: "Malls"        },
  "malls":       { type: "shopping_mall",     label: "Malls"        },
  "temple":      { type: "place_of_worship",  label: "Temples"      },
  "temples":     { type: "place_of_worship",  label: "Temples"      },
  "pharmacy":    { type: "pharmacy",          label: "Pharmacies"   },
  "pharmacies":  { type: "pharmacy",          label: "Pharmacies"   },
  "park":        { type: "park",              label: "Parks"        },
  "parks":       { type: "park",              label: "Parks"        },
  "atm":         { type: "atm",               label: "ATMs"         },
  "bank":        { type: "bank",              label: "Banks"        },
  "banks":       { type: "bank",              label: "Banks"        },
};

export function detectNearbyIntent(text) {
  if (!text) return null;
  const lower = text.toLowerCase().trim();

  // Property search terms disqualify nearby intent too
  // (e.g. "find hospitals near Whitefield" — fine, but "apartment near me" is property search)
  // Only disqualify if the query is primarily a property search with no nearby intent language
  const hasNearbyLanguage = /close\s+by|nearby|near\s+me|near\s+\w|around\s+me|hospitals|schools|gyms|restaurants|malls|temples|pharmacies|parks/.test(lower);
  if (!hasNearbyLanguage) return null;

  // Find place type
  let placeInfo = null;
  for (const [word, info] of Object.entries(PLACE_TYPE_MAP)) {
    if (lower.includes(word)) { placeInfo = info; break; }
  }
  if (!placeInfo) return null;

  // "close by" / "nearby" / "near me" → use GPS
  if (/close\s+by|nearby|near\s+me|around\s+me|from\s+here/.test(lower)) {
    return { ...placeInfo, useCurrentLocation: true, location: null };
  }

  // Extract named location after "near/in/around/close to"
  const locMatch = lower.match(/(?:near|in|around|close\s+to)\s+([a-z][a-z\s]{1,30})(?:\?|$)/);
  if (locMatch?.[1]?.trim().length > 2) {
    return { ...placeInfo, useCurrentLocation: false, location: locMatch[1].trim() };
  }

  return { ...placeInfo, useCurrentLocation: true, location: null };
}

/* ─────────────────────────────────────────────────────────────────────────────
   PUBLIC: resolvePropertyReference
   Replaces "this property" / "this home" etc. with the actual property name.
───────────────────────────────────────────────────────────────────────────── */
export function resolvePropertyReference(text, propertyLocation) {
  if (!text || !propertyLocation) return text;
  let resolved = text;
  THIS_PROPERTY_TOKENS.forEach(token => {
    resolved = resolved.replace(new RegExp(token, "gi"), propertyLocation);
  });
  return resolved;
}