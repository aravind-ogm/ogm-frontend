import React, { useState, useEffect, useCallback, memo } from 'react';
import {
    X, Navigation, Share2, Bookmark, Phone, Globe, ExternalLink,
    Car, PersonStanding, MapPin, Clock,
} from 'lucide-react';
import {
    categoryColour,
    isImportant,
    estimateTravelTime,
    formatTime,
    openInGoogleMaps,
    renderStars,
    directionsUrl,
    parseDistanceKm,
} from './utils';

/* ────────────────────────────────────────────────────────────────────────────
   NearbyRightPanel
   Desktop: slides in from the right, map shrinks.
   Mobile:  opens as a bottom sheet.
   Shows either "This Property" details or a nearby place's details.
─────────────────────────────────────────────────────────────────────────────*/
const NearbyRightPanel = memo(function NearbyRightPanel({
                                                            isOpen,
                                                            onClose,
                                                            selectedPlace,
                                                            isPropertyPanel,
                                                            propertyName,
                                                            propertyLocation,
                                                            propertyImage,
                                                            propertyCoords,
                                                            isMobile,
                                                            travelMode,
                                                            onTravelModeChange,
                                                            allLocations,
                                                            propertySlug,
                                                        }) {
    const [saved,    setSaved]    = useState(false);
    const [imgError, setImgError] = useState(false);

    // Reset state when selected place changes
    useEffect(() => {
        setSaved(false);
        setImgError(false);
    }, [selectedPlace?.name]);

    const [shareToast, setShareToast] = useState('');
    const shareToastTimerRef = React.useRef(null);

    const handleShare = useCallback(() => {
        const name = selectedPlace?.name || propertyName || '';
        const lat  = selectedPlace ? parseFloat(selectedPlace.latitude ?? selectedPlace.lat) : null;
        const lng  = selectedPlace ? parseFloat(selectedPlace.longitude ?? selectedPlace.lng) : null;
        const mapsUrl = lat && lng
            ? `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
            : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name)}`;
        const shareText = `${name}\n${mapsUrl}`;

        // Mobile: use native share sheet
        if (navigator.share && /Mobi|Android/i.test(navigator.userAgent)) {
            navigator.share({ title: name, text: name, url: mapsUrl }).catch(() => {});
            return;
        }

        // Desktop: copy to clipboard + show toast
        navigator.clipboard?.writeText(shareText)
            .then(() => {
                setShareToast('📋 Copied to clipboard!');
                clearTimeout(shareToastTimerRef.current);
                shareToastTimerRef.current = setTimeout(() => setShareToast(''), 2500);
            })
            .catch(() => {
                setShareToast('❌ Could not copy');
                clearTimeout(shareToastTimerRef.current);
                shareToastTimerRef.current = setTimeout(() => setShareToast(''), 2000);
            });
    }, [selectedPlace, propertyName]);

    // Cleanup toast timer on unmount
    useEffect(() => () => clearTimeout(shareToastTimerRef.current), []);

    const handleOpenGoogleMaps = useCallback(() => {
        if (selectedPlace) {
            const lat = parseFloat(selectedPlace.latitude ?? selectedPlace.lat);
            const lng = parseFloat(selectedPlace.longitude ?? selectedPlace.lng);
            openInGoogleMaps(isNaN(lat) ? null : lat, isNaN(lng) ? null : lng, selectedPlace.name);
        } else {
            window.open(
                `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(propertyLocation + ', India')}`,
                '_blank', 'noopener,noreferrer',
            );
        }
    }, [selectedPlace, propertyLocation]);

    const handleDirections = useCallback(() => {
        if (selectedPlace) {
            const lat = parseFloat(selectedPlace.latitude ?? selectedPlace.lat);
            const lng = parseFloat(selectedPlace.longitude ?? selectedPlace.lng);
            if (!isNaN(lat)) {
                window.open(
                    directionsUrl(propertyCoords, lat, lng, travelMode === 'WALKING' ? 'walking' : 'driving'),
                    '_blank', 'noopener,noreferrer',
                );
            }
        } else {
            window.open(
                `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(propertyLocation + ', India')}`,
                '_blank', 'noopener,noreferrer',
            );
        }
    }, [selectedPlace, propertyCoords, propertyLocation, travelMode]);

    const panelClass = [
        'nearby-right-panel',
        isOpen   ? 'is-open'   : '',
        isMobile ? 'is-mobile' : '',
    ].filter(Boolean).join(' ');

    return (
        <>
            {/* Mobile backdrop */}
            {isMobile && isOpen && (
                <div className="nearby-panel-backdrop" onClick={onClose} aria-hidden="true" />
            )}

            <aside className={panelClass} role="complementary" aria-label="Place details">
                {/* Header */}
                <div className="panel-header">
                    {isMobile && <div className="panel-drag-handle" aria-hidden="true" />}
                    <button
                        className="panel-close-btn"
                        onClick={onClose}
                        aria-label="Close panel"
                        type="button"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Share toast */}
                {shareToast && (
                    <div className="panel-share-toast" role="status" aria-live="polite">
                        {shareToast}
                    </div>
                )}

                {/* Scrollable body */}
                <div className="panel-body">
                    {isPropertyPanel ? (
                        <PropertyPanelContent
                            propertyName={propertyName}
                            propertyLocation={propertyLocation}
                            propertyImage={propertyImage}
                            allLocations={allLocations}
                            onDirections={handleDirections}
                            onShare={handleShare}
                            onOpenGoogleMaps={handleOpenGoogleMaps}
                            saved={saved}
                            onSave={() => setSaved((s) => !s)}
                            imgError={imgError}
                            onImgError={() => setImgError(true)}
                            propertySlug={propertySlug}
                        />
                    ) : selectedPlace ? (
                        <PlacePanelContent
                            place={selectedPlace}
                            travelMode={travelMode}
                            onTravelModeChange={onTravelModeChange}
                            onDirections={handleDirections}
                            onShare={handleShare}
                            onOpenGoogleMaps={handleOpenGoogleMaps}
                            saved={saved}
                            onSave={() => setSaved((s) => !s)}
                            imgError={imgError}
                            onImgError={() => setImgError(true)}
                        />
                    ) : null}
                </div>
            </aside>
        </>
    );
});

