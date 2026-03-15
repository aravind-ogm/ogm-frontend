import React, { useState, useMemo } from "react";
import Icon from "./Icon";
import "../../styles/ai/ai-sidebar.css";

export default function AiSidebar({
  chats = [],
  activeChatId = null,
  setActiveChatId = () => {},
  createNewChat = () => {},
  deleteChat = () => {},
  collapsed = false,
}) {
  const [search, setSearch] = useState("");

  /* ── Filter chats ── */
  const filteredChats = useMemo(() => {
    const term = search.toLowerCase().trim();
    if (!term) return chats;
    return chats.filter((c) => c.title?.toLowerCase().includes(term));
  }, [chats, search]);

  if (collapsed) return null;

  return (
    <aside className={`ai-sidebar ${collapsed ? "collapsed" : ""}`}>
      {/* HEADER */}
      <div className="sidebar-header">
        <div className="sidebar-brand">
          <div className="sidebar-brand-icon">
            <Icon name="sparkle" size={16} />
          </div>
          <span className="sidebar-brand-text">OGM AI</span>
        </div>

        <button className="sidebar-new-chat" onClick={createNewChat}>
          <Icon name="plus" size={15} />
          New Chat
        </button>

        <div className="sidebar-search">
          <Icon name="search" size={14} className="sidebar-search-icon" />
          <input
            type="text"
            placeholder="Search chats…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* CHAT LIST */}
      <div className="sidebar-chat-list">
        {filteredChats.length === 0 && (
          <div className="sidebar-empty">
            {search ? "No matches found" : "No conversations yet"}
          </div>
        )}

        {filteredChats.map((chat) => {
          const isActive = chat.id === activeChatId;
          const title = chat.title?.trim() || "Untitled Chat";

          return (
            <div
              key={chat.id}
              className={`sidebar-chat-item ${isActive ? "active" : ""}`}
              onClick={() => setActiveChatId(chat.id)}
            >
              <Icon name="chat" size={15} className="sidebar-chat-icon" />
              <span className="sidebar-chat-title">{title}</span>

              <div className="sidebar-chat-actions">
                <button
                  className="sidebar-action-btn danger"
                  title="Delete chat"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteChat(chat.id);
                  }}
                >
                  <Icon name="trash" size={14} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* FOOTER */}
      <div className="sidebar-footer">
        <div className="sidebar-avatar">A</div>
        <div className="sidebar-user-info">
          <div className="sidebar-user-name">Aravind Reddy</div>
          <div className="sidebar-user-role">Premium Plan</div>
        </div>
      </div>
    </aside>
  );
}