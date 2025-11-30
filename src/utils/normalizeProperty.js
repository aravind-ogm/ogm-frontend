export function normalizeProperty(raw = {}) {
  return {
    id: raw.id || "",
    title: raw.title || "Untitled Property",
    location: raw.location || "Location not available",
    price: raw.price || "Price not available",

    // IMAGES — always an array with at least 1 valid image
    images:
      raw.images && raw.images.length > 0
        ? raw.images
        : raw.image
        ? [raw.image]
        : ["/placeholder.jpg"],

    bedrooms: raw.bedrooms ?? "—",
    bathrooms: raw.bathrooms ?? "—",
    carpetArea: raw.carpetArea || "—",
    builtupArea: raw.builtupArea || "—",
    parking: raw.parking || "—",
    maintenance: raw.maintenance || "—",
    facing: raw.facing || "—",
    furnishing: raw.furnishing || "Not Mentioned",
    type: raw.type || "Not Specified",
    possession: raw.possession || "—",

    description:
      raw.description ||
      "Description not available. Please contact us for more details.",

    videoUrl: raw.videoUrl || "/videos/tour.mp4",
  };
}
