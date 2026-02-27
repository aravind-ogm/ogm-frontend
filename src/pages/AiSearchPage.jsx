import React, {
  useState,
  useEffect,
  useRef,
  useMemo
} from "react";
import { useLocation } from "react-router-dom";
import AiSidebar from "../components/AiSidebar";
import AiChatBox from "../components/AiChatBox";
import "../styles/ai.css";

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
  /* APPEND MESSAGE SAFELY */
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
  /* ACTIVE CHAT (MEMOIZED) */
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
  /* AUTO SEND INITIAL QUESTION (SAFE) */
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
  /* AI CALL FUNCTION */
  /* ========================= */

  const sendMessage = async (questionText) => {
    if (!questionText || !activeChatId) return;

    const currentChatId = activeChatId;

    // Add user message
    appendMessage(currentChatId, {
      id: crypto.randomUUID(),
      role: "user",
      text: questionText
    });

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
          data.summary ||
          data.reply ||
          "No response received."
      });

    } catch (error) {
      appendMessage(currentChatId, {
        id: crypto.randomUUID(),
        role: "ai",
        text:
          "Something went wrong. Please try again."
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

      <AiChatBox
        chat={activeChat}
        sendMessage={sendMessage}
      />
    </div>
  );
}