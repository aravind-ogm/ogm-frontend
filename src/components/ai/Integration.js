/**
 * ═══════════════════════════════════════════════════════════════
 *  INTEGRATION GUIDE — Location-aware AI Search
 *  Copy the relevant snippets into your existing components.
 * ═══════════════════════════════════════════════════════════════
 */


// ─────────────────────────────────────────────────────────────────────────────
// 1. REPLACE your existing chat input with AiChatInput
//    In your AiSearch page / chat container:
// ─────────────────────────────────────────────────────────────────────────────

import AiChatInput        from "./AiChatInput";
import useGeolocation     from "./useGeolocation";
import PropertyDistanceBadge from "./PropertyDistanceBadge";

export default function AiSearchPage() {

  const { position } = useGeolocation();  // share position with cards

  // Your existing state...
  const [messages, setMessages] = useState([]);
  const [loading,  setLoading]  = useState(false);

  // ── Replace your old input submit handler with this ──────────────────────
  const handleSend = async ({ question, userLatitude, userLongitude }) => {
    setLoading(true);
    try {
      const res = await fetch("/api/ai/ask", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          chatId: yourChatId,         // your existing chatId
          userLatitude,               // NEW — null when not a "near me" query
          userLongitude,              // NEW — null when not a "near me" query
        }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: "ai", ...data }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* Your existing message list */}
      {messages.map((msg, i) =>
        msg.properties?.map(property => (
          <PropertyCard
            key={property.id}
            property={property}
            userPosition={position}   // pass position down
          />
        ))
      )}

      {/* Replace old <input> with this */}
      <AiChatInput
        onSend={handleSend}
        disabled={loading}
      />
    </div>
  );
}


// ─────────────────────────────────────────────────────────────────────────────
// 2. ADD distance badge to your existing PropertyCard component
//    Find where you render property tags/badges and add this:
// ─────────────────────────────────────────────────────────────────────────────

function PropertyCard({ property, userPosition }) {
  return (
    <div className="property-card">

      {/* Your existing card content... */}
      <h3>{property.title}</h3>
      <p>{property.location}</p>

      {/* ── ADD THIS wherever you show tags (bhk, bath, sqft chips) ── */}
      <PropertyDistanceBadge
        userLat={userPosition?.latitude}
        userLng={userPosition?.longitude}
        propLat={property.latitude}
        propLng={property.longitude}
      />
      {/* ─────────────────────────────────────────────────────────── */}

      <p>{property.price}</p>
    </div>
  );
}


// ─────────────────────────────────────────────────────────────────────────────
// 3. SORT results by distance (optional — do this after receiving AI results)
//    Call this in handleSend() before setMessages() to rank nearby first.
// ─────────────────────────────────────────────────────────────────────────────

import { haversineDistance } from "./useGeolocation";

function sortByDistance(properties, userLat, userLng) {
  if (!userLat || !userLng) return properties;

  return [...properties].sort((a, b) => {
    const dA = haversineDistance(userLat, userLng, a.latitude, a.longitude) ?? Infinity;
    const dB = haversineDistance(userLat, userLng, b.latitude, b.longitude) ?? Infinity;
    return dA - dB;
  });
}

// Usage in handleSend:
// const data = await res.json();
// if (userLatitude && data.properties) {
//   data.properties = sortByDistance(data.properties, userLatitude, userLongitude);
// }


// ─────────────────────────────────────────────────────────────────────────────
// 4. FILE STRUCTURE — put these 4 files here:
// ─────────────────────────────────────────────────────────────────────────────
//
//  src/
//  └── components/
//      └── ai/
//          ├── AiChatInput.jsx           ← replaces your plain <input>
//          ├── LocationPermissionModal.jsx
//          ├── PropertyDistanceBadge.jsx ← add to your property card
//          └── useGeolocation.js         ← shared hook + helpers