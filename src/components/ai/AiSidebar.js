import React, { useState, useMemo } from "react";
import Icon from "./Icon";
import "../../styles/ai/ai-sidebar.css";

/**
 * Groups chats by date label — matches Image 2 sidebar exactly:
 * "22/03/2026" → list of chats under that date
 */
function getDateLabel(ts) {
    if (!ts) return "Earlier";
    const date  = new Date(ts);
    const now   = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const d     = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const diff  = Math.floor((today - d) / 86400000);

    if (diff === 0) return "Today";
    if (diff === 1) return "Yesterday";

    return date.toLocaleDateString("en-GB", {
        day:   "2-digit",
        month: "2-digit",
        year:  "numeric",
    });
}

export default function AiSidebar({
                                      chats = [],
                                      activeChatId = null,
                                      setActiveChatId = () => {},
                                      createNewChat = () => {},
                                      deleteChat = () => {},
                                      collapsed = false,
                                  }) {
    const [search, setSearch] = useState("");

    const filteredChats = useMemo(() => {
        const term = search.toLowerCase().trim();
        if (!term) return chats;
        return chats.filter((c) => c.title?.toLowerCase().includes(term));
    }, [chats, search]);

    // Group by date — matches Image 2 "22/03/2026" labels
    const groupedChats = useMemo(() => {
        const groups = {};
        filteredChats.forEach((chat) => {
            const label = getDateLabel(chat.createdAt);
            if (!groups[label]) groups[label] = [];
            groups[label].push(chat);
        });
        // Return as array of [label, chats[]] preserving insertion order
        return Object.entries(groups);
    }, [filteredChats]);

    if (collapsed) return null;

    return (
        <aside className="ai-sidebar">
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

            {/* CHAT LIST — grouped by date */}
            <div className="sidebar-chat-list">
                {filteredChats.length === 0 && (
                    <div className="sidebar-empty">
                        {search ? "No matches found" : "No conversations yet"}
                    </div>
                )}

                {groupedChats.map(([label, groupChats]) => (
                    <div key={label} className="sidebar-date-group">
                        {/* Date label — matches Image 2 "22/03/2026" */}
                        <div className="sidebar-section-label">{label}</div>

                        {groupChats.map((chat) => {
                            const isActive = chat.id === activeChatId;
                            const title    = chat.title?.trim() || "Untitled Chat";

                            return (
                                <div
                                    key={chat.id}
                                    className={`sidebar-chat-item ${isActive ? "active" : ""}`}
                                    onClick={() => setActiveChatId(chat.id)}
                                >
                                    <Icon name="chat" size={14} className="sidebar-chat-icon" />
                                    <span className="sidebar-chat-title">{title}</span>

                                    <div className="sidebar-chat-actions">
                                        <button
                                            className="sidebar-action-btn danger"
                                            title="Delete chat"
                                            onClick={(e) => { e.stopPropagation(); deleteChat(chat.id); }}
                                            aria-label="Delete chat"
                                        >
                                            <Icon name="trash" size={13} />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ))}
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