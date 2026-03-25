/**
 * LiveTourButton.jsx — Production-ready Live Video Tour Component
 *
 * Flow:
 *  1. Customer clicks "LIVE TOUR" floating button
 *  2. App checks agent availability from backend
 *  3a. If AVAILABLE  → PreJoin screen → Jitsi video call
 *  3b. If BUSY       → "Agent is busy" queue screen with live wait counter
 *  3c. If OFFLINE    → Show offline message + "Book a Tour" CTA
 *  4. WebSocket keeps queue position updated in real-time
 *
 * Props:
 *   property  — property object { id, title, mainImages }
 */

import React, { useEffect, useRef, useState, useCallback } from "react";
import "./LiveTourButton.css";

/* ─── Config ─────────────────────────────────────────────────────────────── */
const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:8080";
const WS_BASE  = process.env.REACT_APP_WS_BASE  || "ws://localhost:8080";
const JITSI_DOMAIN = "meet.jit.si";

/* ─── Screens ────────────────────────────────────────────────────────────── */
const SCREEN = {
  CLOSED:     "closed",
  CHECKING:   "checking",
  PREJOIN:    "prejoin",
  CONNECTING: "connecting",
  BUSY:       "busy",
  OFFLINE:    "offline",
  CALL:       "call",
  THANKYOU:   "thankyou",   // shown after call ends — replaces Jitsi promo page
};

/* ─── Agent avatar placeholder images (fallback if no photo) ─────────────── */
const AGENT_PLACEHOLDER = "https://ui-avatars.com/api/?name=Property+Expert&background=0b63e5&color=fff&size=128";

