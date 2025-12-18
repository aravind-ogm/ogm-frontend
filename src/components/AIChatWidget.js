import React, { useState, useRef, useEffect } from "react";
import { Send, Bot, X } from "lucide-react";
import "./AIChatWidget.css";

export default function AIChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      from: "ai",
      text: "Hi! 👋 I'm your OGM Property Assistant. What are you looking for today?"
    }
  ]);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef(null);

  // Auto scroll to bottom
  const scrollBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  useEffect(() => {
    scrollBottom();
  }, [messages]);

  // ---------------- AI SEND MESSAGE ---------------- //
  const sendMessage = async (textOverride = null) => {
    const finalText = textOverride || input.trim();
    if (!finalText) return;

    // Clear input if user typed manually
    if (!textOverride) setInput("");

    // Add user's message to chat
    const updatedMessages = [...messages, { from: "user", text: finalText }];
    setMessages(updatedMessages);

    try {
      const res = await fetch("https://ogm-backend-clean.onrender.com/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: updatedMessages })
      });

      const data = await res.json();

      setMessages((prev) => [
        ...prev,
        { from: "ai", text: data.reply || "No response from AI." }
      ]);
    } catch (err) {
      console.error("AI chat error", err);

      setMessages((prev) => [
        ...prev,
        { from: "ai", text: "⚠️ Sorry, something went wrong contacting AI." }
      ]);
    }
  };

  // ---------------- HANDLE ASK AI EVENT ---------------- //
  useEffect(() => {
    const handleAskAI = (e) => {
      const query = e.detail; // text from search bar

      setOpen(true); // open widget

      if (query && query.trim() !== "") {
        sendMessage(query); // auto-send query to AI
      }
    };

    window.addEventListener("open-ai-widget", handleAskAI);

    return () => window.removeEventListener("open-ai-widget", handleAskAI);
  }, [messages]);

  return (
    <>
      {/* Floating Button */}
      {!open && (
        <div className="ai-chat-floating-btn" onClick={() => setOpen(true)}>
          <Bot size={26} color="#fff" />
        </div>
      )}

      {/* Chat Window */}
      {open && (
        <div className="chat-window">
          <div className="chat-header">
            <div className="chat-header-left">
              <Bot size={24} />
              <span>OGM Property Assistant</span>
            </div>
            <X className="close-icon" onClick={() => setOpen(false)} />
          </div>

          <div className="chat-body">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`chat-msg ${msg.from === "user" ? "user" : "ai"}`}
              >
                {msg.text}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* INPUT AREA */}
          <div className="chat-input-area">
            <input
              type="text"
              placeholder="Ask about properties…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            />
            <button onClick={() => sendMessage()}>
              <Send size={20} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
