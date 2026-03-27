import React, {
    useState, useEffect, useCallback, useMemo,
} from 'react';
import NearbyMap from './NearbyMap';
import NearbyRightPanel from './NearbyRightPanel';
import NearbyFilterBar from './NearbyFilterBar';
import NearbySort from './NearbySort';
import NearbySummary from './NearbySummary';
import NearbyCard from './NearbyCard';
import NearbyPlacesStrip from './NearbyPlacesStrip';
import { sortLocations } from './utils';
import './NearbyLocations.css';

/* ─── Mobile breakpoint hook ────────────────────────────────────────────── */
function useIsMobile(breakpoint = 768) {
    const [isMobile, setIsMobile] = useState(() => window.innerWidth < breakpoint);
    useEffect(() => {
        const handler = () => setIsMobile(window.innerWidth < breakpoint);
        const mq = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
        mq.addEventListener('change', handler);
        return () => mq.removeEventListener('change', handler);
    }, [breakpoint]);
    return isMobile;
}

/* ═══════════════════════════════════════════════════════════════════════════
   ROOT COMPONENT
   State management lives here; all child components are "dumb" receivers.

   State table:
     activeId         — _stableId of the click-selected place (zoom + panel + route)
     hoveredId        — _stableId of the card/marker being hovered (bounce/glow only)
     activeFilter     — current filter pill key
     sortMode         — current sort option value
     isPanelOpen      — right panel / bottom-sheet visibility
     isPropertyPanel  — true when the property marker was clicked
     travelMode       — 'DRIVING' | 'WALKING' for route + panel toggle
     propertyCoords   — { lat, lng } resolved by geocoder inside NearbyMap
     directionsRequest— { from, to } passed to NearbyMap to draw a route
═══════════════════════════════════════════════════════════════════════════ */
export default function NearbyLocations({
                                            locations        = [],
                                            propertyLocation = '',
                                            propertyName     = 'This Property',
                                            propertyImage    = '',
                                            loading          = false,
                                            propertyLat      = null,   // ← pass property.latitude directly
                                            propertyLng      = null,   // ← pass property.longitude directly
                                        }) {
    const isMobile = useIsMobile();

    /* ── Normalise: stable ID + original index ── */
    const allLocations = useMemo(
        () =>
            locations.map((loc, i) => ({
                ...loc,
                _stableId: loc.id !== undefined ? String(loc.id) : String(i),
                _index:    i,
            })),
        [locations],
    );

    /* ── Filter + sort ── */
    const [activeFilter, setActiveFilter] = useState('All');
    const [sortMode,     setSortMode]     = useState('nearest');

    /* ── Map ↔ Card sync ── */
    const [activeId,  setActiveId]  = useState(null);
    const [hoveredId, setHoveredId] = useState(null);

    /* ── Panel ── */
    const [isPanelOpen,     setIsPanelOpen]     = useState(false);
    const [isPropertyPanel, setIsPropertyPanel] = useState(false);
    const [travelMode,      setTravelMode]      = useState('DRIVING');

    /* ── Directions ── */
    // Seed immediately from property lat/lng so route works on first click.
    // useState initial value only runs once, so we also sync via useEffect
    // in case property data loads after the first render.
    const [propertyCoords,    setPropertyCoords]    = useState(
        propertyLat && propertyLng
            ? { lat: parseFloat(propertyLat), lng: parseFloat(propertyLng) }
            : null
    );

    // Keep propertyCoords in sync if props arrive after mount (API fetch delay)
    useEffect(() => {
        if (propertyLat && propertyLng) {
            setPropertyCoords({
                lat: parseFloat(propertyLat),
                lng: parseFloat(propertyLng),
            });
        }
    }, [propertyLat, propertyLng]);

    const [directionsRequest, setDirectionsRequest] = useState(null);

    /* ── Derived: filtered + sorted locations ── */
    const filteredLocations = useMemo(() => {
        const base =
            activeFilter === 'All'
                ? allLocations
                : allLocations.filter((loc) =>
                    (loc.category || '').toLowerCase().includes(activeFilter.toLowerCase()),
                );
        return sortLocations(base, sortMode);
    }, [allLocations, activeFilter, sortMode]);

    /* ── Selected place object (for right panel) ── */
    const selectedPlace = useMemo(
        () => (activeId ? allLocations.find((l) => l._stableId === activeId) ?? null : null),
        [allLocations, activeId],
    );

    /* ─────────────────────────────────────────────────────────────────────
       HANDLERS
    ───────────────────────────────────────────────────────────────────── */

    /** Shared: select a place from card click, marker click, or list.
     *  Zooms map, opens panel, draws route. */
    const handlePlaceSelect = useCallback(
        (sid) => {
            const place = allLocations.find((l) => l._stableId === sid);
            if (!place) return;

            setActiveId(sid);
            setIsPropertyPanel(false);
            setIsPanelOpen(true);

            const lat = parseFloat(place.latitude ?? place.lat);
            const lng = parseFloat(place.longitude ?? place.lng);
            if (!isNaN(lat) && !isNaN(lng) && propertyCoords) {
                setDirectionsRequest({ from: propertyCoords, to: { lat, lng } });
            }
        },
        [allLocations, propertyCoords],
    );

    /** Property marker clicked */
    const handlePropertySelect = useCallback(() => {
        setActiveId(null);
        setIsPropertyPanel(true);
        setIsPanelOpen(true);
        setDirectionsRequest(null);
    }, []);

    /** Close panel, deselect, clear route */
    const handlePanelClose = useCallback(() => {
        setIsPanelOpen(false);
        setActiveId(null);
        setDirectionsRequest(null);
        setTimeout(() => setIsPropertyPanel(false), 350);
    }, []);

    /** Map background click → same as panel close */
    const handleMapBackgroundClick = useCallback(() => {
        handlePanelClose();
    }, [handlePanelClose]);

    /** Filter change → reset selection */
    const handleFilterChange = useCallback((key) => {
        setActiveFilter(key);
        setActiveId(null);
        setIsPanelOpen(false);
        setDirectionsRequest(null);
    }, []);

    /** Travel mode toggle (from panel) */
    const handleTravelModeChange = useCallback((mode) => {
        setTravelMode(mode);
        // directionsRequest unchanged; NearbyMap re-routes when travelMode changes
    }, []);

    if (loading) return (
        <section className="nearby-section" aria-label="Nearby Highlights">
            <h2 className="nearby-title">Nearby Highlights</h2>
            <div className="nearby-loading-skeleton">
                <div className="nearby-skel nearby-skel--strip" />
                <div className="nearby-skel nearby-skel--map"   />
                <div className="nearby-skel-cards">
                    {[1,2,3].map(i => <div key={i} className="nearby-skel nearby-skel--card" />)}
                </div>
            </div>
        </section>
    );

    if (!allLocations.length) return null;

    return (
        <section className="nearby-section" aria-label="Nearby Highlights">
            <h2 className="nearby-title">Nearby Highlights</h2>

            {/* Essentials summary strip */}
            <NearbySummary locations={allLocations} />

            {/* Category filter pills */}
            <NearbyFilterBar
                locations={allLocations}
                activeFilter={activeFilter}
                onFilterChange={handleFilterChange}
            />

            {/* Result count + sort */}
            <div className="nearby-controls-row">
                <span className="nearby-results-count">
                    {filteredLocations.length} place
                    {filteredLocations.length !== 1 ? 's' : ''} found
                </span>
                <NearbySort sortMode={sortMode} onSortChange={setSortMode} />
            </div>

            {/* ── Places strip above map ── */}
            <NearbyPlacesStrip
                locations={filteredLocations}
                activeId={activeId}
                onSelect={handlePlaceSelect}
            />

            {/* ── Map + Right Panel layout ── */}
            <div className={`nearby-map-panel-layout${isPanelOpen ? ' panel-open' : ''}`}>
                <div className="nearby-map-container">
                    <NearbyMap
                        locations={filteredLocations}
                        allLocations={allLocations}
                        propertyLocation={propertyLocation}
                        propertyName={propertyName}
                        activeId={activeId}
                        hoveredId={hoveredId}
                        activeFilter={activeFilter}
                        isPanelOpen={isPanelOpen}
                        travelMode={travelMode}
                        directionsRequest={directionsRequest}
                        onMarkerClick={handlePlaceSelect}
                        onPropertyMarkerClick={handlePropertySelect}
                        onPropertyCoordsReady={(coords) => {
                            // Only update if not already seeded from property lat/lng props
                            if (!propertyLat || !propertyLng) setPropertyCoords(coords);
                        }}
                        onMapBackgroundClick={handleMapBackgroundClick}
                    />
                </div>

                {/* Right Panel (desktop slide-in / mobile bottom sheet) */}
                <NearbyRightPanel
                    isOpen={isPanelOpen}
                    onClose={handlePanelClose}
                    selectedPlace={selectedPlace}
                    isPropertyPanel={isPropertyPanel}
                    propertyName={propertyName}
                    propertyLocation={propertyLocation}
                    propertyImage={propertyImage}
                    propertyCoords={propertyCoords}
                    travelMode={travelMode}
                    onTravelModeChange={handleTravelModeChange}
                    isMobile={isMobile}
                    allLocations={allLocations}
                />
            </div>

            {/* Cards grid */}
            <div className="nearby-grid">
                {filteredLocations.length === 0 ? (
                    <div className="nearby-empty">
                        <span className="nearby-empty-icon">🔍</span>
                        <p className="nearby-empty-text">No nearby places found for this filter.</p>
                    </div>
                ) : (
                    filteredLocations.map((item) => (
                        <NearbyCard
                            key={item._stableId}
                            item={item}
                            isActive={activeId === item._stableId}
                            onHover={setHoveredId}
                            onCardClick={handlePlaceSelect}
                        />
                    ))
                )}
            </div>
        </section>
    );
}