/* ─── Property panel ───────────────────────────────────────────────────────── */
function PropertyPanelContent({
                                  propertyName, propertyLocation, propertyImage,
                                  allLocations, onDirections, onShare, onOpenGoogleMaps,
                                  saved, onSave, imgError, onImgError, propertySlug,
                              }) {
    const nearbyHighlights = ['hospital', 'school', 'metro', 'restaurant', 'supermarket'];
    const keySummary = nearbyHighlights.map((key) => {
        const match = allLocations
            .filter((l) => (l.category || '').toLowerCase().includes(key))
            .sort((a, b) => parseDistanceKm(a.distance) - parseDistanceKm(b.distance))[0];
        return match ? { key, name: match.name, distance: match.distance } : null;
    }).filter(Boolean);

    const ICONS = { hospital: '🏥', school: '🏫', metro: '🚇', restaurant: '🍽️', supermarket: '🛒' };

    return (
        <div className="panel-place-content">
            {/* Image */}
            <div className="panel-img-wrapper">
                {propertyImage && !imgError ? (
                    <img src={propertyImage} alt={propertyName} className="panel-img" onError={onImgError} />
                ) : (
                    <div className="panel-img-fallback" style={{ background: '#fee2e2' }}>
                        <MapPin size={44} color="#ef4444" />
                    </div>
                )}
                <span className="panel-category-badge" style={{ background: 'linear-gradient(135deg,#ef4444ee,#dc2626bb)' }}>
                    This Property
                </span>
            </div>

            {/* Name */}
            <div className="panel-name-block">
                <h3 className="panel-place-name">{propertyName}</h3>
                {propertyLocation && (
                    <div className="panel-detail-row" style={{ marginTop: 6 }}>
                        <MapPin size={13} className="panel-detail-icon" />
                        <span style={{ fontSize: 13, color: '#6b7280' }}>{propertyLocation}</span>
                    </div>
                )}
            </div>

            {/* Key nearby summary */}
            {keySummary.length > 0 && (
                <div className="panel-nearby-summary">
                    <p className="panel-section-label">Key Distances</p>
                    {keySummary.map(({ key, name, distance }) => (
                        <div key={key} className="panel-nearby-row">
                            <span className="panel-nearby-icon">{ICONS[key]}</span>
                            <span className="panel-nearby-name">{name}</span>
                            {distance && <span className="panel-nearby-dist">{distance}</span>}
                        </div>
                    ))}
                </div>
            )}

            {/* Actions */}
            <div className="panel-actions">
                <button className="panel-btn-primary" onClick={onDirections} type="button">
                    <Navigation size={15} /> Directions
                </button>
                <button
                    className={`panel-btn-secondary${saved ? ' saved' : ''}`}
                    onClick={onSave}
                    type="button"
                >
                    <Bookmark size={15} fill={saved ? '#059669' : 'none'} />
                    {saved ? 'Saved' : 'Save'}
                </button>
                <button className="panel-btn-secondary" onClick={onShare} type="button">
                    <Share2 size={15} /> Share
                </button>
            </div>

            <button className="panel-gmaps-link" onClick={onOpenGoogleMaps} type="button">
                <GoogleMapsIcon />
                View on Google Maps
                <ExternalLink size={12} />
            </button>

            <a href={propertySlug ? `/property/${propertySlug}` : "#"} className="panel-view-property-link" rel="noopener noreferrer">
                View Full Property Details <ExternalLink size={12} />
            </a>
        </div>
    );
}

