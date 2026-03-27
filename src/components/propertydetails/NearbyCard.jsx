import React, { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import { MapPin, Navigation, Share2, Bookmark } from 'lucide-react';
import {
    categoryColour,
    isImportant,
    estimateTravelTime,
    formatTime,
    openInGoogleMaps,
    renderStars,
} from './utils';

/**
 * NearbyCard — Individual place card.
 *
 * Bi-directional sync:
 *   hover → map marker bounces (via onHover callback)
 *   click → map zooms + panel opens (via onCardClick callback)
 *   isActive → card scrolls into view + shows highlight ring
 */
const NearbyCard = memo(function NearbyCard({
                                                item,
                                                isActive,
                                                onHover,
                                                onCardClick,
                                            }) {
    const [saved,    setSaved]    = useState(false);
    const [imgError, setImgError] = useState(false);
    const cardRef = useRef(null);

    const colour    = useMemo(() => categoryColour(item.category), [item.category]);
    const important = useMemo(() => isImportant(item.category),    [item.category]);
    const travel    = useMemo(() => estimateTravelTime(item.distance), [item.distance]);
    const stars     = useMemo(() => renderStars(item.rating), [item.rating]);
    const sid       = item._stableId;
    const markerNum = item._index !== undefined ? item._index + 1 : '·';

    // Scroll active card into view when activated by a marker click
    useEffect(() => {
        if (isActive && cardRef.current) {
            cardRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }, [isActive]);

    const handleNavigate = useCallback((e) => {
        e.stopPropagation();
        openInGoogleMaps(
            item.latitude  ?? item.lat,
            item.longitude ?? item.lng,
            item.name,
        );
    }, [item]);

    const handleShare = useCallback((e) => {
        e.stopPropagation();
        navigator.clipboard?.writeText(item.name).catch(() => {});
    }, [item.name]);

    const handleSave = useCallback((e) => {
        e.stopPropagation();
        setSaved((s) => !s);
    }, []);

    return (
        <article
            ref={cardRef}
            className={[
                'nearby-card-premium',
                isActive    ? 'is-active'    : '',
                important   ? 'is-important' : '',
            ].filter(Boolean).join(' ')}
            onMouseEnter={() => onHover(sid)}
            onMouseLeave={() => onHover(null)}
            onClick={() => onCardClick(sid)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && onCardClick(sid)}
            aria-label={`${item.name}${item.distance ? `, ${item.distance}` : ''}`}
            aria-pressed={isActive}
        >
            {/* Image */}
            <div className="nearby-img-wrapper">
                {!imgError && item.image ? (
                    <img
                        src={item.image}
                        alt={item.name}
                        className="nearby-img"
                        loading="lazy"
                        onError={() => setImgError(true)}
                    />
                ) : (
                    <div className="nearby-img-fallback" style={{ background: `${colour}18` }}>
                        <MapPin size={32} color={colour} />
                    </div>
                )}

                {/* Category badge */}
                {item.category && (
                    <span
                        className="nearby-category"
                        style={{ background: `linear-gradient(135deg, ${colour}ee, ${colour}bb)` }}
                    >
            {item.category}
          </span>
                )}

                {/* Important badge */}
                {important && (
                    <span className="nearby-important-badge">⭐ Important Nearby</span>
                )}

                {/* Marker number chip matching the map pin */}
                <span className="nearby-card-num">{markerNum}</span>
            </div>

            {/* Footer */}
            <div className="nearby-footer">
                <div className="nearby-left">
                    <MapPin size={17} className="nearby-pin" style={{ color: colour }} />
                    <div className="nearby-text">
                        <span className="nearby-name">{item.name}</span>

                        {/* Rating */}
                        {stars && (
                            <span className="nearby-stars" style={{ color: '#f59e0b' }} aria-label={`Rating: ${item.rating}`}>
                {stars}{' '}
                                <span style={{ color: '#6b7280', fontWeight: 500 }}>{item.rating}</span>
              </span>
                        )}

                        {item.distance && (
                            <span className="nearby-distance-chip">{item.distance}</span>
                        )}

                        {/* Travel time chips */}
                        {travel && (
                            <div className="nearby-travel-row">
                                <span className="nearby-travel-chip" title="Drive time">🚗 {formatTime(travel.driveMin)}</span>
                                <span className="nearby-travel-chip" title="Walk time">🚶 {formatTime(travel.walkMin)}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Action icons */}
                <div className="nearby-icons">
                    <Navigation
                        size={17}
                        className="nearby-icon"
                        onClick={handleNavigate}
                        title="Open in Google Maps"
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleNavigate(e); }}
                        aria-label="Open in Google Maps"
                    />
                    <Share2
                        size={17}
                        className="nearby-icon"
                        onClick={handleShare}
                        title="Copy name"
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleShare(e); }}
                        aria-label="Copy name to clipboard"
                    />
                    <Bookmark
                        size={17}
                        className="nearby-icon"
                        color={saved ? '#059669' : '#94a3b8'}
                        fill={saved ? '#059669' : 'none'}
                        onClick={handleSave}
                        title={saved ? 'Remove bookmark' : 'Save'}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleSave(e); }}
                        aria-label={saved ? 'Remove bookmark' : 'Save this place'}
                    />
                </div>
            </div>
        </article>
    );
});

export default NearbyCard;