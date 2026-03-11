import React, { useState, useMemo, useCallback } from "react";
import { FiPlus, FiSearch, FiMoreHorizontal } from "react-icons/fi";
import "../../styles/ai/ai-sidebar.css";
export default function AiSidebar({
  chats = [],
  activeChatId = null,
  setActiveChatId = () => {},
  createNewChat = () => {}
}) {
  const [search, setSearch] = useState("");
  const [collapsed, setCollapsed] = useState(false);

  // --- Logic ---
  const filteredChats = useMemo(() => {
    const term = search.toLowerCase();
    return chats.filter((chat) => chat.title?.toLowerCase().includes(term));
  }, [chats, search]);

  const toggleSidebar = useCallback((e) => {
    e.stopPropagation();
    setCollapsed((prev) => !prev);
  }, []);

  const handleChatClick = (chatId) => {
    if (!collapsed) setActiveChatId(chatId);
  };

  // --- Sub-components (Internal) ---
  const SidebarHeader = () => (
    <div className="sidebar-top">
      <div className="brand-row">
        <div className="brand-logo" />
        {!collapsed && <span className="brand-text">OGM AI</span>}
        <button
          className="collapse-btn"
          onClick={toggleSidebar}
          aria-label="Toggle Sidebar"
        >
          {collapsed ? "→" : "←"}
        </button>
      </div>

      {!collapsed && (
        <>
          <button className="primary-btn" onClick={createNewChat}>
            <FiPlus />
            <span>New Chat</span>
          </button>
          <div className="search-box">
            <FiSearch className="search-icon" />
            <input
              type="text"
              placeholder="Search chats..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </>
      )}
    </div>
  );

  const ChatList = () => (
    <div className="chat-list">
      {filteredChats.length === 0 && !collapsed && (
        <div className="empty-state">No conversations found</div>
      )}

      {filteredChats.map((chat) => {
        const isActive = chat.id === activeChatId;
        const title = chat.title?.trim() || "Untitled Chat";

        return (
          <div
            key={chat.id}
            className={`chat-row ${isActive ? "active" : ""}`}
            onClick={() => handleChatClick(chat.id)}
          >
            {!collapsed && (
              <>
                <span className="chat-title">{title}</span>
                <FiMoreHorizontal className="chat-menu" />
              </>
            )}
          </div>
        );
      })}
    </div>
  );

  const SidebarFooter = () => (
    !collapsed && (
      <div className="sidebar-footer">
        <div className="user-avatar">A</div>
        <div className="user-info">
          <div className="user-name">Aravind Reddy</div>
          <div className="user-role">Premium Plan</div>
        </div>
      </div>
    )
  );

  return (
    <aside className={`ai-sidebar ${collapsed ? "collapsed" : ""}`}>
      <SidebarHeader />
      <ChatList />
      <SidebarFooter />
    </aside>
  );
}