/* ─── Place panel ──────────────────────────────────────────────────────────── */
function PlacePanelContent({
                               place, travelMode, onTravelModeChange,
                               onDirections, onShare, onOpenGoogleMaps,
                               saved, onSave, imgError, onImgError,
                           }) {
    const colour    = categoryColour(place.category);
    const important = isImportant(place.category);
    const travel    = estimateTravelTime(place.distance);
    const stars     = renderStars(place.rating);

    const lat = parseFloat(place.latitude ?? place.lat);
    const lng = parseFloat(place.longitude ?? place.lng);

    return (
        <div className="panel-place-content">
            {/* Image */}
            <div className="panel-img-wrapper">
                {place.image && !imgError ? (
                    <img src={place.image} alt={place.name} className="panel-img" onError={onImgError} />
                ) : (
                    <div className="panel-img-fallback" style={{ background: `${colour}18` }}>
                        <MapPin size={44} color={colour} />
                    </div>
                )}
                {place.category && (
                    <span
                        className="panel-category-badge"
                        style={{ background: `linear-gradient(135deg, ${colour}ee, ${colour}bb)` }}
                    >
                        {place.category}
                    </span>
                )}
                {important && <span className="panel-important-badge">⭐ Important Nearby</span>}
            </div>

            {/* Name + rating */}
            <div className="panel-name-block">
                <h3 className="panel-place-name">{place.name}</h3>
                {stars && (
                    <div className="panel-rating-row">
                        <span className="panel-stars" style={{ color: '#f59e0b' }}>{stars}</span>
                        <span className="panel-rating-num">{place.rating}</span>
                        {place.reviewCount && (
                            <span className="panel-review-count">({place.reviewCount} reviews)</span>
                        )}
                    </div>
                )}
            </div>

            {/* Info chips */}
            <div className="panel-info-chips">
                {place.distance && (
                    <span className="panel-chip green">📏 {place.distance}</span>
                )}
                {place.isOpen !== undefined && (
                    <span className={`panel-chip ${place.isOpen ? 'green' : 'red'}`}>
                        {place.isOpen ? '🟢 Open Now' : '🔴 Closed'}
                    </span>
                )}
            </div>

            {/* Travel time + mode toggle */}
            {travel && (
                <div className="panel-travel-block">
                    <p className="panel-section-label">Travel time from property</p>
                    <div className="panel-travel-modes">
                        <button
                            className={`panel-travel-btn${travelMode === 'DRIVING' ? ' active' : ''}`}
                            onClick={() => onTravelModeChange('DRIVING')}
                            type="button"
                        >
                            <Car size={15} />
                            <span>{formatTime(travel.driveMin)}</span>
                            <span className="panel-travel-label">Drive</span>
                        </button>
                        <button
                            className={`panel-travel-btn${travelMode === 'WALKING' ? ' active' : ''}`}
                            onClick={() => onTravelModeChange('WALKING')}
                            type="button"
                        >
                            <PersonStanding size={15} />
                            <span>{formatTime(travel.walkMin)}</span>
                            <span className="panel-travel-label">Walk</span>
                        </button>
                    </div>
                </div>
            )}

            {/* Address / contact */}
            <div className="panel-details-block">
                {place.address && (
                    <div className="panel-detail-row">
                        <MapPin size={14} className="panel-detail-icon" />
                        <span>{place.address}</span>
                    </div>
                )}
                {place.hours && (
                    <div className="panel-detail-row">
                        <Clock size={14} className="panel-detail-icon" />
                        <span>{place.hours}</span>
                    </div>
                )}
                {place.phone && (
                    <a href={`tel:${place.phone}`} className="panel-detail-row panel-detail-link">
                        <Phone size={14} className="panel-detail-icon" />
                        <span>{place.phone}</span>
                    </a>
                )}
                {place.website && (
                    <a
                        href={place.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="panel-detail-row panel-detail-link"
                    >
                        <Globe size={14} className="panel-detail-icon" />
                        <span className="panel-detail-website">{place.website.replace(/^https?:\/\//, '')}</span>
                        <ExternalLink size={11} style={{ marginLeft: 'auto', color: '#9ca3af' }} />
                    </a>
                )}
            </div>

            {/* Action buttons */}
            <div className="panel-actions">
                <button className="panel-btn-primary" onClick={onDirections} type="button">
                    <Navigation size={15} /> Directions
                </button>
                <button
                    className={`panel-btn-secondary${saved ? ' saved' : ''}`}
                    onClick={onSave}
                    type="button"
                >
                    <Bookmark size={15} fill={saved ? '#059669' : 'none'} />
                    {saved ? 'Saved' : 'Save'}
                </button>
                <button className="panel-btn-secondary" onClick={onShare} type="button">
                    <Share2 size={15} /> Share
                </button>
            </div>

            {/* View on Google Maps */}
            {!isNaN(lat) && (
                <button className="panel-gmaps-link" onClick={onOpenGoogleMaps} type="button">
                    <GoogleMapsIcon />
                    View on Google Maps
                    <ExternalLink size={12} />
                </button>
            )}
        </div>
    );
}

/* ─── Google Maps icon ────────────────────────────────────────────────────── */
function GoogleMapsIcon() {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="#EA4335"/>
            <circle cx="12" cy="9" r="2.5" fill="white"/>
        </svg>
    );
}

export default NearbyRightPanel;