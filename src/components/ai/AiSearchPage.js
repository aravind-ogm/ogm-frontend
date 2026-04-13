import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useLocation } from "react-router-dom";

import AiSidebar     from "./AiSidebar";
import AiChatBox     from "./AiChatBox";
import ConfirmDialog from "./Confirmdialog";
import CompareBar    from "./CompareBar";
import CompareModal  from "./CompareModal";
import Icon          from "./Icon";

import useTheme             from "./Usetheme";
import useKeyboardShortcuts from "./Usekeyboardshortcuts";
import useGeolocation, { detectNearMeIntent } from "./Usegeolocation";

import LocationPermissionModal from "./LocationPermissionModal";

import { uid, truncateWords }            from "./Helpers";
import { detectRouteIntent }             from "./RouteHelper";
import { ENDPOINTS, KEYBOARD_SHORTCUTS } from "./Constants";

import "../../styles/ai/ai-variables.css";
import "../../styles/ai/ai-layout.css";

export default function AiSearchPage() {
    const location        = useLocation();
    const initialQuestion = location.state?.question;

    const [chats,        setChats]        = useState([]);
    const [activeChatId, setActiveChatId] = useState(null);
    const [loading,      setLoading]      = useState(false);
    const [sidebarOpen,  setSidebarOpen]  = useState(() => window.innerWidth > 640);

    // ── Compare state ──────────────────────────────────────────────────────
    const [compareList,  setCompareList]  = useState([]);  // max 4 properties
    const [compareOpen,  setCompareOpen]  = useState(false);

    const currentUser = useMemo(() => {
        try {
            const raw =
                localStorage.getItem("user") ||
                localStorage.getItem("ogm_user") ||
                sessionStorage.getItem("user") ||
                sessionStorage.getItem("ogm_user");
            if (raw) {
                const parsed = JSON.parse(raw);
                return {
                    name:     parsed.name  || parsed.fullName  || parsed.displayName || parsed.email?.split("@")[0] || "User",
                    email:    parsed.email || "",
                    role:     parsed.role  || parsed.plan       || parsed.subscription || "Member",
                    avatar:   parsed.avatar || parsed.photoUrl  || parsed.picture || null,
                    initials: (parsed.name || parsed.email || "U").charAt(0).toUpperCase(),
                };
            }
            const token = localStorage.getItem("token") || localStorage.getItem("jwt") || localStorage.getItem("authToken");
            if (token) {
                const payload = JSON.parse(atob(token.split(".")[1]));
                return {
                    name:     payload.name || payload.sub?.split("@")[0] || "User",
                    email:    payload.email || payload.sub || "",
                    role:     payload.role  || payload.plan || "Member",
                    avatar:   payload.picture || null,
                    initials: (payload.name || payload.sub || "U").charAt(0).toUpperCase(),
                };
            }
        } catch { /* silent */ }
        return { name: "Guest", email: "", role: "Free Plan", avatar: null, initials: "G" };
    }, []);

    const [deleteTarget,      setDeleteTarget]      = useState(null);
    const [toast,             setToast]             = useState({ visible: false, text: "" });
    const [locationModalOpen, setLocationModalOpen] = useState(false);
    const [pendingQuery,      setPendingQuery]       = useState("");

    const {
        position, locationName, isGranted, isDenied,
    } = useGeolocation();

    const hasSentInitial         = useRef(false);
    const chatsRef               = useRef([]);
    const { theme, toggleTheme } = useTheme();

    useEffect(() => { chatsRef.current = chats; }, [chats]);

    const activeChat = useMemo(
        () => chats.find((c) => c.id === activeChatId) || null,
        [chats, activeChatId]
    );

    const makeChat = useCallback((title = "New Chat") => ({
        id: uid(), title, messages: [], createdAt: Date.now(),
    }), []);

    const showToast = useCallback((text) => {
        setToast({ visible: true, text });
        setTimeout(() => setToast({ visible: false, text: "" }), 2500);
    }, []);

    // ── Compare handlers ───────────────────────────────────────────────────

    /**
     * Toggle a property in/out of the compare list.
     * Max 4 properties — shows toast if user tries to add a 5th.
     */
    const toggleCompare = useCallback((property) => {
        setCompareList((prev) => {
            const exists = prev.find((p) => p.id === property.id);
            if (exists) {
                showToast(`"${property.title}" removed from compare`);
                return prev.filter((p) => p.id !== property.id);
            }
            if (prev.length >= 4) {
                showToast("You can compare up to 4 properties at a time");
                return prev;
            }
            showToast(`"${property.title}" added to compare`);
            return [...prev, property];
        });
    }, [showToast]);

    const clearCompare = useCallback(() => {
        setCompareList([]);
        setCompareOpen(false);
    }, []);

    // ── Chat CRUD ──────────────────────────────────────────────────────────

    const createNewChat = useCallback(() => {
        const chat = makeChat();
        setChats((prev) => [chat, ...prev]);
        setActiveChatId(chat.id);
    }, [makeChat]);

    const requestDeleteChat = useCallback((chatId) => setDeleteTarget(chatId), []);

    const confirmDeleteChat = useCallback(() => {
        if (!deleteTarget) return;
        setChats((prev) => {
            const next = prev.filter((c) => c.id !== deleteTarget);
            if (activeChatId === deleteTarget) {
                if (next.length > 0) {
                    setActiveChatId(next[0].id);
                } else {
                    const fresh = makeChat();
                    next.push(fresh);
                    setActiveChatId(fresh.id);
                }
            }
            return next;
        });
        setDeleteTarget(null);
    }, [deleteTarget, activeChatId, makeChat]);

    const appendMessage = useCallback((chatId, msg) => {
        setChats((prev) =>
            prev.map((chat) =>
                chat.id === chatId
                    ? { ...chat, messages: [...chat.messages, { ...msg, timestamp: Date.now() }] }
                    : chat
            )
        );
    }, []);

    const editMessage = useCallback((chatId, msgId, newText) => {
        setChats((prev) =>
            prev.map((chat) =>
                chat.id === chatId
                    ? { ...chat, messages: chat.messages.map((m) =>
                            m.id === msgId ? { ...m, text: newText, edited: true } : m) }
                    : chat
            )
        );
    }, []);

    const copyMessageText = useCallback((text) => {
        navigator.clipboard?.writeText(text);
        showToast("Copied to clipboard");
    }, [showToast]);

    // ── Send message ───────────────────────────────────────────────────────

    const sendMessage = useCallback(
        async (input) => {
            const isObject    = input !== null && typeof input === "object";
            const text        = isObject ? input.question?.trim() : input?.trim();
            let   userLat     = isObject ? input.userLatitude    : null;
            let   userLng     = isObject ? input.userLongitude   : null;
            let   userLocName = isObject ? input.userLocationName : null;

            if (!text || !activeChatId || loading) return;

            const needsLocation = detectNearMeIntent(text);

            if (needsLocation && !userLat) {
                if (!isDenied && isGranted && position) {
                    userLat = position.latitude;
                    userLng = position.longitude;
                } else if (!isDenied) {
                    setPendingQuery(text);
                    setLocationModalOpen(true);
                    return;
                }
            }

            if (!userLat && position) {
                userLat     = position.latitude;
                userLng     = position.longitude;
                userLocName = userLocName ?? position.locationName ?? locationName ?? null;
            }

            const chatId = activeChatId;
            appendMessage(chatId, { id: uid(), role: "user", text });

            setChats((prev) =>
                prev.map((chat) =>
                    chat.id === chatId && chat.title === "New Chat"
                        ? { ...chat, title: truncateWords(text) }
                        : chat
                )
            );

            const isRouteQuery = !!detectRouteIntent(text);
            const routeInfo    = isRouteQuery ? detectRouteIntent(text) : null;

            if (routeInfo?.usePropAsOrigin) {
                const msgs = chatsRef.current.find(c => c.id === chatId)?.messages || [];
                for (let i = msgs.length - 1; i >= 0; i--) {
                    const m = msgs[i];
                    if (m.role === "ai" && m.properties?.length > 0) {
                        const p    = m.properties[0];
                        const pLat = parseFloat(p.latitude ?? p.lat);
                        const pLng = parseFloat(p.longitude ?? p.lng);
                        if (!isNaN(pLat) && !isNaN(pLng)) {
                            routeInfo.origin      = { lat: pLat, lng: pLng };
                            routeInfo.originLabel = p.title || p.location;
                        } else if (p.location) {
                            routeInfo.origin      = p.location;
                            routeInfo.originLabel = p.title || p.location;
                        }
                        break;
                    }
                }
            }

            setLoading(true);

            try {
                const response = await fetch(ENDPOINTS.AI_ASK, {
                    method:  "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        question:         text,
                        chatId,
                        userLatitude:     userLat  ?? null,
                        userLongitude:    userLng  ?? null,
                        userLocationName: userLat != null ? userLocName : null,
                        isRouteQuery,
                    }),
                });

                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                const data = await response.json();

                const routeOriginLabel = routeInfo?.originLabel || (
                    typeof routeInfo?.origin === "object" ? "This Property" : routeInfo?.origin || "Unknown"
                );
                const routeText = isRouteQuery
                    ? `🗺️ Showing route from **${routeOriginLabel}** to **${routeInfo.destination}** on the map.\n\nUse the travel mode tabs to switch modes.`
                    : (data.message || "No response received.");

                appendMessage(chatId, {
                    id:           uid(),
                    role:         "ai",
                    text:         routeText,
                    isRouteQuery,
                    hasResults:   isRouteQuery ? false : (data.hasResults  || false),
                    properties:   isRouteQuery ? []    : (data.properties  || []),
                    followUps:    isRouteQuery ? []    : (data.followUps   || []),
                });
            } catch (err) {
                console.error("[AiSearchPage] sendMessage error:", err.message);
                appendMessage(chatId, {
                    id: uid(), role: "ai",
                    text: "Something went wrong. Please try again.",
                    hasResults: false, properties: [], isError: true,
                });
            } finally {
                setLoading(false);
            }
        },
        [activeChatId, loading, appendMessage, isGranted, isDenied, position, locationName]
    );

    const handleLocationGranted = useCallback((pos) => {
        if (pendingQuery) {
            sendMessage({
                question:         pendingQuery,
                userLatitude:     pos.latitude,
                userLongitude:    pos.longitude,
                userLocationName: pos.locationName ?? null,
            });
            setPendingQuery("");
        }
    }, [pendingQuery, sendMessage]);

    const retryMessage = useCallback((chatId, msgIndex) => {
        const chat = chatsRef.current.find((c) => c.id === chatId);
        if (!chat) return;
        const userMsg = chat.messages.slice(0, msgIndex).reverse().find((m) => m.role === "user");
        if (userMsg) {
            setChats((prev) =>
                prev.map((c) =>
                    c.id === chatId ? { ...c, messages: c.messages.slice(0, msgIndex) } : c
                )
            );
            setTimeout(() => sendMessage(userMsg.text), 80);
        }
    }, [sendMessage]);

    // ── Init ───────────────────────────────────────────────────────────────
    const didInit = useRef(false);
    useEffect(() => {
        if (!didInit.current) { didInit.current = true; createNewChat(); }
    }, []); // eslint-disable-line

    useEffect(() => {
        if (initialQuestion && activeChatId && !hasSentInitial.current) {
            hasSentInitial.current = true;
            sendMessage(initialQuestion);
        }
    }, [initialQuestion, activeChatId, sendMessage]);

    useKeyboardShortcuts(useMemo(() => ({
        [KEYBOARD_SHORTCUTS.NEW_CHAT]:       createNewChat,
        [KEYBOARD_SHORTCUTS.TOGGLE_SIDEBAR]: () => setSidebarOpen((v) => !v),
        [KEYBOARD_SHORTCUTS.TOGGLE_THEME]:   toggleTheme,
    }), [createNewChat, toggleTheme]));

    return (
        <div className="ai-layout">

            <LocationPermissionModal
                open={locationModalOpen}
                onClose={() => { setLocationModalOpen(false); setPendingQuery(""); }}
                onLocationGranted={handleLocationGranted}
                queryText={pendingQuery}
            />

            <AiSidebar
                chats={chats}
                activeChatId={activeChatId}
                setActiveChatId={setActiveChatId}
                createNewChat={createNewChat}
                deleteChat={requestDeleteChat}
                collapsed={!sidebarOpen}
                user={currentUser}
            />

            <main className="ai-main">
                <div className="ai-topbar">
                    <button className="topbar-btn"
                            onClick={() => setSidebarOpen((v) => !v)}
                            title={sidebarOpen ? "Hide sidebar (Ctrl+B)" : "Show sidebar (Ctrl+B)"}
                            aria-label="Toggle sidebar">
                        <Icon name="sidebar" size={16} />
                    </button>
                    <span className="topbar-title">{activeChat?.title || "New Chat"}</span>
                    <div className="topbar-spacer" />
                    <button className="topbar-btn" onClick={toggleTheme}
                            title="Toggle theme (Ctrl+J)" aria-label="Toggle theme">
                        <Icon name={theme === "dark" ? "sun" : "moon"} size={16} />
                    </button>
                </div>

                <AiChatBox
                    chat={activeChat}
                    loading={loading}
                    onSend={sendMessage}
                    onEditMessage={editMessage}
                    onRetry={retryMessage}
                    onCopy={copyMessageText}
                    userPosition={position}
                    compareList={compareList}
                    onCompare={toggleCompare}
                />
            </main>

            {/* ── Toast ── */}
            <div className={`toast ${toast.visible ? "visible" : ""}`}
                 role="status" aria-live="polite">
                {toast.text}
            </div>

            {/* ── Compare Bar — floats above bottom input ── */}
            <CompareBar
                count={compareList.length}
                properties={compareList}
                onClick={() => setCompareOpen(true)}
                onClear={clearCompare}
            />

            {/* ── Compare Modal ── */}
            {compareOpen && (
                <CompareModal
                    properties={compareList}
                    onClose={() => setCompareOpen(false)}
                    onRemove={(id) => setCompareList((prev) => prev.filter((p) => p.id !== id))}
                />
            )}

            {/* ── Delete chat confirm ── */}
            {deleteTarget && (
                <ConfirmDialog
                    title="Delete Chat"
                    message="This conversation and all its messages will be permanently removed."
                    confirmLabel="Delete"
                    onConfirm={confirmDeleteChat}
                    onCancel={() => setDeleteTarget(null)}
                />
            )}
        </div>
    );
}