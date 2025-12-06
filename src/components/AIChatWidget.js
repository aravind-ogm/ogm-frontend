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

  const scrollBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollBottom();
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = input;
    setInput("");

    setMessages((prev) => [...prev, { from: "user", text: userMessage }]);

    try {
      const res = await fetch("http://localhost:8080/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            ...messages,
            { from: "user", text: userMessage }
          ]
        })
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
        { from: "ai", text: "⚠️ Sorry, something went wrong talking to AI." }
      ]);
    }
  };

  return (
    <>
      {/* Floating AI Chat Button */}
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

          <div className="chat-input-area">
            <input
              type="text"
              placeholder="Ask about properties…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            />
            <button onClick={sendMessage}>
              <Send size={20} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
