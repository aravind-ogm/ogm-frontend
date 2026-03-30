import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useLocation } from "react-router-dom";

/* ── Components ── */
import AiSidebar     from "./AiSidebar";
import AiChatBox     from "./AiChatBox";
import ConfirmDialog from "./Confirmdialog";
import Icon          from "./Icon";

/* ── Hooks ── */
import useTheme             from "./Usetheme";
import useKeyboardShortcuts from "./Usekeyboardshortcuts";
import useGeolocation, { detectNearMeIntent } from "./Usegeolocation";

/* ── Location modal ── */
import LocationPermissionModal from "./LocationPermissionModal";

/* ── Utils ── */
import { uid, truncateWords }            from "./Helpers";
import { detectRouteIntent }             from "./RouteHelper";
import { ENDPOINTS, KEYBOARD_SHORTCUTS } from "./Constants";

/* ── Styles ── */
import "../../styles/ai/ai-variables.css";
import "../../styles/ai/ai-layout.css";

export default function AiSearchPage() {
    const location        = useLocation();
    const initialQuestion = location.state?.question;

    const [chats,        setChats]        = useState([]);
    const [activeChatId, setActiveChatId] = useState(null);
    const [loading,      setLoading]      = useState(false);
    const [sidebarOpen,  setSidebarOpen]  = useState(() => window.innerWidth > 640);

    /* ── Read logged-in user from localStorage (JWT stored by broker login flow) ── */
    const currentUser = useMemo(() => {
        try {
            // Try common storage keys used in Spring Boot JWT + Google OAuth flows
            const raw =
                localStorage.getItem("user") ||
                localStorage.getItem("ogm_user") ||
                sessionStorage.getItem("user") ||
                sessionStorage.getItem("ogm_user");
            if (raw) {
                const parsed = JSON.parse(raw);
                return {
                    name:   parsed.name  || parsed.fullName  || parsed.displayName || parsed.email?.split("@")[0] || "User",
                    email:  parsed.email || "",
                    role:   parsed.role  || parsed.plan       || parsed.subscription || "Member",
                    avatar: parsed.avatar || parsed.photoUrl  || parsed.picture || null,
                    initials: (parsed.name || parsed.email || "U").charAt(0).toUpperCase(),
                };
            }

            // Try JWT token decode (without library — just base64 the payload)
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
        } catch { /* silent fail */ }
        // Fallback — anonymous
        return { name: "Guest", email: "", role: "Free Plan", avatar: null, initials: "G" };
    }, []);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [toast,        setToast]        = useState({ visible: false, text: "" });

    const [locationModalOpen, setLocationModalOpen] = useState(false);
    const [pendingQuery,      setPendingQuery]       = useState("");

    const {
        position,
        locationName,
        permissionStatus,
        requestLocation,
        isGranted,
        isDenied,
    } = useGeolocation();

    const hasSentInitial        = useRef(false);
    const { theme, toggleTheme } = useTheme();

    const activeChat = useMemo(
        () => chats.find((c) => c.id === activeChatId) || null,
        [chats, activeChatId]
    );

    const makeChat = useCallback((title = "New Chat") => ({
        id: uid(), title, messages: [], createdAt: Date.now(),
    }), []);

    const showToast = useCallback((text) => {
        setToast({ visible: true, text });
        setTimeout(() => setToast({ visible: false, text: "" }), 2000);
    }, []);

    /* ── Chat CRUD ── */

    const createNewChat = useCallback(() => {
        const chat = makeChat();
        setChats((prev) => [chat, ...prev]);
        setActiveChatId(chat.id);
    }, [makeChat]);

    const requestDeleteChat = useCallback((chatId) => {
        setDeleteTarget(chatId);
    }, []);

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

    /* ── Message operations ── */

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
                    ? {
                        ...chat,
                        messages: chat.messages.map((m) =>
                            m.id === msgId ? { ...m, text: newText, edited: true } : m
                        ),
                    }
                    : chat
            )
        );
    }, []);

    const copyMessageText = useCallback((text) => {
        navigator.clipboard?.writeText(text);
        showToast("Copied to clipboard");
    }, [showToast]);

    /* ── Send message ── */

    // Helper to get current active chat messages for context lookups
    const activeChatMessages = useCallback(() => {
        const chat = chats.find(c => c.id === activeChatId);
        return chat?.messages || [];
    }, [chats, activeChatId]);

    const sendMessage = useCallback(
        async (input) => {
            const isObject    = input !== null && typeof input === "object";
            const text        = isObject ? input.question?.trim() : input?.trim();
            let   userLat     = isObject ? input.userLatitude    : null;
            let   userLng     = isObject ? input.userLongitude   : null;
            let   userLocName = isObject ? input.userLocationName : null;

            if (!text || !activeChatId || loading) return;

            const needsLocation = detectNearMeIntent(text);

            if (needsLocation && !isDenied) {
                if (isGranted && position) {
                    userLat = position.latitude;
                    userLng = position.longitude;
                } else {
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

            // Resolve "__PROPERTY__" to the last seen property's location
            if (routeInfo?.usePropAsOrigin) {
                const msgs = activeChatMessages();
                for (let i = msgs.length - 1; i >= 0; i--) {
                    const m = msgs[i];
                    if (m.role === "ai" && m.properties?.length > 0) {
                        const p = m.properties[0];
                        const pLat = parseFloat(p.latitude ?? p.lat);
                        const pLng = parseFloat(p.longitude ?? p.lng);
                        if (!isNaN(pLat) && !isNaN(pLng)) {
                            routeInfo.origin        = { lat: pLat, lng: pLng };
                            routeInfo.originLabel   = p.title || p.location;
                        } else if (p.location) {
                            routeInfo.origin        = p.location;
                            routeInfo.originLabel   = p.title || p.location;
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
                        chatId:           chatId,
                        userLatitude:     userLat  ?? null,
                        userLongitude:    userLng  ?? null,
                        userLocationName: userLat  != null ? userLocName : null,
                        isRouteQuery:     isRouteQuery,
                    }),
                });

                if (!response.ok) throw new Error(`HTTP ${response.status}`);

                const data = await response.json();

                const routeOriginLabel = routeInfo?.originLabel || (
                    typeof routeInfo?.origin === "object"
                        ? "This Property"
                        : routeInfo?.origin || "Unknown"
                );
                const routeText = isRouteQuery
                    ? `🗺️ Showing route from **${routeOriginLabel}** to **${routeInfo.destination}** on the map.\n\nUse the travel mode tabs (Drive / Transit / Walk / Cycle) on the right to switch modes.`
                    : (data.message || data.summary || data.reply || "No response received.");

                appendMessage(chatId, {
                    id:           uid(),
                    role:         "ai",
                    text:         routeText,
                    isRouteQuery: isRouteQuery,
                    hasResults:   isRouteQuery ? false : (data.hasResults  || false),
                    properties:   isRouteQuery ? []    : (data.properties  || []),
                    followUps:    isRouteQuery ? []    : (data.followUps   || []),
                });
            } catch (err) {
                appendMessage(chatId, {
                    id:         uid(),
                    role:       "ai",
                    text:       "Something went wrong. Please try again.",
                    hasResults: false,
                    properties: [],
                    isError:    true,
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

    const retryMessage = useCallback(
        (chatId, msgIndex) => {
            const chat = chats.find((c) => c.id === chatId);
            if (!chat) return;
            const userMsg = chat.messages
                .slice(0, msgIndex)
                .reverse()
                .find((m) => m.role === "user");
            if (userMsg) {
                setChats((prev) =>
                    prev.map((c) =>
                        c.id === chatId ? { ...c, messages: c.messages.slice(0, msgIndex) } : c
                    )
                );
                setTimeout(() => sendMessage(userMsg.text), 80);
            }
        },
        [chats, sendMessage]
    );

    /* ── Initialization ── */

    useEffect(() => {
        if (chats.length === 0) createNewChat();
    }, []);

    useEffect(() => {
        if (initialQuestion && activeChatId && !hasSentInitial.current) {
            hasSentInitial.current = true;
            sendMessage(initialQuestion);
        }
    }, [initialQuestion, activeChatId]);

    /* ── Keyboard shortcuts ── */

    useKeyboardShortcuts(
        useMemo(
            () => ({
                [KEYBOARD_SHORTCUTS.NEW_CHAT]:       createNewChat,
                [KEYBOARD_SHORTCUTS.TOGGLE_SIDEBAR]: () => setSidebarOpen((v) => !v),
                [KEYBOARD_SHORTCUTS.TOGGLE_THEME]:   toggleTheme,
            }),
            [createNewChat, toggleTheme]
        )
    );

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
                    <button
                        className="topbar-btn"
                        onClick={() => setSidebarOpen((v) => !v)}
                        title={sidebarOpen ? "Hide sidebar (Ctrl+B)" : "Show sidebar (Ctrl+B)"}
                        aria-label="Toggle sidebar"
                    >
                        <Icon name="sidebar" size={16} />
                    </button>

                    <span className="topbar-title">{activeChat?.title || "New Chat"}</span>
                    <div className="topbar-spacer" />

                    <button
                        className="topbar-btn"
                        onClick={toggleTheme}
                        title="Toggle theme (Ctrl+J)"
                        aria-label="Toggle theme"
                    >
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
                />
            </main>

            <div className={`toast ${toast.visible ? "visible" : ""}`} role="status" aria-live="polite">
                {toast.text}
            </div>

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