import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useLocation } from "react-router-dom";

/* ── Components (same folder) ── */
import AiSidebar     from "./AiSidebar";
import AiChatBox     from "./AiChatBox";
import ConfirmDialog from "./Confirmdialog";
import Icon          from "./Icon";

/* ── Hooks ── */
import useTheme              from "./Usetheme";
import useKeyboardShortcuts  from "./Usekeyboardshortcuts";
import useGeolocation, { detectNearMeIntent } from "./Usegeolocation";

/* ── Location modal ── */
import LocationPermissionModal from "./LocationPermissionModal";

/* ── Utils ── */
import { uid, truncateWords }            from "./Helpers";
import { ENDPOINTS, KEYBOARD_SHORTCUTS } from "./Constants";

/* ── Styles ── */
import "../../styles/ai/ai-variables.css";
import "../../styles/ai/ai-layout.css";

/* ═══════════════════════════════════════════════
   AI SEARCH PAGE — MAIN ORCHESTRATOR
   ═══════════════════════════════════════════════ */

export default function AiSearchPage() {
  const location        = useLocation();
  const initialQuestion = location.state?.question;

  /* ── STATE ── */
  const [chats,        setChats]        = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [loading,      setLoading]      = useState(false);
  const [sidebarOpen,  setSidebarOpen]  = useState(true);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [toast,        setToast]        = useState({ visible: false, text: "" });

  /* ── LOCATION STATE ── */                                          // ← NEW BLOCK
  const [locationModalOpen, setLocationModalOpen] = useState(false);
  const [pendingQuery,      setPendingQuery]       = useState("");
  const {
    position,
    locationName,       // reverse-geocoded place name e.g. "Koramangala, Bengaluru"
    permissionStatus,
    requestLocation,
    isGranted,
    isDenied,
  } = useGeolocation();

  const hasSentInitial = useRef(false);
  const { theme, toggleTheme } = useTheme();

  /* ── DERIVED ── */
  const activeChat = useMemo(
    () => chats.find((c) => c.id === activeChatId) || null,
    [chats, activeChatId]
  );

  /* ═══════════════════════════════════════
     HELPERS
     ═══════════════════════════════════════ */

  const makeChat = useCallback((title = "New Chat") => ({
    id: uid(), title, messages: [], createdAt: Date.now(),
  }), []);

  const showToast = useCallback((text) => {
    setToast({ visible: true, text });
    setTimeout(() => setToast({ visible: false, text: "" }), 2000);
  }, []);

  /* ═══════════════════════════════════════
     CHAT CRUD
     ═══════════════════════════════════════ */

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

  /* ═══════════════════════════════════════
     MESSAGE OPERATIONS
     ═══════════════════════════════════════ */

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

  /* ═══════════════════════════════════════
     SEND MESSAGE  ← only function changed
     ═══════════════════════════════════════ */

  /**
   * sendMessage now accepts either:
   *   - a plain string:  sendMessage("find 2 BHKs in Whitefield")
   *   - an object:       sendMessage({ question, userLatitude, userLongitude })
   *
   * When the query contains "near me" / "nearby" / "my current location":
   *   1. If location already granted  → attach coords and fire immediately
   *   2. If location not yet granted  → open the permission modal,
   *                                     hold the query in pendingQuery,
   *                                     fire once user allows (handleLocationGranted)
   *   3. If location denied           → fire without coords, backend handles gracefully
   */
  const sendMessage = useCallback(
    async (input) => {
      // Accept string or { question, userLatitude, userLongitude }
      const isObject    = input !== null && typeof input === "object";
      const text        = isObject ? input.question?.trim() : input?.trim();
      let   userLat     = isObject ? input.userLatitude    : null;
      let   userLng     = isObject ? input.userLongitude   : null;
      let   userLocName = isObject ? input.userLocationName : null;

      if (!text || !activeChatId || loading) return;

      // ── Location interception ─────────────────────────────────────────────
      const needsLocation = detectNearMeIntent(text);

      if (needsLocation && !isDenied) {
        if (isGranted && position) {
          // Already have it — use cached position
          userLat = position.latitude;
          userLng = position.longitude;
        } else {
          // Need to ask — hold query and show modal
          setPendingQuery(text);
          setLocationModalOpen(true);
          return; // ← will resume in handleLocationGranted
        }
      }
      // ─────────────────────────────────────────────────────────────────────

      // Always attach the latest known position + location name to every message.
      // This ensures follow-up messages ("show me cheaper ones", "any 3 BHK?")
      // continue to return nearby results and Gemini keeps location context.
      if (!userLat && position) {
        userLat     = position.latitude;
        userLng     = position.longitude;
        userLocName = userLocName ?? position.locationName ?? locationName ?? null;
      }

      const chatId = activeChatId;

      appendMessage(chatId, { id: uid(), role: "user", text });

      // Auto-title the chat from first message
      setChats((prev) =>
        prev.map((chat) =>
          chat.id === chatId && chat.title === "New Chat"
            ? { ...chat, title: truncateWords(text) }
            : chat
        )
      );

      setLoading(true);

      try {
        const response = await fetch(ENDPOINTS.AI_ASK, {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question:         text,
            chatId:           chatId,
            userLatitude:     userLat ?? null,
            userLongitude:    userLng ?? null,
            // Human-readable location name so Gemini can answer
            // "what is my location?" with the real place name
            userLocationName: userLat != null ? userLocName : null,
          }),
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const data = await response.json();

        appendMessage(chatId, {
          id:         uid(),
          role:       "ai",
          text:       data.message || data.summary || data.reply || "No response received.",
          hasResults: data.hasResults  || false,
          properties: data.properties  || [],
          followUps:  data.followUps   || [],
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
    [activeChatId, loading, appendMessage, isGranted, isDenied, position]
  );

  /* ── Location granted from modal ── */                            // ← NEW
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

  /* ── RETRY ── */
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

  /* ═══════════════════════════════════════
     INITIALIZATION
     ═══════════════════════════════════════ */

  useEffect(() => {
    if (chats.length === 0) createNewChat();
  }, []); // Run once on mount

  useEffect(() => {
    if (initialQuestion && activeChatId && !hasSentInitial.current) {
      hasSentInitial.current = true;
      sendMessage(initialQuestion);
    }
  }, [initialQuestion, activeChatId]); // Intentionally limited deps

  /* ═══════════════════════════════════════
     KEYBOARD SHORTCUTS
     ═══════════════════════════════════════ */

  useKeyboardShortcuts(
    useMemo(
      () => ({
        [KEYBOARD_SHORTCUTS.NEW_CHAT]:        createNewChat,
        [KEYBOARD_SHORTCUTS.TOGGLE_SIDEBAR]:  () => setSidebarOpen((v) => !v),
        [KEYBOARD_SHORTCUTS.TOGGLE_THEME]:    toggleTheme,
      }),
      [createNewChat, toggleTheme]
    )
  );

  /* ═══════════════════════════════════════
     RENDER
     ═══════════════════════════════════════ */

  return (
    <div className="ai-layout">

      {/* ── LOCATION PERMISSION MODAL ── */}                        {/* ← NEW */}
      <LocationPermissionModal
        open={locationModalOpen}
        onClose={() => { setLocationModalOpen(false); setPendingQuery(""); }}
        onLocationGranted={handleLocationGranted}
        queryText={pendingQuery}
      />

      {/* SIDEBAR */}
      <AiSidebar
        chats={chats}
        activeChatId={activeChatId}
        setActiveChatId={setActiveChatId}
        createNewChat={createNewChat}
        deleteChat={requestDeleteChat}
        collapsed={!sidebarOpen}
      />

      {/* MAIN */}
      <main className="ai-main">
        {/* TOP BAR */}
        <div className="ai-topbar">
          <button
            className="topbar-btn"
            onClick={() => setSidebarOpen((v) => !v)}
            title={sidebarOpen ? "Hide sidebar (Ctrl+B)" : "Show sidebar (Ctrl+B)"}
          >
            <Icon name="sidebar" size={16} />
          </button>

          <span className="topbar-title">{activeChat?.title || "New Chat"}</span>

          <div className="topbar-spacer" />

          <button
            className="topbar-btn"
            onClick={toggleTheme}
            title="Toggle theme"
          >
            <Icon name={theme === "dark" ? "sun" : "moon"} size={16} />
          </button>
        </div>

        {/* CHAT BOX — userPosition passed so cards can show distance badges */}
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

      {/* TOAST */}
      <div className={`toast ${toast.visible ? "visible" : ""}`}>{toast.text}</div>

      {/* DELETE CONFIRM */}
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