/**
 * Integration.js — Reference guide for wiring AI components together.
 * This is NOT a component — it shows how to connect the pieces.
 * DO NOT import this file in production code.
 *
 * BUG FIX: Original had:
 *   - No React import → build crash
 *   - `export default function AiSearchPage()` clashing with real AiSearchPage
 *   - `useState` used without import
 *   - `yourChatId` undefined variable
 *   - `import { haversineDistance } from "./useGeolocation"` (wrong case + duplicate)
 */

// ─── 1. How AiSearchPage sends a message with GPS ────────────────────────────
//
// The sendMessage function in AiSearchPage.js already handles this:
//
//   const response = await fetch(ENDPOINTS.AI_ASK, {
//     method: "POST",
//     headers: { "Content-Type": "application/json" },
//     body: JSON.stringify({
//       question,
//       chatId,
//       userLatitude:     userLat  ?? null,
//       userLongitude:    userLng  ?? null,
//       userLocationName: userLat != null ? userLocName : null,
//       isRouteQuery:     !!detectRouteIntent(text),
//     }),
//   });

// ─── 2. How to add PropertyDistanceBadge to any property card ────────────────
//
// Import:
//   import PropertyDistanceBadge from "./PropertyDistanceBadge";
//
// Usage inside a card (where userPosition comes from useGeolocation):
//
//   <PropertyDistanceBadge
//     userLat={userPosition?.latitude}
//     userLng={userPosition?.longitude}
//     propLat={property.latitude}
//     propLng={property.longitude}
//   />

// ─── 3. How to sort properties by distance ───────────────────────────────────
//
// import { haversineDistance } from "./Usegeolocation"; // note capital U
//
// function sortByDistance(properties, userLat, userLng) {
//   if (!userLat || !userLng) return properties;
//   return [...properties].sort((a, b) => {
//     const dA = haversineDistance(userLat, userLng, a.latitude, a.longitude) ?? Infinity;
//     const dB = haversineDistance(userLat, userLng, b.latitude, b.longitude) ?? Infinity;
//     return dA - dB;
//   });
// }

export {}; // keep as ES module