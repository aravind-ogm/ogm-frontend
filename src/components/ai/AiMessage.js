import React, {useState, useMemo, useCallback, useEffect, useRef} from "react";
import Icon from "./Icon";
import AiPropertyCard from "./AiPropertyCard";
import {formatTime, parseMarkdown} from "./Helpers";
import {detectRouteIntent, detectNearbyIntent} from "./RouteHelper";
import NearbyLocations from "../propertydetails/NearbyLocations";
import useNearbyPlaces from "../propertydetails/UseNearbyPlaces";

/* ─── DOMPurify (optional XSS protection) ─────────────────────────────────── */
let DOMPurify = null;
try {
    DOMPurify = require("dompurify");
} catch { /* not installed */
}

const PURIFY_CONFIG = {
    ALLOWED_TAGS: ["b", "strong", "em", "i", "ul", "ol", "li", "p", "br", "span", "a", "h3", "h4", "code", "pre"],
    ALLOWED_ATTR: ["href", "target", "rel", "class"],
    ALLOW_DATA_ATTR: false,
};
if (DOMPurify) {
    DOMPurify.addHook("afterSanitizeAttributes", (node) => {
        if (node.tagName === "A") {
            node.setAttribute("target", "_blank");
            node.setAttribute("rel", "noopener noreferrer");
        }
    });
}

