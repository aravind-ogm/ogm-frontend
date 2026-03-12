import React, { useState, useEffect, useRef, useCallback } from "react";
import Icon from "./Icon";
import AiMessage from "./AiMessage";
import SuggestionChips from "./SuggestionChips";
import "../../styles/ai/ai-chatbox.css";

export default function AiChatBox({ chat, loading = false, onSend, onEditMessage, onRetry, onCopy }) {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chat?.messages?.length, loading]);
  useEffect(() => { setTimeout(() => textareaRef.current?.focus(), 60); }, [chat?.id]);

  const handleInputChange = useCallback((e) => {
    setInput(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 140) + "px";
  }, []);

  const handleSend = useCallback((overrideText) => {
    const text = (overrideText || input).trim();
    if (!text || loading) return;
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    onSend?.(text);
  }, [input, loading, onSend]);

  const handleFollowUp = useCallback((suggestion) => {
    if (!loading) onSend?.(suggestion);
  }, [loading, onSend]);

  if (!chat) {
    return (
      <div className="ai-content">
        <div className="chat-empty-state">
          <div className="chat-empty-icon"><Icon name="sparkle" size={28} /></div>
          <h2>AI Property Agent</h2>
          <p>Search, compare, and discover properties. Ask anything to get started.</p>
        </div>
      </div>
    );
  }

  const messages = chat.messages || [];

  return (
    <div className="ai-content">
      <div className="chat-messages-area">
        {messages.length === 0 && !loading ? (
          <div className="chat-empty-state">
            <div className="chat-empty-icon"><Icon name="sparkle" size={28} /></div>
            <h2>What can I help you find?</h2>
            <p>Search for properties, compare listings, or ask anything about real estate.</p>
            <SuggestionChips onSelect={(val) => handleSend(val)} />
          </div>
        ) : (
          <div className="chat-messages-container">
            {messages.map((msg, i) => (
              <AiMessage key={msg.id || `msg-${i}`} msg={msg} chatId={chat.id} index={i}
                onEdit={onEditMessage} onRetry={onRetry} onCopy={onCopy} onFollowUp={handleFollowUp} />
            ))}
            {loading && (
              <div className="message-row ai">
                <div className="typing-indicator">
                  <div className="typing-dot" /><div className="typing-dot" /><div className="typing-dot" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      <div className="chat-input-bar">
        <div className="chat-input-wrapper">
          <textarea ref={textareaRef} rows={1} value={input} onChange={handleInputChange}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder="Ask anything - find, compare, and locate best suitable properties" disabled={loading} />
          <button className="chat-send-btn" onClick={() => handleSend()} disabled={!input.trim() || loading}>
            <Icon name="send" size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}