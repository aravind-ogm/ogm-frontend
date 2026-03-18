/* ─────────────────────────────────────────────────────────────────────────────
   ROUTE INTENT DETECTION
   Parses natural-language queries like:
     "distance between Marathahalli and Yelahanka"
     "route from Koramangala to Whitefield"
     "how far is HSR Layout from MG Road"
     "directions from Indiranagar to Electronic City"
   Returns { origin, destination } or null.
   ───────────────────────────────────────────────────────────────────────────── */

const ROUTE_PATTERNS = [
  // "distance between X and Y"
  /distance\s+between\s+(.+?)\s+(?:and|to)\s+(.+)/i,
  // "route/directions/navigate/path from X to Y"
  /(?:route|directions?|navigate|navigation|path)\s+from\s+(.+?)\s+to\s+(.+)/i,
  // "from X to Y" with distance/route intent keyword nearby
  /\bhow\s+far\s+(?:is\s+)?(.+?)\s+from\s+(.+)/i,
  // "X to Y distance / route / directions"
  /^(.+?)\s+to\s+(.+?)\s+(?:distance|route|directions?|km|kilometers?|miles?)$/i,
  // "travel time from X to Y" / "commute from X to Y"
  /(?:travel\s+time|commute|drive|driving)\s+from\s+(.+?)\s+to\s+(.+)/i,
  // "show route X to Y"
  /show\s+(?:route|directions?|path)\s+(?:from\s+)?(.+?)\s+to\s+(.+)/i,
];

export function detectRouteIntent(text) {
  if (!text) return null;
  const cleaned = text.trim();

  for (const pattern of ROUTE_PATTERNS) {
    const match = cleaned.match(pattern);
    if (match) {
      const origin      = match[1].trim().replace(/[?!.,]+$/, "");
      const destination = match[2].trim().replace(/[?!.,]+$/, "");
      if (origin && destination && origin !== destination) {
        return { origin, destination };
      }
    }
  }
  return null;
}
