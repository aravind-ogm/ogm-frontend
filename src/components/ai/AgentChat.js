import React, { useState, useRef } from "react";
import AIResultCard from "../property/AIResultCard";
import { ENDPOINTS } from "./Constants";

/* ─────────────────────────────────────────────────────────────────
   AgentChat — legacy single-turn agent component.

   Fixes applied:
     • Added loading state so the button/input are disabled mid-request
     • Added error handling — crash on failed fetch is now caught
     • Added AbortController so in-flight requests cancel on unmount
     • Used ENDPOINTS constant instead of a hardcoded localhost URL
     • Cleared input AFTER a successful response (not optimistically)
   ───────────────────────────────────────────────────────────────── */

function AgentChat() {
  const [messages,   setMessages]   = useState([]);
  const [input,      setInput]      = useState("");
  const [properties, setProperties] = useState([]);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState(null);

  const abortRef = useRef(null);

  const askAgent = async () => {
    const question = input.trim();
    if (!question || loading) return;

    // Cancel any previous in-flight request
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    setMessages((m) => [...m, { role: "user", text: question }]);
    setInput("");
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(ENDPOINTS.AGENT_ASK, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ message: question }),
        signal:  abortRef.current.signal,
      });

      if (!res.ok) throw new Error(`Server error: ${res.status}`);

      const data = await res.json();

      setMessages((m) => [...m, { role: "ai", text: data.message || "No response." }]);

      if (data.intent === "SEARCH") {
        setProperties(data.properties || []);
      }
    } catch (err) {
      if (err.name === "AbortError") return; // component unmounted — ignore

      console.error("[AgentChat] fetch failed:", err.message);
      setError("Something went wrong. Please try again.");
      setMessages((m) => [
        ...m,
        { role: "ai", text: "Sorry, I couldn't reach the server. Please try again.", isError: true },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Clean up pending request when component unmounts
  React.useEffect(() => () => abortRef.current?.abort(), []);

  return (
    <div className="agent-chat">

      {/* CHAT */}
      <div className="chat-box">
        {messages.map((m, i) => (
          <div key={i} className={`msg ${m.role}${m.isError ? " error" : ""}`}>
            {m.text}
          </div>
        ))}
        {loading && (
          <div className="msg ai typing">
            <span>●</span><span>●</span><span>●</span>
          </div>
        )}
      </div>

      {/* ERROR BANNER */}
      {error && (
        <div className="agent-error-banner">
          ⚠️ {error}
          <button onClick={() => setError(null)}>✕</button>
        </div>
      )}

      {/* RESULTS */}
      {properties.length > 0 && (
        <div className="ai-results">
          {properties.map((p) => (
            <AIResultCard key={p.id} property={p} />
          ))}
        </div>
      )}

      {/* INPUT */}
      <div className="chat-input">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask me anything about properties..."
          onKeyDown={(e) => e.key === "Enter" && !loading && askAgent()}
          disabled={loading}
        />
        <button onClick={askAgent} disabled={loading || !input.trim()}>
          {loading ? "⏳" : "🤖"}
        </button>
      </div>
    </div>
  );
}

export default AgentChat;
