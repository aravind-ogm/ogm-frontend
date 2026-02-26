import React from "react";

export default function AiMessage({ type, text }) {
  return (
    <div className={`chat-message ${type}`}>
      <div className="bubble">
        {text}
      </div>
    </div>
  );
}