import React, { useState, useEffect, useRef } from "react";
import SuggestionChips from "./SuggestionChips";
import AiPropertyCard from "./AiPropertyCard";

export default function AiChatBox({ chat, sendMessage }) {
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat?.messages?.length]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [chat?.id]);

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

    try {
      await sendMessage(question);
    } catch (error) {
      console.error("Send message failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="ai-chat-area">
      <div className="chat-messages">

        {chat?.messages?.map((msg, index) => {
          const role = msg.role === "user" ? "user" : "ai";

          return (
            <div
              key={msg.id || `${role}-${index}`}
              className={`chat-message ${role}`}
            >
              <div className={`bubble ${role}`}>
                {msg.text}
              </div>

              {/* 🔥 THIS BLOCK WAS PROBABLY MISSING */}
              {role === "ai" &&
                msg.hasResults === true &&
                msg.properties &&
                msg.properties.length > 0 && (
                  <div className="ai-property-results">
                    {msg.properties.map((property) => (
                      <AiPropertyCard
                        key={property.id}
                        property={property}
                      />
                    ))}
                  </div>
                )}
            </div>
          );
        })}

        {isLoading && (
          <div className="chat-message ai">
            <div className="typing-indicator">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {chat?.messages?.length === 0 && (
        <SuggestionChips onSelect={(value) => handleSend(value)} />
      )}

      <div className="input-bar">
        <div className="input-bar-inner">
          <input
            ref={inputRef}
            placeholder="Ask anything about properties..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
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
    </div>
  );
}