export default function LiveTourButton({ property }) {
  const [screen,         setScreen]         = useState(SCREEN.CLOSED);
  const [name,           setName]           = useState("");
  const [mobile,         setMobile]         = useState("");
  const [availability,   setAvailability]   = useState(null); // { online, busy, queueCount, agentName, agentPhoto }
  const [queuePosition,  setQueuePosition]  = useState(null);
  const [queueWait,      setQueueWait]      = useState(0);    // elapsed seconds in queue
  const [error,          setError]          = useState("");

  const jitsiContainerRef = useRef(null);
  const jitsiApiRef       = useRef(null);
  const wsRef             = useRef(null);
  const waitTimerRef      = useRef(null);
  const abortRef          = useRef(null);

  // UUID room name — unguessable per session. Generated fresh each modal open.
  const [roomName, setRoomName] = useState("");
  const generateRoomName = useCallback(() => {
    const uid = (crypto.randomUUID ? crypto.randomUUID().replace(/-/g,'').slice(0,16) : Math.random().toString(36).slice(2,18));
    return `ogm${property?.id}${uid}`;  // alphanumeric only — JaaS requirement
  }, [property?.id]);

  /* ────────────────────────────────────────────────────────────────
     1. CHECK AVAILABILITY — called when button is clicked
  ──────────────────────────────────────────────────────────────── */
  const checkAvailability = useCallback(async () => {
    if (!property?.id) return;
    setScreen(SCREEN.CHECKING);
    setError("");
    setRoomName(generateRoomName()); // fresh UUID room each call

    abortRef.current?.abort();
    abortRef.current = new AbortController();

    try {
      const res = await fetch(
        `${API_BASE}/api/live-tour/availability/${property.id}`,
        { signal: abortRef.current.signal }
      );
      if (!res.ok) throw new Error("Server error");
      const data = await res.json();
      setAvailability(data);

      if (!data.online) {
        setScreen(SCREEN.OFFLINE);
      } else if (data.busy) {
        setScreen(SCREEN.BUSY);
      } else {
        setScreen(SCREEN.PREJOIN);
      }
    } catch (err) {
      if (err.name === "AbortError") return;
      setError("Could not reach server. Please try again.");
      setScreen(SCREEN.PREJOIN); // graceful fallback
    }
  }, [property?.id]);

  /* ────────────────────────────────────────────────────────────────
     2. JOIN QUEUE — called when agent is busy
  ──────────────────────────────────────────────────────────────── */
  const joinQueue = useCallback(async () => {
    if (!name.trim() || !mobile.trim()) {
      setError("Please enter your name and mobile number.");
      return;
    }
    setError("");

    try {
      const res = await fetch(`${API_BASE}/api/live-tour/join-queue`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId: property?.id,
          name: name.trim(),
          mobile: mobile.trim(),
        }),
      });
      if (!res.ok) throw new Error();
      const position = await res.json();
      setQueuePosition(position);

      // Start wait timer
      setQueueWait(0);
      waitTimerRef.current = setInterval(
        () => setQueueWait((s) => s + 1),
        1000
      );

      // Subscribe to WebSocket queue updates
      subscribeToQueue();
    } catch {
      setError("Failed to join queue. Please try again.");
    }
  }, [name, mobile, property?.id]);

  /* ────────────────────────────────────────────────────────────────
     3. WEBSOCKET — live queue updates via SockJS + STOMP
  ──────────────────────────────────────────────────────────────── */
  const subscribeToQueue = useCallback(() => {
    // Dynamically load SockJS + STOMP if not already loaded
    const loadAndConnect = () => {
      if (window.SockJS && window.Stomp) {
        connectWS();
        return;
      }
      // Load SockJS
      const s1 = document.createElement("script");
      s1.src = "https://cdnjs.cloudflare.com/ajax/libs/sockjs-client/1.6.1/sockjs.min.js";
      s1.onload = () => {
        // Load STOMP
        const s2 = document.createElement("script");
        s2.src = "https://cdnjs.cloudflare.com/ajax/libs/stomp.js/2.3.3/stomp.min.js";
        s2.onload = connectWS;
        document.body.appendChild(s2);
      };
      document.body.appendChild(s1);
    };

    const connectWS = () => {
      try {
        const socket = new window.SockJS(`${API_BASE}/live-queue`);
        const stomp  = window.Stomp.over(socket);
        stomp.debug  = null; // silence console spam

        stomp.connect({}, () => {
          wsRef.current = stomp;

          // Queue count updates
          stomp.subscribe(`/topic/queue/${property?.id}`, (msg) => {
            const count = JSON.parse(msg.body);
            setAvailability((prev) => ({ ...prev, queueCount: count }));
          });

          // Agent became available — auto-transition to PreJoin
          stomp.subscribe(`/topic/availability/${property?.id}`, (msg) => {
            const avail = JSON.parse(msg.body);
            if (avail.online && !avail.busy) {
              clearInterval(waitTimerRef.current);
              setAvailability(avail);
              setScreen(SCREEN.PREJOIN);
            }
          });
        });
      } catch {
        // WS not critical — silently ignore
      }
    };

    loadAndConnect();
  }, [property?.id]);

  /* ────────────────────────────────────────────────────────────────
     4a. START CALL — notify agent via join-queue, then show
         CONNECTING screen. This ensures the agent dashboard
         receives the popup even when the agent is AVAILABLE
         (not just when busy/queued).
  ──────────────────────────────────────────────────────────────── */
  const startCall = useCallback(async () => {
    if (!name.trim()) {
      setError("Please enter your name.");
      return;
    }
    setError("");
    setScreen(SCREEN.CONNECTING);

    // Notify the agent via join-queue — fires the WebSocket popup
    // on the agent dashboard. Fire-and-forget (don't block the call).
    try {
      await fetch(`${API_BASE}/api/live-tour/join-queue`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId: property?.id,
          name:       name.trim(),
          mobile:     "",
          roomName:   roomName, // UUID room — agent uses this to join same room
        }),
      });
    } catch {
      // Non-critical — call proceeds regardless
    }
  }, [name, property?.id]);

  /* ────────────────────────────────────────────────────────────────
     4b. CONNECTING → CALL — pre-load Jitsi script, then transition
         Minimum 1.8 s display so the connecting screen feels natural
  ──────────────────────────────────────────────────────────────── */
  useEffect(() => {
    if (screen !== SCREEN.CONNECTING) return;
    const start = Date.now();

    const proceed = () => {
      const waited = Date.now() - start;
      const delay  = Math.max(0, 1800 - waited);
      setTimeout(() => setScreen(SCREEN.CALL), delay);
    };

    const _JAAS = process.env.REACT_APP_JAAS_APP_ID || '';
    const scriptSrc = _JAAS ? `https://8x8.vc/${_JAAS}/external_api.js` : `https://${JITSI_DOMAIN}/external_api.js`;
    if (!window.JitsiMeetExternalAPI) {
      const s    = document.createElement("script");
      s.src      = scriptSrc;
      s.async    = true;
      s.onload   = proceed;
      s.onerror  = proceed;
      document.body.appendChild(s);
    } else {
      proceed();
    }
  }, [screen]);

  /* ────────────────────────────────────────────────────────────────
     4c. CALL screen — mount Jitsi into DOM ref
  ──────────────────────────────────────────────────────────────── */
  useEffect(() => {
    if (screen !== SCREEN.CALL || !roomName) return;

    const _JAAS   = process.env.REACT_APP_JAAS_APP_ID || '';
    const domain  = _JAAS ? '8x8.vc' : JITSI_DOMAIN;
    const jaasRoom = _JAAS ? `${_JAAS}/${roomName}` : roomName;

    const loadJitsi = async () => {
      if (!jitsiContainerRef.current) return;
      // Get JaaS JWT if configured
      let jwt = null;
      if (_JAAS) {
        try {
          const r = await fetch(`${API_BASE}/api/live-tour/jaas-token`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userName: name || 'Guest', roomName, moderator: 'false' }),
          });
          if (r.ok) jwt = (await r.json()).token;
        } catch { /* non-critical */ }
      }
      const opts = {
        roomName:   jaasRoom,
        parentNode: jitsiContainerRef.current,
        width: "100%",
        height: "100%",
        userInfo: { displayName: name || "Guest" },
        configOverwrite: {
          startWithAudioMuted:    false,
          startWithVideoMuted:    false,
          prejoinPageEnabled:     false,
          prejoinConfig:          { enabled: false },
          disableDeepLinking:     true,
          enableClosePage:        false,
          // Disable lobby / members-only so customers can join without waiting
          lobby:                  { autoKnock: false, enableChat: false },
          securityUi:             { hideLobbyButton: true, disableLobbyPassword: true },
          enableLobbyChat:        false,
          membersOnly:            false,
        },
        interfaceConfigOverwrite: {
          SHOW_JITSI_WATERMARK:             false,
          SHOW_BRAND_WATERMARK:             false,
          SHOW_POWERED_BY:                  false,
          DISABLE_JOIN_LEAVE_NOTIFICATIONS: true,
          TOOLBAR_ALWAYS_VISIBLE:           true,
          SHOW_CHROME_EXTENSION_BANNER:     false,
          MOBILE_APP_PROMO:                 false,
        },
        parentNode: jitsiContainerRef.current,
        width: '100%', height: '100%',
        userInfo: { displayName: name || 'Guest' },
        configOverwrite: {
          startWithAudioMuted:      false,
          startWithVideoMuted:      false,
          prejoinPageEnabled:       false,
          prejoinConfig:            { enabled: false },
          disableDeepLinking:       true,
          enableClosePage:          false,
          disableAudioLevels:       false,
          enableNoisyMicDetection:  false,
          enableNoAudioDetection:   false,
          p2p:                      { enabled: false },  // JaaS uses SFU
          lobby:                    { autoKnock: false, enableChat: false },
          securityUi:               { hideLobbyButton: true, disableLobbyPassword: true },
          membersOnly:              false,
        },
        interfaceConfigOverwrite: {
          SHOW_JITSI_WATERMARK: false, SHOW_BRAND_WATERMARK: false,
          SHOW_POWERED_BY: false, DISABLE_JOIN_LEAVE_NOTIFICATIONS: true,
          TOOLBAR_ALWAYS_VISIBLE: true, SHOW_CHROME_EXTENSION_BANNER: false,
          MOBILE_APP_PROMO: false,
        },
      };
      if (jwt) opts.jwt = jwt;
      jitsiApiRef.current = new window.JitsiMeetExternalAPI(domain, opts);
      jitsiApiRef.current.addListener('readyToClose', () => closeModal());
    };

    loadJitsi();

    return () => { jitsiApiRef.current?.dispose(); };
  }, [screen, roomName, name]);

  /* ────────────────────────────────────────────────────────────────
     5. CLOSE / CLEANUP
  ──────────────────────────────────────────────────────────────── */
  const closeModal = useCallback(() => {
    jitsiApiRef.current?.dispose();
    wsRef.current?.disconnect();
    clearInterval(waitTimerRef.current);
    abortRef.current?.abort();
    setScreen(SCREEN.THANKYOU);
    setName("");
    setMobile("");
    setQueuePosition(null);
    setQueueWait(0);
    setError("");
    setAvailability(null);
  }, []);

  // Cleanup on unmount
  useEffect(() => () => {
    jitsiApiRef.current?.dispose();
    wsRef.current?.disconnect();
    clearInterval(waitTimerRef.current);
    abortRef.current?.abort();
  }, []);

  /* ────────────────────────────────────────────────────────────────
     FORMAT HELPERS
  ──────────────────────────────────────────────────────────────── */
  const fmtWait = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return m > 0
      ? `${m}m ${String(sec).padStart(2, "0")}s`
      : `${sec}s`;
  };

  const estimatedWait = queuePosition
    ? `~${queuePosition * 4}–${queuePosition * 6} min`
    : null;

  /* ────────────────────────────────────────────────────────────────
     RENDER
  ──────────────────────────────────────────────────────────────── */
  return (
    <>
      {/* ── FLOATING BUTTON ── */}
      <button
        className="ltb-fab"
        onClick={checkAvailability}
        aria-label="Start Live Tour"
      >
        <span className="ltb-fab-dot" aria-hidden="true" />
        <span className="ltb-fab-text">LIVE TOUR</span>
      </button>

      {/* ── MODAL ── */}
      {screen !== SCREEN.CLOSED && (
        <div
          className="ltb-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Live Video Tour"
        >
          <div className="ltb-modal">
            {/* Close button — always visible */}
            <button
              className="ltb-close"
              onClick={closeModal}
              aria-label="Close"
            >
              ✕
            </button>

            {/* ── CHECKING ── */}
            {screen === SCREEN.CHECKING && (
              <div className="ltb-screen ltb-screen--center">
                <div className="ltb-spinner" />
                <p className="ltb-checking-text">Checking availability…</p>
              </div>
            )}

            {/* ── PREJOIN ── */}
            {screen === SCREEN.PREJOIN && (
              <div className="ltb-screen ltb-screen--prejoin">
                {property?.mainImages?.[0] && (
                  <img
                    className="ltb-bg-img"
                    src={property.mainImages[0]}
                    alt=""
                    aria-hidden="true"
                  />
                )}
                <div className="ltb-bg-overlay" />

                <div className="ltb-prejoin-card">
                  {/* Agent card */}
                  <div className="ltb-agent-row">
                    <img
                      className="ltb-agent-avatar"
                      src={availability?.agentPhoto || AGENT_PLACEHOLDER}
                      alt={availability?.agentName || "Property Expert"}
                      onError={(e) => { e.target.src = AGENT_PLACEHOLDER; }}
                    />
                    <div>
                      <div className="ltb-agent-name">
                        {availability?.agentName || "Property Expert"}
                      </div>
                      <div className="ltb-agent-role">Senior Property Advisor</div>
                      <div className="ltb-agent-status">
                        <span className="ltb-status-dot ltb-status-dot--green" />
                        Available now
                      </div>
                    </div>
                  </div>

                  <h2 className="ltb-prejoin-title">Join Live Tour</h2>
                  {property?.title && (
                    <p className="ltb-prejoin-property">{property.title}</p>
                  )}

                  {error && <div className="ltb-error">{error}</div>}

                  <input
                    className="ltb-input"
                    type="text"
                    placeholder="Your name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && startCall()}
                    autoFocus
                    aria-label="Your name"
                  />

                  <button
                    className="ltb-btn ltb-btn--primary"
                    onClick={startCall}
                    disabled={!name.trim()}
                  >
                    🎥 Join Live Now
                  </button>

                  <button
                    className="ltb-btn ltb-btn--secondary"
                    onClick={closeModal}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* ── BUSY / QUEUE ── */}
            {screen === SCREEN.BUSY && (
              <div className="ltb-screen ltb-screen--busy">
                {property?.mainImages?.[0] && (
                  <img
                    className="ltb-bg-img ltb-bg-img--blur"
                    src={property.mainImages[0]}
                    alt=""
                    aria-hidden="true"
                  />
                )}
                <div className="ltb-bg-overlay ltb-bg-overlay--dark" />

                <div className="ltb-queue-card">
                  {/* Agent busy indicator */}
                  <div className="ltb-busy-header">
                    <img
                      className="ltb-agent-avatar ltb-agent-avatar--busy"
                      src={availability?.agentPhoto || AGENT_PLACEHOLDER}
                      alt=""
                      onError={(e) => { e.target.src = AGENT_PLACEHOLDER; }}
                    />
                    <div className="ltb-busy-badge">
                      <span className="ltb-status-dot ltb-status-dot--orange ltb-status-dot--pulse" />
                      On another call
                    </div>
                  </div>

                  <h2 className="ltb-queue-title">
                    {availability?.agentName || "The agent"} is busy
                  </h2>
                  <p className="ltb-queue-sub">
                    {availability?.queueCount
                      ? `${availability.queueCount} ${availability.queueCount === 1 ? "person" : "people"} waiting`
                      : "Join the queue — you'll be next"}
                  </p>

                  {/* Show wait info if already joined */}
                  {queuePosition !== null ? (
                    <div className="ltb-queue-status">
                      <div className="ltb-queue-pos-ring">
                        <div className="ltb-queue-pos-inner">
                          <span className="ltb-queue-pos-num">#{queuePosition}</span>
                          <span className="ltb-queue-pos-label">in queue</span>
                        </div>
                      </div>

                      <div className="ltb-queue-meta">
                        <div className="ltb-queue-row">
                          <span className="ltb-queue-icon">⏱</span>
                          <span>Waiting: <strong>{fmtWait(queueWait)}</strong></span>
                        </div>
                        {estimatedWait && (
                          <div className="ltb-queue-row">
                            <span className="ltb-queue-icon">📅</span>
                            <span>Est. wait: <strong>{estimatedWait}</strong></span>
                          </div>
                        )}
                        <div className="ltb-queue-row">
                          <span className="ltb-queue-icon">📞</span>
                          <span>We'll call <strong>{mobile}</strong> when ready</span>
                        </div>
                      </div>

                      <p className="ltb-queue-note">
                        You can close this window. We'll notify you when the agent is ready.
                      </p>

                      <button
                        className="ltb-btn ltb-btn--ghost"
                        onClick={closeModal}
                      >
                        Close & wait in background
                      </button>
                    </div>
                  ) : (
                    <div className="ltb-queue-form">
                      {error && <div className="ltb-error">{error}</div>}

                      <input
                        className="ltb-input"
                        type="text"
                        placeholder="Your name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        aria-label="Your name"
                      />
                      <input
                        className="ltb-input"
                        type="tel"
                        placeholder="Mobile number (we'll call you)"
                        value={mobile}
                        onChange={(e) => setMobile(e.target.value)}
                        aria-label="Your mobile number"
                      />

                      <button
                        className="ltb-btn ltb-btn--primary"
                        onClick={joinQueue}
                        disabled={!name.trim() || !mobile.trim()}
                      >
                        Join Queue — Get Called Back
                      </button>

                      <button
                        className="ltb-btn ltb-btn--secondary"
                        onClick={() => {
                          closeModal();
                          // Navigate to book tour page
                          window.location.href = `/book-tour/${property?.slug || property?.id}`;
                        }}
                      >
                        📅 Schedule a Tour Instead
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── OFFLINE ── */}
            {screen === SCREEN.OFFLINE && (
              <div className="ltb-screen ltb-screen--center">
                <div className="ltb-offline-icon">😴</div>
                <h2 className="ltb-offline-title">Agent is offline</h2>
                <p className="ltb-offline-sub">
                  Our property expert is not available right now.<br />
                  Schedule a tour for a time that works for you.
                </p>
                <button
                  className="ltb-btn ltb-btn--primary ltb-btn--wide"
                  onClick={() => {
                    closeModal();
                    window.location.href = `/book-tour/${property?.slug || property?.id}`;
                  }}
                >
                  📅 Book a Live Tour
                </button>
                <button
                  className="ltb-btn ltb-btn--ghost"
                  onClick={closeModal}
                >
                  Maybe later
                </button>
              </div>
            )}

            {/* ── CONNECTING ── */}
            {screen === SCREEN.CONNECTING && (
              <div className="ltb-screen ltb-screen--connecting">
                <div className="ltb-conn-header">RealEstateCo</div>
                <div className="ltb-conn-help">Need Help?</div>

                <div className="ltb-conn-body">
                  <h2 className="ltb-conn-title">Connecting you to your property expert</h2>
                  <p className="ltb-conn-sub">This will take just a moment…</p>

                  <p className="ltb-conn-speaking">You'll be speaking with</p>

                  <div className="ltb-conn-agent-card">
                    <img
                      className="ltb-conn-agent-photo"
                      src={availability?.agentPhoto || "https://ui-avatars.com/api/?name=Property+Expert&background=e2e8f0&color=334155&size=128"}
                      alt={availability?.agentName || "Property Expert"}
                      onError={(e) => {
                        e.target.src = "https://ui-avatars.com/api/?name=Property+Expert&background=e2e8f0&color=334155&size=128";
                      }}
                    />
                    <div className="ltb-conn-agent-name">
                      {availability?.agentName || "Property Expert"}
                    </div>
                    <div className="ltb-conn-agent-role">
                      {availability?.agentRole || "Senior Property Advisor"}
                    </div>
                  </div>

                  {/* Spinning loader */}
                  <div className="ltb-conn-spinner-wrap">
                    <div className="ltb-conn-spinner" />
                  </div>

                  {/* Property image preview */}
                  {property?.mainImages?.[0] && (
                    <div className="ltb-conn-prop-wrap">
                      <img
                        className="ltb-conn-prop-img"
                        src={property.mainImages[0]}
                        alt={property.title || "Property"}
                      />
                      <p className="ltb-conn-prop-caption">Ask about the brochure…</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── THANK YOU ── */}
            {screen === SCREEN.THANKYOU && (
              <div className="ltb-thankyou">
                <div className="ltb-thankyou-icon">🏡</div>
                <h2 className="ltb-thankyou-title">Thank you for your time!</h2>
                <p className="ltb-thankyou-sub">
                  Our property expert will follow up with you shortly.<br/>
                  We hope you enjoyed your live tour.
                </p>
                <div className="ltb-thankyou-actions">
                  <button
                    className="ltb-thankyou-book"
                    onClick={() => setScreen(SCREEN.CLOSED)}
                  >
                    📅 Book Another Tour
                  </button>
                  <button
                    className="ltb-thankyou-close"
                    onClick={() => setScreen(SCREEN.CLOSED)}
                  >
                    Close
                  </button>
                </div>
              </div>
            )}

            {/* ── LIVE CALL ── */}
            {screen === SCREEN.CALL && (
              <>
                <div
                  className="ltb-jitsi-container"
                  ref={jitsiContainerRef}
                />

                {/* Full top-bar dark cover — hides entire Jitsi header row */}
                <div style={{
                  position: 'absolute', top: 0, left: 0, right: 0,
                  height: 72,
                  zIndex: 9999,
                  background: '#111827',
                  pointerEvents: 'none',
                }} />
                {/* OGM badge on top */}
                <div style={{
                  position: 'absolute', top: 0, left: 0, right: 0,
                  height: 72,
                  zIndex: 10000,
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '0 16px',
                  pointerEvents: 'none',
                }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: 'linear-gradient(135deg,#3b82f6,#f97316)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 900, color: 'white', flexShrink: 0,
                    boxShadow: '0 2px 8px rgba(59,130,246,0.4)',
                  }}>OG</div>
                  <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
                    <span style={{ color:'white', fontSize:15, fontWeight:800, lineHeight:1, letterSpacing:0.2 }}>OGM Live</span>
                    <span style={{ color:'rgba(255,255,255,0.5)', fontSize:11, lineHeight:1 }}>Live Property Tour</span>
                  </div>
                </div>

                {/* End Call — bottom-left, away from face */}
                <button
                  className="ltb-end-call"
                  onClick={closeModal}
                  aria-label="End call"
                >
                  📵 End Call
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}