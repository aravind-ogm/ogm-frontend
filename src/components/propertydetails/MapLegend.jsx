import React, { memo } from 'react';
import { LEGEND_ITEMS } from './utils';

/**
 * MapLegend — Floating colour-coded legend over the map.
 * Only renders rows for categories actually present in the data.
 */
const MapLegend = memo(function MapLegend({ presentCategories }) {
    const visible = LEGEND_ITEMS.filter((item) => presentCategories.has(item.key));
    if (!visible.length) return null;

    return (
        <div className="nearby-map-legend" role="img" aria-label="Map legend">
            <p className="legend-section-title">MAP LEGEND</p>

            {/* Property pin always shown first */}
            <div className="legend-row">
                <span className="legend-pin-dot" style={{ background: '#ef4444', boxShadow: '0 0 0 2px #fff, 0 0 0 4px #ef4444' }} />
                <span>This Property</span>
            </div>

            <div className="legend-divider" />

            {visible.map(({ key, label, colour }) => (
                <div key={key} className="legend-row">
                    <span className="legend-pin-dot" style={{ background: colour }} />
                    <span>{label}</span>
                </div>
            ))}

            <div className="legend-divider" />
            <div className="legend-row legend-important-row">
                <span className="legend-star-badge">★</span>
                <span>Important Nearby</span>
            </div>
        </div>
    );
});

export default MapLegend;