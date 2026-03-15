
import PropertyDistanceBadge from "./PropertyDistanceBadge";

function ExampleCardSection({ msg, userPosition }) {
  return (
    <>
      {msg.properties?.map((property) => (
        <div key={property.id} className="property-card">

          {/* ... your existing image, title, location etc ... */}
          <h3>{property.title}</h3>
          <p>{property.location}</p>

          {/* Existing detail chips */}
          <div className="property-tags">
            {property.type     && <span className="tag">{property.type}</span>}
            {property.bedrooms && <span className="tag">{property.bedrooms} BHK</span>}
            {property.bathrooms && <span className="tag">{property.bathrooms} Bath</span>}
            {property.sqft     && <span className="tag">{property.sqft} Sqft</span>}

            {/* ── ADD THIS ── distance badge (auto-hides if no coords) */}
            <PropertyDistanceBadge
              userLat={userPosition?.latitude}
              userLng={userPosition?.longitude}
              propLat={property.latitude}
              propLng={property.longitude}
            />
          </div>

          {/* ... rest of card ... */}
        </div>
      ))}
    </>
  );
}