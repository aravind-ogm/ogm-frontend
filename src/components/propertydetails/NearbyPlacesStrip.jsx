import React, { memo, useMemo } from 'react';
import { categoryColour, isImportant } from './utils';

/**
 * NearbyPlacesStrip
 * Horizontal scrollable list of ALL nearby places shown above the map.
 * Clicking a chip highlights that place on the map + opens the right panel.
 *
 * Props:
 *   locations   — full allLocations array
 *   activeId    — currently selected _stableId
 *   onSelect    — (sid) => void
 */
const NearbyPlacesStrip = memo(function NearbyPlacesStrip({
                                                              locations,
                                                              activeId,
                                                              onSelect,
                                                          }) {
    // Group by category for display order: important ones first
    const sorted = useMemo(() => {
        const importantFirst = [...locations].sort((a, b) => {
            const ai = isImportant(a.category) ? 0 : 1;
            const bi = isImportant(b.category) ? 0 : 1;
            return ai - bi;
        });
        return importantFirst;
    }, [locations]);

    if (!sorted.length) return null;

    return (
        <div className="nps-wrapper" aria-label="Nearby places quick select">
            <div className="nps-scroll">
                {sorted.map((loc) => {
                    const colour    = categoryColour(loc.category);
                    const important = isImportant(loc.category);
                    const isActive  = activeId === loc._stableId;

                    return (
                        <button
                            key={loc._stableId}
                            className={[
                                'nps-chip',
                                isActive    ? 'nps-chip--active'    : '',
                                important   ? 'nps-chip--important' : '',
                            ].filter(Boolean).join(' ')}
                            style={{
                                '--chip-colour': colour,
                            }}
                            onClick={() => onSelect(loc._stableId)}
                            type="button"
                            aria-pressed={isActive}
                            title={`${loc.name}${loc.distance ? ' · ' + loc.distance : ''}`}
                        >
                            {/* Category dot */}
                            <span
                                className="nps-dot"
                                style={{ background: colour }}
                                aria-hidden="true"
                            />

                            {/* Image thumbnail if available */}
                            {loc.image && (
                                <img
                                    src={loc.image}
                                    alt=""
                                    className="nps-thumb"
                                    loading="lazy"
                                    onError={(e) => { e.target.style.display = 'none'; }}
                                />
                            )}

                            <span className="nps-text">
                                <span className="nps-name">{loc.name}</span>
                                {loc.distance && (
                                    <span className="nps-dist">{loc.distance}</span>
                                )}
                            </span>

                            {important && (
                                <span className="nps-star" aria-hidden="true">★</span>
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
});

export default NearbyPlacesStrip;