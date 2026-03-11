import React from "react";

function AiMessage({
  role = "ai",
  text = ""
}) {
  const safeRole = role === "user" ? "user" : "ai";

  if (!text) return null;

  return (
    <div className={`chat-message ${safeRole}`}>
      <div className={`bubble ${safeRole}`}>
        {text}
      </div>
    </div>
  );
}

export default React.memo(AiMessage);