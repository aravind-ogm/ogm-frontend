import React, { useState, useMemo } from "react";
import { FiPlus, FiSearch, FiMoreHorizontal } from "react-icons/fi";

export default function AiSidebar({
  chats = [],
  activeChatId = null,
  setActiveChatId = () => {},
  createNewChat = () => {}
}) {
  const [search, setSearch] = useState("");
  const [collapsed, setCollapsed] = useState(false);

  const normalizedSearch = search.toLowerCase();

  const filteredChats = useMemo(() => {
    return chats.filter(chat =>
      chat.title?.toLowerCase().includes(normalizedSearch)
    );
  }, [chats, normalizedSearch]);

  return (
    <aside className={`ai-sidebar ${collapsed ? "collapsed" : ""}`}>

      <div className="sidebar-top">

        <div className="brand-row">
          <div className="brand-logo"></div>
          {!collapsed && <span className="brand-text">OGM AI</span>}

          <button
            className="collapse-btn"
            onClick={() => setCollapsed(prev => !prev)}
          >
            {collapsed ? "→" : "←"}
          </button>
        </div>

        {!collapsed && (
          <>
            <button
              className="primary-btn"
              onClick={createNewChat}
            >
              <FiPlus />
              <span>New Chat</span>
            </button>

            <div className="search-box">
              <FiSearch className="search-icon" />
              <input
                placeholder="Search chats..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </>
        )}

      </div>

      <div className="chat-list">
        {filteredChats.length === 0 && !collapsed && (
          <div className="empty-state">
            No conversations found
          </div>
        )}

        {filteredChats.map(chat => (
          <div
            key={chat.id}
            className={`chat-row ${
              chat.id === activeChatId ? "active" : ""
            }`}
            onClick={() => !collapsed && setActiveChatId(chat.id)}
          >
            {!collapsed && (
              <>
                <span className="chat-title">
                  {chat.title?.trim()
                    ? chat.title
                    : "Untitled Chat"}
                </span>

                <FiMoreHorizontal className="chat-menu" />
              </>
            )}
          </div>
        ))}
      </div>

      {!collapsed && (
        <div className="sidebar-footer">
          <div className="user-avatar">A</div>
          <div className="user-info">
            <div className="user-name">Aravind</div>
            <div className="user-role">Premium Plan</div>
          </div>
        </div>
      )}
    </aside>
  );
}