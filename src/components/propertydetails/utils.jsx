/**
 * utils.js — Shared constants and pure utility functions
 * Import from any sub-component; no React dependency here.
 */

/* ─── Category colours ──────────────────────────────────────────────────── */
export const CATEGORY_COLOURS = {
    restaurant:  '#f97316',
    play:        '#8b5cf6',
    school:      '#0ea5e9',
    hospital:    '#ef4444',
    mall:        '#ec4899',
    park:        '#22c55e',
    gym:         '#f59e0b',
    cafe:        '#92400e',
    temple:      '#7c3aed',
    metro:       '#0891b2',
    supermarket: '#16a34a',
    office:      '#6366f1',
    default:     '#2563eb',
};

export const LEGEND_ITEMS = [
    { key: 'hospital',    label: 'Hospital',     colour: '#ef4444' },
    { key: 'school',      label: 'School',       colour: '#0ea5e9' },
    { key: 'park',        label: 'Park',         colour: '#22c55e' },
    { key: 'restaurant',  label: 'Restaurant',   colour: '#f97316' },
    { key: 'temple',      label: 'Temple',       colour: '#7c3aed' },
    { key: 'mall',        label: 'Mall',         colour: '#ec4899' },
    { key: 'gym',         label: 'Gym',          colour: '#f59e0b' },
    { key: 'cafe',        label: 'Cafe',         colour: '#92400e' },
    { key: 'metro',       label: 'Metro',        colour: '#0891b2' },
    { key: 'supermarket', label: 'Supermarket',  colour: '#16a34a' },
    { key: 'office',      label: 'Office',       colour: '#6366f1' },
    { key: 'play',        label: 'Play Area',    colour: '#8b5cf6' },
];

export const FILTER_CATEGORIES = [
    { key: 'All',         label: 'All',          icon: '🗺️' },
    { key: 'hospital',    label: 'Hospitals',    icon: '🏥' },
    { key: 'school',      label: 'Schools',      icon: '🏫' },
    { key: 'restaurant',  label: 'Restaurants',  icon: '🍽️' },
    { key: 'park',        label: 'Parks',        icon: '🌳' },
    { key: 'gym',         label: 'Gyms',         icon: '💪' },
    { key: 'temple',      label: 'Temples',      icon: '🛕' },
    { key: 'mall',        label: 'Malls',        icon: '🛍️' },
    { key: 'cafe',        label: 'Cafes',        icon: '☕' },
    { key: 'metro',       label: 'Metro',        icon: '🚇' },
    { key: 'supermarket', label: 'Supermarkets', icon: '🛒' },
    { key: 'office',      label: 'Offices',      icon: '🏢' },
    { key: 'play',        label: 'Play Areas',   icon: '🎠' },
];

export const SORT_OPTIONS = [
    { value: 'nearest',   label: '📍 Nearest First'     },
    { value: 'rated',     label: '⭐ Highest Rated'     },
    { value: 'traveltime',label: '🚗 Travel Time'       },
    { value: 'important', label: '🏥 Most Important'    },
    { value: 'lifestyle', label: '🍹 Lifestyle'         },
    { value: 'family',    label: '👨‍👩‍👧 Family Friendly' },
];

export const IMPORTANT_CATEGORIES = ['hospital', 'school', 'metro', 'supermarket'];

export const SUMMARY_GROUPS = [
    { key: 'hospital',    label: 'Hospital',     icon: '🏥', maxKm: 5 },
    { key: 'school',      label: 'School',       icon: '🏫', maxKm: 3 },
    { key: 'metro',       label: 'Metro Station',icon: '🚇', maxKm: 5 },
    { key: 'restaurant',  label: 'Restaurant',   icon: '🍽️', maxKm: 2 },
    { key: 'park',        label: 'Park',         icon: '🌳', maxKm: 3 },
    { key: 'supermarket', label: 'Supermarket',  icon: '🛒', maxKm: 3 },
];

/* ─── Helpers ────────────────────────────────────────────────────────────── */

/** Hex colour for a category string */
export function categoryColour(cat) {
    if (!cat) return CATEGORY_COLOURS.default;
    const lower = cat.toLowerCase();
    const key = Object.keys(CATEGORY_COLOURS).find((k) => lower.includes(k));
    return key ? CATEGORY_COLOURS[key] : CATEGORY_COLOURS.default;
}

