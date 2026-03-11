import React, {
  useState,
  useEffect,
  useRef,
  useMemo
} from "react";
import { useLocation } from "react-router-dom";
import AiChatBox from "./AiChatBox";
import AiSidebar from "./AiSidebar";

import "../../styles/ai/ai.css";
export default function AiSearchPage() {
  const location = useLocation();
  const initialQuestion = location.state?.question;

  const [chats, setChats] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);

  const hasSentInitial = useRef(false);

  /* ========================= */
  /* CREATE NEW CHAT */
  /* ========================= */

  const createNewChat = () => {
    const newChat = {
      id: crypto.randomUUID(),
      title: "New Chat",
      messages: []
    };

    setChats((prev) => [newChat, ...prev]);
    setActiveChatId(newChat.id);
  };

  /* ========================= */
  /* APPEND MESSAGE */
  /* ========================= */

  const appendMessage = (chatId, message) => {
    setChats((prev) =>
      prev.map((chat) =>
        chat.id === chatId
          ? {
              ...chat,
              messages: [...chat.messages, message]
            }
          : chat
      )
    );
  };

  /* ========================= */
  /* ACTIVE CHAT */
  /* ========================= */

  const activeChat = useMemo(
    () => chats.find((c) => c.id === activeChatId),
    [chats, activeChatId]
  );

  /* ========================= */
  /* AUTO CREATE FIRST CHAT */
  /* ========================= */

  useEffect(() => {
    if (!activeChatId) {
      createNewChat();
    }
    // eslint-disable-next-line
  }, []);

  /* ========================= */
  /* AUTO SEND INITIAL QUESTION */
  /* ========================= */

  useEffect(() => {
    if (
      initialQuestion &&
      activeChatId &&
      !hasSentInitial.current
    ) {
      hasSentInitial.current = true;
      sendMessage(initialQuestion);
    }
    // eslint-disable-next-line
  }, [initialQuestion, activeChatId]);

  /* ========================= */
  /* SEND MESSAGE */
  /* ========================= */
const sendMessage = async (questionText) => {

  if (!questionText || !activeChatId) return;

  const currentChatId = activeChatId;

  // Add user message immediately
  appendMessage(currentChatId, {
    id: crypto.randomUUID(),
    role: "user",
    text: questionText
  });

  // 🔹 Update chat title if it is still "New Chat"
  setChats((prev) =>
    prev.map((chat) =>
      chat.id === currentChatId && chat.title === "New Chat"
        ? {
            ...chat,
            title: questionText.split(" ").slice(0,5).join(" ")
          }
        : chat
    )
  );

  try {
    const response = await fetch(
      "http://localhost:8080/api/ai/ask",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: questionText })
      }
    );

    const data = await response.json();

    appendMessage(currentChatId, {
      id: crypto.randomUUID(),
      role: "ai",
      text:
        data.message ||
        data.summary ||
        data.reply ||
        "No response received.",
      hasResults: data.hasResults || false,
      properties: data.properties || []
    });

  } catch (error) {

    appendMessage(currentChatId, {
      id: crypto.randomUUID(),
      role: "ai",
      text: "Something went wrong. Please try again.",
      hasResults: false,
      properties: []
    });

  }
};

  /* ========================= */
  /* RENDER */
  /* ========================= */

  return (
    <div className="ai-layout">
      <AiSidebar
        chats={chats}
        activeChatId={activeChatId}
        setActiveChatId={setActiveChatId}
        createNewChat={createNewChat}
      />

      <div className="ai-results-full">
        <AiChatBox
          chat={activeChat}
          sendMessage={sendMessage}
        />
      </div>
    </div>
  );
}