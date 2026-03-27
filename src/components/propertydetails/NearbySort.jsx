import React, { memo } from 'react';
import { ChevronDown } from 'lucide-react';
import { SORT_OPTIONS } from './utils';


/**
 * NearbySort — Styled sort dropdown.
 */
const NearbySort = memo(function NearbySort({ sortMode, onSortChange }) {
    return (
        <div className="nearby-sort-wrapper">
            <select
                className="nearby-sort-select"
                value={sortMode}
                onChange={(e) => onSortChange(e.target.value)}
                aria-label="Sort nearby places"
            >
                {SORT_OPTIONS.map(({ value, label }) => (
                    <option key={value} value={value}>{label}</option>
                ))}
            </select>
            <ChevronDown size={13} className="nearby-sort-chevron" aria-hidden="true" />
        </div>
    );
});

export default NearbySort;