/** Is this category designated "important"? */
export function isImportant(category) {
    if (!category) return false;
    const lower = category.toLowerCase();
    return IMPORTANT_CATEGORIES.some((k) => lower.includes(k));
}

/** Parse "3.2 km" or "800 m" → km as number */
export function parseDistanceKm(distanceStr) {
    if (!distanceStr) return 99;
    const m = String(distanceStr).toLowerCase().trim().match(/([\d.]+)\s*(km|m)/);
    if (!m) return 99;
    const val = parseFloat(m[1]);
    return m[2] === 'm' ? val / 1000 : val;
}

/** Estimate drive + walk times from a distance string (Haversine fallback) */
export function estimateTravelTime(distanceStr) {
    const km = parseDistanceKm(distanceStr);
    if (km >= 90) return null;
    return {
        driveMin: Math.max(1, Math.round((km / 30) * 60)),
        walkMin:  Math.max(1, Math.round((km / 5)  * 60)),
    };
}

/** Format minutes → "8 min" or "1h 5m" */
export function formatTime(min) {
    if (!min || min < 1) return '< 1 min';
    if (min < 60) return `${min} min`;
    return `${Math.floor(min / 60)}h ${min % 60}m`;
}

/** Importance score for sorting */
function importanceScore(category) {
    if (!category) return 0;
    const c = category.toLowerCase();
    if (c.includes('hospital'))    return 10;
    if (c.includes('school'))      return 9;
    if (c.includes('metro'))       return 8;
    if (c.includes('supermarket')) return 7;
    return 0;
}

/** Sort locations[] by sortMode */
export function sortLocations(locations, sortMode) {
    const arr = [...locations];
    switch (sortMode) {
        case 'nearest':
            return arr.sort((a, b) => parseDistanceKm(a.distance) - parseDistanceKm(b.distance));
        case 'farthest':
            return arr.sort((a, b) => parseDistanceKm(b.distance) - parseDistanceKm(a.distance));
        case 'rated':
            return arr.sort((a, b) => (parseFloat(b.rating) || 0) - (parseFloat(a.rating) || 0));
        case 'traveltime':
            return arr.sort((a, b) => parseDistanceKm(a.distance) - parseDistanceKm(b.distance));
        case 'important':
            return arr.sort((a, b) => {
                const diff = importanceScore(b.category) - importanceScore(a.category);
                return diff !== 0 ? diff : parseDistanceKm(a.distance) - parseDistanceKm(b.distance);
            });
        case 'lifestyle': {
            const order = ['restaurant', 'cafe', 'mall', 'gym', 'park', 'play'];
            return arr.sort((a, b) => {
                const ai = order.findIndex((k) => (a.category || '').toLowerCase().includes(k));
                const bi = order.findIndex((k) => (b.category || '').toLowerCase().includes(k));
                return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
            });
        }
        case 'family': {
            const order = ['school', 'hospital', 'park', 'supermarket'];
            return arr.sort((a, b) => {
                const ai = order.findIndex((k) => (a.category || '').toLowerCase().includes(k));
                const bi = order.findIndex((k) => (b.category || '').toLowerCase().includes(k));
                return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
            });
        }
        default:
            return arr;
    }
}

/** Open a place in Google Maps */
export function openInGoogleMaps(lat, lng, name) {
    const query = lat && lng
        ? `${lat},${lng}`
        : encodeURIComponent(name || '');
    window.open(
        `https://www.google.com/maps/search/?api=1&query=${query}`,
        '_blank',
        'noopener,noreferrer',
    );
}

/** Render filled/empty star string from a numeric rating */
export function renderStars(rating) {
    if (!rating) return null;
    const r = Math.round(parseFloat(rating) * 2) / 2; // half-star precision
    return Array.from({ length: 5 }, (_, i) => {
        if (i + 1 <= r)   return '★';
        if (i + 0.5 <= r) return '⯨';
        return '☆';
    }).join('');
}

/** Build a Google Maps directions URL */
export function directionsUrl(fromCoords, toLat, toLng, mode = 'driving') {
    if (!fromCoords) {
        return `https://www.google.com/maps/dir/?api=1&destination=${toLat},${toLng}&travelmode=${mode}`;
    }
    return `https://www.google.com/maps/dir/?api=1&origin=${fromCoords.lat},${fromCoords.lng}&destination=${toLat},${toLng}&travelmode=${mode}`;
}