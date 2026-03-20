import React, { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import "../styles/AskDiscoverWidget.css";

const ROBOT_IMG = "/images/ai-robot.png";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:8080";

// Unique chat session per property page
function genChatId(propertyId) {
  return `prop-ask-${propertyId || "general"}-${Date.now()}`;
}

async function askGemini(question, chatId, systemContext) {
  try {
    const res = await fetch(`${API_BASE}/api/ai/property-ask`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, chatId, systemContext }),
    });
    if (!res.ok) throw new Error(`Error ${res.status}`);
    const data = await res.json();
    return data.message || "Sorry, I couldn't get a response.";
  } catch (err) {
    console.error("AI error:", err);
    throw err;
  }
}

function buildSystemPrompt(property) {
  if (!property) return "You are a helpful real estate assistant for OGM.";
  const price = property.price
    ? property.price >= 10_000_000
      ? `₹ ${(property.price / 10_000_000).toFixed(2)} Cr`
      : `₹ ${(property.price / 100_000).toFixed(2)} Lakhs`
    : "Price on request";
  return `You are an expert real estate assistant for One Global Marketplace (OGM).
Answer questions specifically about this property:
Title: ${property.title}
Location: ${property.location}
Price: ${price}
Type: ${property.type}
Bedrooms: ${property.bedrooms} | Bathrooms: ${property.bathrooms}
Built-up Area: ${property.builtupArea} | Land Area: ${property.landArea}
Facing: ${property.facing} | Furnishing: ${property.furnishing}
Parking: ${property.parking} | Maintenance: ${property.maintenance}
RERA Approved: ${property.reraApproved ? "Yes" : "No"}
Description: ${property.description || ""}
Amenities: ${(property.amenities || []).join(", ")}

Be concise (2-4 sentences), positive, highlight strengths.
End with an invitation to book a live tour or call the agent.`;
}

const SUGGESTIONS = [
  "What are the key highlights?",
  "Is the price negotiable?",
  "What's nearby this property?",
  "How do I book a site visit?",
];

export default function AskDiscoverWidget({ property }) {
  const [open,     setOpen]     = useState(false);
  const [input,    setInput]    = useState("");
  const [messages, setMessages] = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [visible,  setVisible]  = useState(false);
  const chatIdRef = useRef(genChatId(property?.id));
  const bottomRef = useRef(null);
  const inputRef  = useRef(null);

  // Breathing: expand left → hold → collapse → wait → repeat
  const [expanded, setExpanded] = useState(false);
  const timerRef  = useRef(null);

  useEffect(() => {
    setVisible(true); // show the circle immediately
    if (open) { setExpanded(false); return; }
    const cycle = () => {
      setExpanded(true);
      timerRef.current = setTimeout(() => {
        setExpanded(false);
        timerRef.current = setTimeout(cycle, 3500);
      }, 4000);
    };
    timerRef.current = setTimeout(cycle, 1800);
    return () => clearTimeout(timerRef.current);
  }, [open]);

  // Scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Focus input when opened
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 400);
  }, [open]);

  const sendMessage = useCallback(async (text) => {
    const q = (text || input).trim();
    if (!q || loading) return;
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: q }]);
    setLoading(true);
    try {
      const reply = await askGemini(
        q,
        chatIdRef.current,
        buildSystemPrompt(property)
      );
      setMessages(prev => [...prev, { role: "assistant", content: reply }]);
    } catch {
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "Having trouble connecting right now. Please try again in a moment.",
      }]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, property]);

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const widget = (
    <>
      {/* ── Trigger: circle RIGHT, pill expands LEFT ── */}
      {!open && (
        <div
          className={`ask-pill-trigger ${visible ? "ask-pill-visible" : ""}`}
          onClick={() => setOpen(true)}
        >
          {/* Pill slides out to the LEFT from the circle */}
          <div className={`ask-pill-text-wrap ${expanded ? "ask-pill-expanded" : ""}`}>
            <span className="ask-pill-label">Ask. Discover. Invest...</span>
          </div>

          {/* Robot circle — fixed on right */}
          <div className="ask-pill-robot-wrap">
            <img src={ROBOT_IMG} alt="AI" className="ask-pill-robot" />
            <span className="ask-online-dot" />
          </div>
        </div>
      )}

      {/* ── Chat panel ── */}
      <div className={`ask-chat-panel ${open ? "ask-chat-open" : ""}`}>
        {/* Header */}
        <div className="ask-chat-header">
          <img src={ROBOT_IMG} alt="AI" className="ask-chat-header-robot" />
          <div>
            <div className="ask-chat-title">Ask. Discover. Invest.</div>
            <div className="ask-chat-sub">
              {property?.title?.split(" ").slice(0, 5).join(" ")}…
            </div>
          </div>
          <button className="ask-chat-close" onClick={() => setOpen(false)}>✕</button>
        </div>

        {/* Messages */}
        <div className="ask-chat-messages">
          {messages.length === 0 && (
            <div className="ask-chat-welcome">
              <div className="ask-chat-welcome-text">
                👋 Hi! I know everything about this property. Ask me anything!
              </div>
              <div className="ask-chat-suggestions">
                {SUGGESTIONS.map(s => (
                  <button
                    key={s}
                    className="ask-chat-suggestion"
                    onClick={() => sendMessage(s)}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`ask-bubble-row ask-bubble-${msg.role}`}>
              {msg.role === "assistant" && (
                <img src={ROBOT_IMG} alt="AI" className="ask-bubble-avatar" />
              )}
              <div className="ask-bubble">{msg.content}</div>
            </div>
          ))}

          {loading && (
            <div className="ask-bubble-row ask-bubble-assistant">
              <img src={ROBOT_IMG} alt="AI" className="ask-bubble-avatar" />
              <div className="ask-bubble ask-typing-bubble">
                <span /><span /><span />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="ask-chat-input-row">
          <input
            ref={inputRef}
            className="ask-chat-input"
            placeholder="Ask anything about this property…"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            disabled={loading}
          />
          <button
            className="ask-chat-send"
            onClick={() => sendMessage()}
            disabled={!input.trim() || loading}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5"
              strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"/>
              <polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Backdrop */}
      {open && <div className="ask-backdrop" onClick={() => setOpen(false)} />}
    </>
  );

  return createPortal(widget, document.body);
}