/* ═══════════════════════════════════════════════════════════════════════════
   AiMessage
═══════════════════════════════════════════════════════════════════════════ */
function AiMessage({
                       msg,
                       chatId,
                       index,
                       onEdit,
                       onRetry,
                       onCopy,
                       onFollowUp,
                       onMapView,
                       onRouteView,
                       isMapOpen,
                       userPosition,
                       prevMessages,
                       compareList = [],   // ← NEW
                       onCompare,          // ← NEW
                   }) {
    const [editing, setEditing] = useState(false);
    const [editText, setEditText] = useState("");
    const [reaction, setReaction] = useState(null);
    const [activeNearbyChip, setActiveNearbyChip] = useState(null);
    const [activeChipPropertyId, setActiveChipPropertyId] = useState(null);

    const isUser = msg.role === "user";
    const isAi = !isUser;

    const lastProp = useMemo(() => {
        if (!prevMessages?.length) return null;
        for (let i = prevMessages.length - 1; i >= 0; i--) {
            const m = prevMessages[i];
            if (m.role === "ai" && m.properties?.length > 0) return m.properties[0];
        }
        return null;
    }, [prevMessages]);

    const lastPropertyLat = useMemo(() => {
        if (!lastProp) return null;
        const v = parseFloat(lastProp.latitude ?? lastProp.lat);
        return isNaN(v) ? null : v;
    }, [lastProp]);

    const lastPropertyLng = useMemo(() => {
        if (!lastProp) return null;
        const v = parseFloat(lastProp.longitude ?? lastProp.lng ?? lastProp.lon);
        return isNaN(v) ? null : v;
    }, [lastProp]);

    const lastPropertyLocation = useMemo(() => lastProp?.location ?? null, [lastProp]);

    const safeHtml = useMemo(() => {
        if (!isAi || !msg.text) return "";
        const raw = parseMarkdown(msg.text);
        return DOMPurify ? DOMPurify.sanitize(raw, PURIFY_CONFIG) : raw;
    }, [isAi, msg.text]);

    const routeIntent = useMemo(() => detectRouteIntent(msg.text), [msg.text]);
    const nearbyIntent = useMemo(() => {
        if (!isUser) return null;
        return detectNearbyIntent(msg.text);
    }, [isUser, msg.text]);

    const followUps = useMemo(() => {
        if (!isAi || msg.isError) return [];

        // Use backend-generated suggestions if available
        if (msg.followUps?.length) return msg.followUps;

        // No results — suggest broadening search
        if (!msg.hasResults || !msg.properties?.length) return [];

        // Generate smart fallbacks from actual property data
        const props = msg.properties;
        const chips = [];
        const types = [...new Set(props.map(p => p.type).filter(Boolean))];
        const hasSold = props.some(p => p.soldOut);
        const hasRera = props.some(p => p.reraApproved);
        const locs = [...new Set(props.map(p => p.location?.split(",")[0]).filter(Boolean))];
        const minPrice = Math.min(...props.map(p => p.priceRaw ?? 0).filter(Boolean));

        if (hasSold) chips.push("Show only available properties");
        if (!hasRera) chips.push("Show only RERA approved");
        if (locs.length === 1) chips.push(`More properties in ${locs[0]}`);
        if (types.includes("Apartment") && !types.includes("Villa"))
            chips.push("Show villas in same budget");
        if (types.includes("Villa"))
            chips.push("Show apartments instead");
        if (minPrice > 0) chips.push("Show cheaper options under ₹" + formatBudgetChip(minPrice * 0.75));

        return chips.slice(0, 4);
    }, [isAi, msg.isError, msg.hasResults, msg.properties, msg.followUps]);

    // ── Helper — format price for chip label ─────────────────────────────────────
    function formatBudgetChip(price) {
        if (!price || isNaN(price)) return "";
        if (price >= 10_000_000) {
            const cr = price / 10_000_000;
            return cr === Math.floor(cr) ? `₹${cr} Cr` : `₹${cr.toFixed(1)} Cr`;
        }
        const l = Math.round(price / 100_000) * 100_000 / 100_000;
        return `₹${l} L`;
    }

    const resolvedRouteOrigin = useMemo(() => {
        if (!routeIntent) return null;
        if (!routeIntent.usePropAsOrigin) return routeIntent.origin;
        if (lastPropertyLat && lastPropertyLng) return {lat: lastPropertyLat, lng: lastPropertyLng};
        return lastPropertyLocation || routeIntent.origin;
    }, [routeIntent, lastPropertyLat, lastPropertyLng, lastPropertyLocation]);

    const resolvedRouteOriginLabel = useMemo(() => {
        if (!routeIntent?.usePropAsOrigin) return routeIntent?.origin ?? "";
        return lastProp?.title || lastPropertyLocation || "This Property";
    }, [routeIntent, lastProp, lastPropertyLocation]);

    const saveEdit = useCallback(() => {
        if (editText.trim() && onEdit) onEdit(chatId, msg.id, editText.trim());
        setEditing(false);
        setEditText("");
    }, [editText, onEdit, chatId, msg.id]);

    const handleReaction = useCallback((type) => {
        setReaction((prev) => prev === type ? null : type);
    }, []);

    return (
        <div className={`message-row ${isUser ? "user" : "ai"}`}>
            <div className={`msg-bubble ${msg.isError ? "error" : ""} ${isAi && msg.hasResults ? "wide" : ""}`}>

                {editing ? (
                    <>
                <textarea
                    className="msg-edit-area"
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    autoFocus
                    aria-label="Edit your message"
                    onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            saveEdit();
                        }
                        if (e.key === "Escape") {
                            setEditing(false);
                            setEditText("");
                        }
                    }}
                />
                        <div className="msg-edit-btns">
                            <button className="edit-save" onClick={saveEdit}>Save</button>
                            <button onClick={() => {
                                setEditing(false);
                                setEditText("");
                            }}>Cancel
                            </button>
                        </div>
                    </>
                ) : (
                    <>
                        {isAi && msg.hasResults && msg.properties?.length > 0
                            ? <div className="msg-text-content msg-text-intro"
                                   dangerouslySetInnerHTML={{__html: safeHtml}}/>
                            : isAi
                                ? <div className="msg-text-content" dangerouslySetInnerHTML={{__html: safeHtml}}/>
                                : <div>{msg.text}</div>
                        }

                        {isUser && routeIntent && resolvedRouteOrigin && (
                            <InlineRouteMap
                                origin={resolvedRouteOrigin}
                                destination={routeIntent.destination}
                            />
                        )}

                        {isUser && nearbyIntent && !routeIntent && (
                            <AiNearbyWrapper
                                placeType={nearbyIntent.type}
                                placeLabel={nearbyIntent.label}
                                propLat={lastPropertyLat}
                                propLng={lastPropertyLng}
                                locationName={nearbyIntent.location || lastPropertyLocation}
                                propertyName={lastProp?.title}
                                userPosition={userPosition}
                            />
                        )}

                        {isUser && routeIntent && resolvedRouteOrigin && (
                            <button className="msg-route-btn"
                                    onClick={() => onRouteView?.(resolvedRouteOrigin, routeIntent.destination)}
                                    aria-label={`Show route to ${routeIntent.destination}`}>
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                                     stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
                                    <circle cx="5" cy="6" r="2"/>
                                    <circle cx="19" cy="18" r="2"/>
                                    <path d="M5 8v3a2 2 0 0 0 2 2h10a2 2 0 0 1 2 2v1"/>
                                </svg>
                                Show Route on Map
                            </button>
                        )}

                        {/* ── PROPERTY CARDS ── */}
                        {isAi && msg.hasResults && msg.properties?.length > 0 && (
                            <div className="ai-property-results-list" role="list">
                                {msg.properties.map((property) => (
                                    <PropertyCardWithChips
                                        key={property.id}
                                        property={property}
                                        onMapView={onMapView}
                                        onFollowUp={onFollowUp}
                                        isMapOpen={isMapOpen}
                                        userPosition={userPosition}
                                        allProperties={msg.properties}
                                        activeNearbyChip={activeNearbyChip}
                                        setActiveNearbyChip={setActiveNearbyChip}
                                        activeChipPropertyId={activeChipPropertyId}
                                        setActiveChipPropertyId={setActiveChipPropertyId}
                                        isInCompare={compareList.some(p => p.id === property.id)}  // ← NEW
                                        onCompare={onCompare}                                       // ← NEW
                                    />
                                ))}
                            </div>
                        )}

                        {followUps.length > 0 && (
                            <div className="msg-followups" role="group" aria-label="Suggested follow-up questions">
                                <div className="msg-followups-label">Explore further</div>
                                {followUps.map((s, i) => (
                                    <button key={i} className="msg-followup-btn"
                                            onClick={() => onFollowUp?.(s)} title={s}>
            <span className="msg-followup-icon" aria-hidden="true">
              {getFollowUpIcon(s)}
            </span>
                                        {s}
                                    </button>
                                ))}
                            </div>
                        )}
                        <div className="msg-meta">
                            {msg.timestamp && (
                                <time className="msg-time" dateTime={new Date(msg.timestamp).toISOString()}>
                                    {formatTime(msg.timestamp)}
                                </time>
                            )}
                            {msg.edited && <span className="msg-edited">edited</span>}
                            {isUser && (
                                <button className="msg-action"
                                        onClick={() => {
                                            setEditing(true);
                                            setEditText(msg.text);
                                        }}
                                        aria-label="Edit message">
                                    <Icon name="edit" size={12} aria-hidden="true"/> Edit
                                </button>
                            )}
                            {isAi && (
                                <>
                                    <button className="msg-action" onClick={() => onCopy?.(msg.text)} aria-label="Copy">
                                        <Icon name="copy" size={12} aria-hidden="true"/> Copy
                                    </button>
                                    <button className="msg-action" onClick={() => onRetry?.(chatId, index)}
                                            aria-label="Retry">
                                        <Icon name="retry" size={12} aria-hidden="true"/> Retry
                                    </button>
                                </>
                            )}
                            {isAi && !msg.isError && (
                                <div className="msg-reactions" role="group" aria-label="Rate this response"
                                     style={{marginLeft: "auto", display: "flex", gap: 3}}>
                                    <button className={`msg-reaction-btn ${reaction === "up" ? "active" : ""}`}
                                            onClick={() => handleReaction("up")} aria-pressed={reaction === "up"}
                                            aria-label="Helpful">👍
                                    </button>
                                    <button className={`msg-reaction-btn ${reaction === "down" ? "active" : ""}`}
                                            onClick={() => handleReaction("down")} aria-pressed={reaction === "down"}
                                            aria-label="Not helpful">👎
                                    </button>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

function getFollowUpIcon(text) {
    const t = text.toLowerCase();
    if (t.includes("rera"))                    return "✅";
    if (t.includes("vastu"))                   return "🕉";
    if (t.includes("villa"))                   return "🏡";
    if (t.includes("apartment") || t.includes("flat")) return "🏢";
    if (t.includes("available") || t.includes("sold")) return "🟢";
    if (t.includes("ready to move"))           return "🔑";
    if (t.includes("under construction"))      return "🏗";
    if (t.includes("bhk"))                     return "🛏";
    if (t.includes("budget") || t.includes("₹") || t.includes("cheap") || t.includes("under"))
        return "💰";
    if (t.includes("rental") || t.includes("invest") || t.includes("yield"))
        return "📈";
    if (t.includes("more") || t.includes("properties in")) return "📍";
    if (t.includes("compare"))                 return "⚖️";
    return "🔍";
}

/* ═══════════════════════════════════════════════════════════════════════════
   InlineRouteMap
═══════════════════════════════════════════════════════════════════════════ */
function InlineRouteMap({origin, destination}) {
    const mapRef = useRef(null);
    const mapInst = useRef(null);
    const dirRef = useRef(null);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    const [mode, setMode] = useState("DRIVING");

    const MODES = [
        {key: "DRIVING", label: "Drive", icon: "🚗"},
        {key: "TRANSIT", label: "Transit", icon: "🚌"},
        {key: "WALKING", label: "Walk", icon: "🚶"},
        {key: "BICYCLING", label: "Cycle", icon: "🚲"},
    ];

    const toLatLng = (val) => {
        if (!val) return null;
        const G = window.google.maps;
        if (typeof val === "object" && val.lat != null)
            return new G.LatLng(parseFloat(val.lat), parseFloat(val.lng));
        return String(val);
    };

    const renderRoute = useCallback((map, travelMode) => {
        if (!map || !origin || !destination) return;
        const G = window.google.maps;
        if (dirRef.current) {
            dirRef.current.setMap(null);
            dirRef.current = null;
        }
        const renderer = new G.DirectionsRenderer({
            polylineOptions: {strokeColor: "#2563eb", strokeWeight: 4, strokeOpacity: 0.9},
        });
        renderer.setMap(map);
        dirRef.current = renderer;
        const o = toLatLng(origin), d = toLatLng(destination);
        if (!o || !d) {
            setError("Could not resolve location.");
            return;
        }
        new G.DirectionsService().route(
            {origin: o, destination: d, travelMode: G.TravelMode[travelMode]},
            (res, status) => {
                if (status === "OK") {
                    renderer.setDirections(res);
                    const leg = res.routes[0].legs[0];
                    setResult({distance: leg.distance.text, duration: leg.duration.text});
                    setError(null);
                } else {
                    setError('Could not calculate route. Try adding city name (e.g. "Marathahalli, Bengaluru").');
                    setResult(null);
                }
            }
        );
    }, [origin, destination]);

    useEffect(() => {
        if (!origin || !destination) return;
        const waitSDK = () => new Promise((res) => {
            if (typeof window.google?.maps?.Map === "function") {
                res();
                return;
            }
            const t = setInterval(() => {
                if (typeof window.google?.maps?.Map === "function") {
                    clearInterval(t);
                    res();
                }
            }, 100);
        });
        waitSDK().then(() => {
            if (!mapRef.current) return;
            const G = window.google.maps;
            const map = new G.Map(mapRef.current, {
                zoom: 12, center: {lat: 12.9716, lng: 77.5946},
                mapTypeControl: false, streetViewControl: false,
                fullscreenControl: false, zoomControl: true,
            });
            mapInst.current = map;
            renderRoute(map, mode);
        });
    }, [origin, destination]);

    useEffect(() => {
        if (mapInst.current) renderRoute(mapInst.current, mode);
    }, [mode, renderRoute]);

    return (
        <div className="inline-route-map">
            <div ref={mapRef} className="inline-route-canvas"/>
            <div className="inline-route-modes">
                {MODES.map(({key, label, icon}) => (
                    <button key={key} className={`inline-route-mode${mode === key ? " active" : ""}`}
                            onClick={() => setMode(key)}>{icon} {label}</button>
                ))}
            </div>
            {result && (
                <div className="inline-route-result">
              <span className="inline-route-stat">
                <strong>{result.distance}</strong><span>Distance</span>
              </span>
                    <div className="inline-route-divider"/>
                    <span className="inline-route-stat">
                <strong>{result.duration}</strong>
                <span>{mode === "DRIVING" ? "Drive time" : mode === "TRANSIT" ? "Transit" : mode === "WALKING" ? "Walk time" : "Cycle time"}</span>
              </span>
                </div>
            )}
            {error && <div className="inline-route-error">⚠️ {error}</div>}
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════════════════
   AiNearbyWrapper
═══════════════════════════════════════════════════════════════════════════ */
function AiNearbyWrapper({placeType, placeLabel, propLat, propLng, locationName, propertyName, userPosition}) {
    const [resolvedLat, setResolvedLat] = useState(null);
    const [resolvedLng, setResolvedLng] = useState(null);
    const [status, setStatus] = useState("resolving");
    const [statusMsg, setStatusMsg] = useState("");

    const geocodeAddress = useCallback((address) =>
        new Promise((resolve, reject) => {
            const waitSDK = () => new Promise((res) => {
                if (typeof window.google?.maps?.Geocoder === "function") {
                    res();
                    return;
                }
                const t = setInterval(() => {
                    if (typeof window.google?.maps?.Geocoder === "function") {
                        clearInterval(t);
                        res();
                    }
                }, 150);
            });
            waitSDK().then(() => {
                new window.google.maps.Geocoder().geocode(
                    {address: address + ", India"},
                    (results, gStatus) => {
                        if (gStatus === "OK" && results[0]) {
                            resolve({lat: results[0].geometry.location.lat(), lng: results[0].geometry.location.lng()});
                        } else {
                            reject(new Error("Geocode failed: " + address));
                        }
                    }
                );
            });
        }), []);

    useEffect(() => {
        setStatus("resolving");
        setStatusMsg("");
        setResolvedLat(null);
        setResolvedLng(null);
        const lat = parseFloat(propLat), lng = parseFloat(propLng);
        if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
            setResolvedLat(lat);
            setResolvedLng(lng);
            setStatus("ready");
            return;
        }
        if (userPosition?.latitude && userPosition?.longitude) {
            setResolvedLat(parseFloat(userPosition.latitude));
            setResolvedLng(parseFloat(userPosition.longitude));
            setStatus("ready");
            return;
        }
        const address = locationName || propertyName;
        if (address) {
            setStatusMsg("Finding location…");
            geocodeAddress(address)
                .then(({lat: gLat, lng: gLng}) => {
                    setResolvedLat(gLat);
                    setResolvedLng(gLng);
                    setStatus("ready");
                })
                .catch(() => {
                    setStatus("error");
                    setStatusMsg(`Could not find "${address}".`);
                });
            return;
        }
        setStatus("error");
        setStatusMsg("Location not available. Please enable GPS or specify an area.");
    }, [propLat, propLng, userPosition, locationName, propertyName, geocodeAddress]);

    const {places, loading, error} = useNearbyPlaces(
        status === "ready" ? resolvedLat : null,
        status === "ready" ? resolvedLng : null,
    );

    const displayPlaces = useMemo(() => {
        if (!places.length || !placeType) return places;
        const keyword = (placeLabel || placeType).toLowerCase();
        const filtered = places.filter(p => (p.category || "").toLowerCase().includes(keyword));
        return filtered.length > 0 ? filtered : places;
    }, [places, placeType, placeLabel]);

    if (status === "resolving" || (status === "ready" && loading && places.length === 0)) {
        return (
            <div style={{
                marginTop: 12, padding: "14px 16px", borderRadius: 12,
                background: "#f8fafc", border: "1px solid #e2e8f0",
                display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "#475569"
            }}>
                <div style={{
                    width: 18, height: 18, borderRadius: "50%",
                    border: "2.5px solid #e2e8f0", borderTopColor: "#f97316",
                    animation: "ai-spin 0.7s linear infinite", flexShrink: 0
                }}/>
                <span>{statusMsg || `Searching for ${placeLabel || "places"} nearby…`}</span>
            </div>
        );
    }
    if (status === "error") {
        return (
            <div style={{
                marginTop: 12, padding: "12px 14px", borderRadius: 12,
                background: "#fff7ed", border: "1px solid #fed7aa", fontSize: 13, color: "#c2410c"
            }}>
                📍 {statusMsg}
            </div>
        );
    }
    return (
        <div style={{marginTop: 12, borderRadius: 14, overflow: "hidden", border: "1px solid #e2e8f0"}}>
            <NearbyLocations
                locations={displayPlaces}
                propertyLocation={locationName || propertyName || "Nearby"}
                propertyName={propertyName || locationName || "This Property"}
                loading={loading && places.length === 0}
                propertyLat={resolvedLat}
                propertyLng={resolvedLng}
            />
            {error && (
                <div style={{padding: "8px 14px", fontSize: 12, color: "#94a3b8", background: "#f8fafc"}}>
                    {error}
                </div>
            )}
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════════════════
   PropertyCardWithChips
   Wraps AiPropertyCard — passes isInCompare + onCompare down to card.
═══════════════════════════════════════════════════════════════════════════ */
function PropertyCardWithChips({
                                   property,
                                   onMapView,
                                   onFollowUp,
                                   isMapOpen,
                                   userPosition,
                                   allProperties,
                                   activeNearbyChip,
                                   setActiveNearbyChip,
                                   activeChipPropertyId,
                                   setActiveChipPropertyId,
                                   isInCompare = false,   // ← NEW
                                   onCompare,             // ← NEW
                               }) {
    return (
        <div className="pcard-with-chips" role="listitem">
            <AiPropertyCard
                property={property}
                onMapView={() => onMapView?.([property])}
                isMapOpen={isMapOpen}
                userPosition={userPosition}
                isInCompare={isInCompare}   // ← NEW: passed to card for green ring + button state
                onCompare={onCompare}       // ← NEW: toggleCompare callback
            />
        </div>
    );
}

export default React.memo(AiMessage);