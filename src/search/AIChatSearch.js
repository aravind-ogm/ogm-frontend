import React, { useState } from "react";
import "./SearchBar.css";

function AIChatSearch({ onResults }) {
    const [input, setInput] = useState("");
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(false);

    const sendMessage = async () => {
        if (!input.trim()) return;

        const userMessage = {
            role: "user",
            content: input
        };

        const newMessages = [...messages, userMessage];
        setMessages(newMessages);
        setLoading(true);
        setInput("");

        try {
            const res = await fetch("http://localhost:8080/api/ai/chat", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    messages: newMessages
                })
            });

            const data = await res.json();

            // 🔹 Update chat
            setMessages([
                ...newMessages,
                {
                    role: "assistant",
                    content: data.reply
                }
            ]);

            // 🔹 Update properties on screen
            if (Array.isArray(data.properties)) {
                onResults(data.properties);
            }

        } catch (err) {
            console.error("AI chat failed", err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="search-pill ai">
            <div className="pill-content">
                <label className="pill-title">Ask AI Property Agent</label>
                <input
                    className="pill-input"
                    placeholder="Ask anything… (show cheaper, only villas)"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                />
            </div>

            <button className="pill-btn ai" onClick={sendMessage}>
                {loading ? "…" : "🤖"}
            </button>
        </div>
    );
}

export default AIChatSearch;
