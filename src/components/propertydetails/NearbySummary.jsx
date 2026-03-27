import React, { useMemo, memo } from 'react';
import { SUMMARY_GROUPS, parseDistanceKm } from './utils';

/**
 * NearbySummary — "Nearby Essentials" snapshot panel.
 * Shows category counts within configurable km radii.
 */
const NearbySummary = memo(function NearbySummary({ locations }) {
    const groups = useMemo(() => {
        return SUMMARY_GROUPS.map(({ key, label, icon, maxKm }) => {
            const count = locations.filter((loc) => {
                const c = (loc.category || '').toLowerCase();
                return c.includes(key) && parseDistanceKm(loc.distance) <= maxKm;
            }).length;
            return { key, label, icon, maxKm, count };
        }).filter((g) => g.count > 0);
    }, [locations]);

    if (!groups.length) return null;

    return (
        <div className="nearby-summary">
            <p className="nearby-summary-title">📍 Nearby Essentials</p>
            <div className="nearby-summary-grid">
                {groups.map(({ key, label, icon, count, maxKm }) => (
                    <div key={key} className="nearby-summary-chip">
                        <span className="nearby-summary-chip-icon">{icon}</span>
                        <span className="nearby-summary-chip-text">
              <strong>{count}</strong>{' '}{label}{count !== 1 ? 's' : ''}{' '}
                            <span className="nearby-summary-chip-range">within {maxKm} km</span>
            </span>
                    </div>
                ))}
            </div>
        </div>
    );
});

export default NearbySummary;