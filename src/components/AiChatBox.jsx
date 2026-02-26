import React, { useState, useEffect, useRef } from "react";

export default function AiChatBox({ chat, sendMessage }) {
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // 🔹 Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat?.messages]);

  if (!chat) {
    return (
      <div className="ai-chat-area empty-chat">
        <div className="welcome-state">
          <h2>Ask AI Property Agent</h2>
          <p>Search, compare and discover properties with AI</p>
        </div>
      </div>
    );
  }

  const handleSend = async (overrideText) => {
    const question = overrideText || input;
    if (!question.trim() || isLoading) return;

    setIsLoading(true);
    setInput("");

    await sendMessage(question);

    setIsLoading(false);
  };

  return (
    <div className="ai-chat-area">

      {/* ===================== */}
      {/* MESSAGES */}
      {/* ===================== */}

      <div className="chat-messages">
        {chat.messages.map((msg, index) => (
          <div
            key={index}
            className={`bubble ${msg.role === "user" ? "user" : "ai"}`}
          >
            {msg.text
                .replace(/\*\*/g, "")
                .replace(/\n/g, "\n\n")}
         </div>
        ))}


         {/* 👇 ADD THIS HERE */}
          {isLoading && (
            <div className="typing-indicator">
              <div className="typing-dots">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          )}

        <div ref={messagesEndRef} />
      </div>

      {/* ===================== */}
      {/* SUGGESTION CHIPS */}
      {/* ===================== */}

      {chat.messages.length === 0 && (
        <div className="suggestion-row">
          <span className="chip" onClick={() => handleSend("2 BHK in Whitefield")}>
            2 BHK Whitefield
          </span>
          <span className="chip" onClick={() => handleSend("Villa under 1 crore")}>
            Villa under 1 Cr
          </span>
          <span className="chip" onClick={() => handleSend("3 BHK near metro")}>
            3 BHK near metro
          </span>
        </div>
      )}

      {/* ===================== */}
      {/* INPUT BAR */}
      {/* ===================== */}

      <div className="input-bar">
        <input
          placeholder="Ask anything about properties..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          disabled={isLoading}
        />

        <button
          onClick={() => handleSend()}
          disabled={!input.trim() || isLoading}
        >
          {isLoading ? "..." : "Send"}
        </button>
      </div>

    </div>
  );
}