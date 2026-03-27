import React, { useMemo, memo } from 'react';
import { FILTER_CATEGORIES } from './utils';

/**
 * NearbyFilterBar — Scrollable horizontal category filter pills.
 * Counts are derived from the *full* location list so they never change
 * when a filter is active.
 *
 */
const NearbyFilterBar = memo(function NearbyFilterBar({
                                                          locations,
                                                          activeFilter,
                                                          onFilterChange,
                                                      }) {
    const counts = useMemo(() => {
        const map = {};
        locations.forEach((loc) => {
            const c = (loc.category || '').toLowerCase();
            FILTER_CATEGORIES.forEach(({ key }) => {
                if (key !== 'All' && c.includes(key.toLowerCase())) {
                    map[key] = (map[key] || 0) + 1;
                }
            });
        });
        return map;
    }, [locations]);

    return (
        <div className="nearby-filter-bar" role="toolbar" aria-label="Filter nearby places">
            {FILTER_CATEGORIES.map(({ key, label, icon }) => {
                const count = key === 'All' ? locations.length : (counts[key] || 0);
                if (key !== 'All' && count === 0) return null;
                const isActive = activeFilter === key;
                return (
                    <button
                        key={key}
                        className={`nearby-filter-pill${isActive ? ' active' : ''}`}
                        onClick={() => onFilterChange(key)}
                        aria-pressed={isActive}
                        type="button"
                    >
                        <span className="filter-pill-icon" aria-hidden="true">{icon}</span>
                        <span className="filter-pill-label">{label}</span>
                        <span className="filter-pill-count">{count}</span>
                    </button>
                );
            })}
        </div>
    );
});

export default NearbyFilterBar;