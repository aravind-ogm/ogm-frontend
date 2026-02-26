import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import AiSidebar from "../components/AiSidebar";
import AiChatBox from "../components/AiChatBox";
import "../styles/ai.css";

export default function AiSearchPage() {

  const location = useLocation();
  const initialQuestion = location.state?.question;

  const [chats, setChats] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);

  // 🔹 Create new chat
  const createNewChat = () => {
    const newChat = {
      id: Date.now(),
      title: "New Chat",
      messages: []
    };

    setChats(prev => [newChat, ...prev]);
    setActiveChatId(newChat.id);
  };

  // 🔹 Update chat messages
  const updateChatMessages = (chatId, messages) => {
    setChats(prev =>
      prev.map(chat =>
        chat.id === chatId ? { ...chat, messages } : chat
      )
    );
  };

  const activeChat = chats.find(c => c.id === activeChatId);

  // 🔹 Auto create chat if none exists
  useEffect(() => {
    if (!activeChatId) {
      createNewChat();
    }
  }, []);

  // 🔹 Auto send question from homepage
  useEffect(() => {
    if (initialQuestion && activeChatId) {
      sendMessage(initialQuestion);
    }
    // eslint-disable-next-line
  }, [initialQuestion, activeChatId]);

  // 🔹 AI Call Function
  const sendMessage = async (questionText) => {
    if (!questionText || !activeChatId) return;

    const currentChat = chats.find(c => c.id === activeChatId);
    const newMessages = [
      ...currentChat.messages,
      { role: "user", text: questionText }
    ];

    updateChatMessages(activeChatId, newMessages);

    try {
      const response = await fetch("http://localhost:8080/api/ai/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: questionText })
      });

      const data = await response.json();

      updateChatMessages(activeChatId, [
        ...newMessages,
        {
          role: "ai",
          text: data.summary || data.reply || "No response."
        }
      ]);

    } catch (error) {
      updateChatMessages(activeChatId, [
        ...newMessages,
        {
          role: "ai",
          text: "Something went wrong. Please try again."
        }
      ]);
    }
  };

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