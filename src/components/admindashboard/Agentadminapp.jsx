/**
 * =============================================================
 * AGENT ADMIN DASHBOARD — AgentAdminApp.jsx
 * Production-ready React component
 * =============================================================
 * BACKEND ENDPOINTS (Spring Boot — com.ogm.market.live):
 *   GET  /api/live-tour/availability/{propertyId}
 *   POST /api/live-tour/join-queue
 *   POST /api/live-tour/start-session
 *   POST /api/live-tour/end-session/{sessionId}
 *
 * AGENT-SPECIFIC ENDPOINTS (add to your backend):
 *   GET  /api/agent/profile          → { id, name, role, email }
 *   PUT  /api/agent/availability     → { online, busy }
 *   GET  /api/agent/calls?filter=today|yesterday|week
 *   GET  /api/agent/upcoming?week=ISO_DATE
 *   GET  /api/agent/schedule?week=ISO_DATE
 *   PUT  /api/agent/schedule/{date}  → { startTime, endTime }
 *
 * WEBSOCKET (STOMP):
 *   /topic/queue/{propertyId}        → live queue updates
 *   /topic/incoming/{agentId}        → incoming call events
 *
 * HOW TO USE:
 *   import AgentAdminApp from './AgentAdminApp';
 *   // Wrap with your router / auth context if needed
 *   <AgentAdminApp />
 * =============================================================
 */

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from 'react';
import './AgentAdmin.css';

/* ─────────────────────────────────────────────────────────────
   CONFIGURATION
   ───────────────────────────────────────────────────────────── */
const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:8080';
const WS_BASE  = process.env.REACT_APP_WS_BASE  || 'ws://localhost:8080';

/* ─────────────────────────────────────────────────────────────
   MOCK DATA  (replace with real API calls)
   ───────────────────────────────────────────────────────────── */
const MOCK_CALLS = [
  { id: 1, name: 'John Carter',    initials: 'JC', property: 'Oceanview Apartments', status: 'completed', duration: '12:32 min', notes: 'Interested in 2BHK, budget 80L', time: '2:27 PM',  online: true  },
  { id: 2, name: 'Sarah Miller',   initials: 'SM', property: 'Greenwood Villas',     status: 'completed', duration: '56:45 min', notes: 'High Interest, follow-up required', time: '1:50 PM',  online: true  },
  { id: 3, name: 'Alex Johnson',   initials: 'AJ', property: 'Maplewood Estates',   status: 'missed',    duration: '–',         notes: "Didn't answer the call",         time: '12:15 PM', online: false },
  { id: 4, name: 'Emily Davis',    initials: 'ED', property: 'Sunset Heights',       status: 'cancelled', duration: '–',         notes: 'Client cancelled last minute',   time: '10:10 AM', online: false },
  { id: 5, name: 'William Taylor', initials: 'WT', property: 'Lakeside Residences', status: 'completed', duration: '9:20 min',  notes: 'Discussed 2BHK options',        time: '9:25 AM',  online: true  },
  { id: 6, name: 'Linda Brooks',   initials: 'LB', property: 'Harbor View',         status: 'completed', duration: '7:28 min',  notes: 'Planning a visit this weekend', time: '8:50 AM',  online: true  },
  { id: 7, name: 'Ravi Sharma',    initials: 'RS', property: 'Prestige Tower',      status: 'ongoing',   duration: '–',         notes: '3BHK corner unit query',        time: 'Now',      online: true  },
];

const MOCK_UPCOMING = [
  { id: 1, time: '10:30 AM', name: 'John Carter',    initials: 'JC', property: 'Oceanview Apartments', note: 'Wants 2BHK walkthrough',        nextIn: 15 },
  { id: 2, time: '1:00 PM',  name: 'Sarah Miller',   initials: 'SM', property: 'Greenwood Villas',     note: 'Discuss property pricing',      nextIn: null },
  { id: 3, time: '2:30 PM',  name: 'Alex Johnson',   initials: 'AJ', property: 'Maplewood Estates',   note: 'Review lease agreement details',nextIn: null },
  { id: 4, time: '4:00 PM',  name: 'Emily Davis',    initials: 'ED', property: 'Sunset Heights',       note: 'Questions about HOA regulations',nextIn: null },
  { id: 5, time: '9:15 AM',  name: 'William Taylor', initials: 'WT', property: 'Lakeside Residences', note: 'Marketing strategy discussion', nextIn: null },
  { id: 6, time: '11:00 AM', name: 'Linda Brooks',   initials: 'LB', property: 'Harbor View',         note: 'Finalize contract paperwork',   nextIn: null },
];

const DAYS_OF_WEEK = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];

function buildWeekSchedule(weekOffset = 0) {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0=Sun
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((dayOfWeek + 6) % 7) + weekOffset * 7);

  return DAYS_OF_WEEK.map((day, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const isToday = d.toDateString() === today.toDateString();
    const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return {
      id: i,
      date: label,
      day,
      isToday,
      startTime: '9:00 AM',
      endTime:   '6:00 PM',
      status: i === 6 ? 'not-set' : (i === 3 ? 'unavailable' : 'available'),
    };
  });
}

const MOCK_INCOMING_CALL = {
  name: 'Emily Roberts',
  initials: 'ER',
  property: 'Harbor View',
  mobile: null,
  email: null,
};

/* ─────────────────────────────────────────────────────────────
   TINY ICON HELPERS  (inline SVGs — zero dependencies)
   ───────────────────────────────────────────────────────────── */
const Icon = {
  Dashboard: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
      <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
    </svg>
  ),
  CallHistory: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
    </svg>
  ),
  Availability: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  ),
  Settings: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  ),
  UpcomingCalls: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 17H2a3 3 0 0 0 3-3V9a7 7 0 0 1 14 0v5a3 3 0 0 0 3 3z"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>
    </svg>
  ),
  Phone: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.4 2 2 0 0 1 3.6 1.22h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 9a16 16 0 0 0 6.09 6.09l1.86-1.86a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
    </svg>
  ),
  Video: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
    </svg>
  ),
  VideoOff: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 16v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2m5.66 0H14a2 2 0 0 1 2 2v3.34l1 1L23 7v10"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  ),
  Mic: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
      <path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/>
      <line x1="8" y1="23" x2="16" y2="23"/>
    </svg>
  ),
  MicOff: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="1" y1="1" x2="23" y2="23"/>
      <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/>
      <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"/>
      <line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>
    </svg>
  ),
  Volume: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
    </svg>
  ),
  MessageSquare: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  ),
  Monitor: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/>
      <line x1="12" y1="17" x2="12" y2="21"/>
    </svg>
  ),
  PhoneOff: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-3.33-2.67m-2.67-3.34a19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91"/>
      <line x1="23" y1="1" x2="1" y2="23"/>
    </svg>
  ),
  Search: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  ),
  ChevLeft: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6"/>
    </svg>
  ),
  ChevRight: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6"/>
    </svg>
  ),
  Calendar: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  ),
  Plus: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  ),
  Check: () => (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  ),
  X: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  ),
  ChevDown: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9"/>
    </svg>
  ),
  Mail: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
      <polyline points="22,6 12,13 2,6"/>
    </svg>
  ),
  PhoneIcon: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.4 2 2 0 0 1 3.6 1.22h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 9a16 16 0 0 0 6.09 6.09l1.86-1.86a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
    </svg>
  ),
  Send: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
    </svg>
  ),
  Bell: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
      <path d="M13.73 21a2 2 0 0 1-3.46 0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
  Eye: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
    </svg>
  ),
  EyeOff: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  ),
  Lock: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
    </svg>
  ),
  GearPerson: () => (
    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="10" cy="8" r="4"/>
      <path d="M2 20c0-4 3.6-7 8-7"/>
      <circle cx="18" cy="17" r="3"/>
      <path d="M18 14v-1m0 7v-1m-3-3h-1m7 0h-1m-1.5-2.5-.7-.7m-1.6 4.4-.7-.7m4.4-1.6.7.7m-4.4 1.6.7.7"/>
    </svg>
  ),
};

/* ─────────────────────────────────────────────────────────────
   UTILITY: initials avatar color
   ───────────────────────────────────────────────────────────── */
const AVATAR_COLORS = [
  { bg: '#dbeafe', fg: '#2563eb' },
  { bg: '#dcfce7', fg: '#16a34a' },
  { bg: '#fce7f3', fg: '#be185d' },
  { bg: '#ede9fe', fg: '#7c3aed' },
  { bg: '#ffedd5', fg: '#ea580c' },
  { bg: '#cffafe', fg: '#0891b2' },
];
function avatarColor(initials) {
  const i = (initials.charCodeAt(0) + (initials.charCodeAt(1) || 0)) % AVATAR_COLORS.length;
  return AVATAR_COLORS[i];
}

/* ─────────────────────────────────────────────────────────────
   COMPONENT: AvatarCircle
   ───────────────────────────────────────────────────────────── */
function AvatarCircle({ initials, size = 42, online = false, busy = false }) {
  const { bg, fg } = avatarColor(initials);
  const dotClass = online ? 'online' : busy ? 'busy' : 'offline';
  return (
    <div className="call-avatar-wrap">
      <div
        className="avatar-circle"
        style={{ width: size, height: size, background: bg, color: fg, fontSize: size * 0.35 }}
      >
        {initials}
      </div>
      <span className={`avatar-status-dot ${dotClass}`} />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   COMPONENT: LoginPage
   ───────────────────────────────────────────────────────────── */
function LoginPage({ onLogin }) {
  const [email, setEmail]     = useState('');
  const [password, setPass]   = useState('');
  const [showPass, setShowP]  = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const handleSubmit = async () => {
    setError('');
    if (!email || !password) { setError('Please fill in all fields.'); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/agent/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) throw new Error('Invalid credentials');
      const data = await res.json();
      localStorage.setItem('agent_token', data.token);
      onLogin(data); // data = { agentId, name, email, phone, designation, token }
    } catch {
      setError('Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-root">
      <div className="login-blob login-blob-tl" />
      <div className="login-blob login-blob-tr" />
      <div className="login-blob login-blob-bl" />
      <div className="login-blob login-blob-br" />

      <div className="login-card">
        <div className="login-icon"><Icon.GearPerson /></div>
        <h1 className="login-title">Admin Login</h1>

        <div className="login-form-card">
          {error && (
            <div className="login-error">
              <Icon.X />
              {error}
            </div>
          )}

          <div className="login-input-group">
            <div className="login-input-wrap">
              <span className="login-input-icon"><Icon.Mail /></span>
              <input
                className="login-input"
                type="email"
                placeholder="Email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              />
            </div>
          </div>

          <div className="login-input-group">
            <div className="login-input-wrap">
              <span className="login-input-icon"><Icon.Lock /></span>
              <input
                className="login-input"
                type={showPass ? 'text' : 'password'}
                placeholder="Password"
                value={password}
                onChange={e => setPass(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              />
              <button className="login-eye" onClick={() => setShowP(p => !p)} type="button">
                {showPass ? <Icon.EyeOff /> : <Icon.Eye />}
              </button>
            </div>
          </div>

          <button className="login-btn" onClick={handleSubmit} disabled={loading}>
            {loading ? <><span className="login-spinner" />Logging in…</> : 'Login'}
          </button>

          <button className="login-forgot" type="button">Forgot password?</button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   COMPONENT: Sidebar
   ───────────────────────────────────────────────────────────── */
const NAV_ITEMS = [
  { id: 'dashboard',      label: 'Dashboard',     icon: 'Dashboard'     },
  { id: 'call-history',   label: 'Call History',  icon: 'CallHistory'   },
  { id: 'availability',   label: 'Availability',  icon: 'Availability'  },
  { id: 'settings',       label: 'Settings',      icon: 'Settings'      },
  { id: 'upcoming-calls', label: 'Upcoming Calls',icon: 'UpcomingCalls' },
];

function Sidebar({ active, onNav, onLogout }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon"><Icon.GearPerson /></div>
      </div>

      <nav className="sidebar-nav">
        {NAV_ITEMS.map(item => {
          const IconComp = Icon[item.icon];
          return (
            <button
              key={item.id}
              className={`sidebar-item${active === item.id ? ' active' : ''}`}
              onClick={() => onNav(item.id)}
            >
              <span className="sidebar-icon"><IconComp /></span>
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="sidebar-divider" />
      <div className="sidebar-bottom">
        <button
          className={`sidebar-item${active === 'settings' ? ' active' : ''}`}
          onClick={() => onNav('settings')}
        >
          <span className="sidebar-icon"><Icon.Settings /></span>
          <span>Settings</span>
        </button>

        <button className="sidebar-logout-btn" onClick={onLogout}>
          <span className="sidebar-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
          </span>
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}

/* ─────────────────────────────────────────────────────────────
   COMPONENT: AvailabilityToggle
   ───────────────────────────────────────────────────────────── */
function AvailabilityToggle({ available, onToggle }) {
  return (
    <div className="avail-toggle-wrap">
      <span>{available ? 'Available' : 'Offline'}</span>
      <div
        className={`toggle-track-outer ${available ? 'on' : 'off'}`}
        onClick={onToggle}
        role="switch"
        aria-checked={available}
        tabIndex={0}
        onKeyDown={e => e.key === 'Enter' && onToggle()}
      >
        <div className="toggle-thumb-circle" />
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   COMPONENT: FilterTabs
   ───────────────────────────────────────────────────────────── */
function FilterTabs({ tabs, active, onChange }) {
  return (
    <div className="filter-tabs">
      {tabs.map(tab => (
        <button
          key={tab}
          className={`filter-tab${active === tab ? ' active' : ''}`}
          onClick={() => onChange(tab)}
        >
          {tab}
        </button>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   COMPONENT: SearchBar
   ───────────────────────────────────────────────────────────── */
function SearchBar({ value, onChange, placeholder = 'Search…' }) {
  return (
    <div className="search-wrap">
      <span className="search-icon"><Icon.Search /></span>
      <input
        className="search-input"
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
      />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   COMPONENT: IncomingCallModal
   ───────────────────────────────────────────────────────────── */
function IncomingCallModal({ caller, onAccept, onDecline }) {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setSeconds(s => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const fmt = s => `${String(Math.floor(s / 60)).padStart(2,'0')}:${String(s % 60).padStart(2,'0')}`;
  const { bg, fg } = avatarColor(caller.initials);

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onDecline()}>
      <div className="incoming-call-card">
        <button className="close-modal-btn" onClick={onDecline}><Icon.X /></button>

        <div className="incoming-label">
          <Icon.Video />
          Incoming Video Call
        </div>

        <div className="caller-avatar-wrap">
          <div className="caller-ring" />
          <div className="caller-ring2" />
          <div className="caller-avatar-circle" style={{ background: bg, color: fg }}>
            {caller.initials}
          </div>
        </div>

        <div className="caller-name">{caller.name}</div>
        <div className="caller-property">{caller.property}</div>

        <div className="call-timer-display">
          <div className="timer-dots">
            <div className="timer-dot" />
            <div className="timer-dot" />
            <div className="timer-dot" />
          </div>
          <span className="timer-text">{fmt(seconds)}</span>
          <div className="timer-dots">
            <div className="timer-dot" />
            <div className="timer-dot" />
            <div className="timer-dot" />
          </div>
        </div>

        <div className="call-action-btns">
          <button className="btn-decline" onClick={onDecline}>
            <Icon.PhoneOff />
            Decline
          </button>
          <button className="btn-accept" onClick={onAccept}>
            <Icon.Video />
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   COMPONENT: CallRow
   ───────────────────────────────────────────────────────────── */
function CallRow({ call }) {
  return (
    <div className="call-row">
      <AvatarCircle initials={call.initials} online={call.online} />
      <div className="call-info">
        <div className="call-name">{call.name}</div>
        <div className="call-property">{call.property}</div>
      </div>
      <div className={`status-badge ${call.status}`}>
        <span className="status-dot" />
        {call.status === 'completed' ? 'Completed'
          : call.status === 'missed' ? 'Missed'
          : call.status === 'ongoing' ? 'In Progress'
          : 'Cancelled'}
      </div>
      <div className="call-duration">{call.duration}</div>
      <div className="call-notes">{call.notes || '—'}</div>
      <div className="call-time">{call.time}</div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   PAGE: Dashboard
   ───────────────────────────────────────────────────────────── */
function DashboardPage({ agent, available, onToggleAvailable, onIncomingAccept, showIncoming, agentId }) {
  const [filter, setFilter] = useState('Today');
  const [search, setSearch]  = useState('');

  const stats                              = useAgentStats(agentId);
  const { calls: allCalls, loading: callsLoading } = useCallHistory(agentId);

  const calls = useMemo(() => {
    const source = allCalls.length > 0 ? allCalls : MOCK_CALLS;
    if (!search) return source;
    const q = search.toLowerCase();
    return source.filter(c =>
      c.name.toLowerCase().includes(q) || c.property.toLowerCase().includes(q)
    );
  }, [search, allCalls]);

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title"><span>Agent</span> Dashboard</h1>
        <AvailabilityToggle available={available} onToggle={onToggleAvailable} />
      </div>

      <div className="dashboard-grid">
        {/* LEFT — call list */}
        <div>
          <div className="toolbar">
            <FilterTabs tabs={['Today','Yesterday','Last 7 days']} active={filter} onChange={setFilter} />
            <SearchBar value={search} onChange={setSearch} placeholder="Search name or property" />
          </div>

          <div className="content-card">
            <div className="table-header">
              <div style={{ flex: 1 }}>Name</div>
              <div style={{ minWidth: 105 }}>Status</div>
              <div style={{ minWidth: 85 }}>Duration</div>
              <div style={{ flex: 1, maxWidth: 175 }}>Notes</div>
              <div style={{ minWidth: 65, textAlign: 'right' }}>Time</div>
            </div>
            {callsLoading
              ? <div style={{ padding: '32px', textAlign: 'center', color: 'var(--gray-400)', fontFamily: 'var(--font-ui)', fontSize: 14 }}>Loading calls…</div>
              : calls.length === 0
              ? <div style={{ padding: '32px', textAlign: 'center', color: 'var(--gray-400)', fontFamily: 'var(--font-ui)', fontSize: 14 }}>No calls found</div>
              : calls.map(call => <CallRow key={call.id} call={call} />)
            }
          </div>
        </div>

        {/* RIGHT — agent profile */}
        <div>
          <div className="agent-profile-card">
            <div className="agent-profile-title">
              Agent profile
              <button style={{ background:'none',border:'none',cursor:'pointer',color:'var(--gray-400)',display:'flex' }}>
                <Icon.Settings />
              </button>
            </div>
            <div className="agent-profile-info">
              <div className="agent-avatar-lg">{agent.name.split(' ').map(w=>w[0]).join('')}</div>
              <div>
                <div className="agent-name">{agent.name}</div>
                <div className="agent-role">{agent.designation || agent.role || 'Agent'}</div>
                <div className={`agent-status-badge ${available ? 'available' : 'busy'}`}>
                  <span style={{ width:8,height:8,borderRadius:'50%',background: available ? 'var(--green-500)' : 'var(--orange-500)',display:'inline-block' }} />
                  {available ? 'Available' : 'Offline'}
                </div>
              </div>
            </div>

            <div className="stats-row">
              <div className="stat-box">
                <div className="stat-value">{stats.total ?? 0}</div>
                <div className="stat-label">Total Calls</div>
              </div>
              <div className="stat-box">
                <div className="stat-value">{stats.completed ?? 0}</div>
                <div className="stat-label">Completed</div>
              </div>
              <div className="stat-box">
                <div className="stat-value">{stats.active ?? 0}</div>
                <div className="stat-label">Active</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   PAGE: Call History
   ───────────────────────────────────────────────────────────── */
function CallHistoryPage() {
  const [filter, setFilter] = useState('Today');
  const [search, setSearch]  = useState('');

  const calls = useMemo(() => {
    if (!search) return MOCK_CALLS;
    const q = search.toLowerCase();
    return MOCK_CALLS.filter(c =>
      c.name.toLowerCase().includes(q) || c.property.toLowerCase().includes(q)
    );
  }, [search]);

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Call History</h1>
      </div>

      <div className="ch-toolbar">
        <FilterTabs tabs={['Today','Yesterday','Last 7 days']} active={filter} onChange={setFilter} />
        <SearchBar value={search} onChange={setSearch} placeholder="Search name or property" />
      </div>

      <div className="content-card">
        <div className="table-header">
          <div style={{ flex: 1 }}>Name</div>
          <div style={{ minWidth: 105 }}>Status</div>
          <div style={{ minWidth: 85 }}>Duration</div>
          <div style={{ flex: 1, maxWidth: 175 }}>Notes</div>
          <div style={{ minWidth: 65, textAlign: 'right' }}>Time</div>
        </div>
        {calls.map(call => <CallRow key={call.id} call={call} />)}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   PAGE: Availability
   ───────────────────────────────────────────────────────────── */
function AvailabilityPage() {
  const [weekOffset, setWeekOffset] = useState(0);
  const [schedule, setSchedule]     = useState(() => buildWeekSchedule(0));
  const [editRow, setEditRow]        = useState(null); // index of row being edited
  const [popupStart, setPopupStart] = useState('9:00 AM');
  const [popupEnd,   setPopupEnd]   = useState('6:00 PM');

  useEffect(() => {
    setSchedule(buildWeekSchedule(weekOffset));
    setEditRow(null);
  }, [weekOffset]);

  const weekLabel = useMemo(() => {
    const arr = buildWeekSchedule(weekOffset);
    return `${arr[0].date} – ${arr[6].date}, ${new Date().getFullYear()}`;
  }, [weekOffset]);

  function openEdit(idx) {
    setPopupStart(schedule[idx].startTime);
    setPopupEnd(schedule[idx].endTime);
    setEditRow(idx);
  }

  function saveEdit() {
    setSchedule(s => s.map((row, i) =>
      i === editRow
        ? { ...row, startTime: popupStart, endTime: popupEnd, status: 'available' }
        : row
    ));
    setEditRow(null);
  }

  function clearEdit() {
    setSchedule(s => s.map((row, i) =>
      i === editRow ? { ...row, status: 'not-set' } : row
    ));
    setEditRow(null);
  }

  const TIMES = [
    '6:00 AM','7:00 AM','8:00 AM','9:00 AM','10:00 AM','11:00 AM',
    '12:00 PM','1:00 PM','2:00 PM','3:00 PM','4:00 PM','5:00 PM',
    '6:00 PM','7:00 PM','8:00 PM','9:00 PM',
  ];

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Availability</h1>
        <button className="apply-all-btn">Apply to all <Icon.ChevDown /></button>
      </div>

      <div className="content-card" onClick={() => setEditRow(null)}>
        {/* Header row */}
        <div className="avail-header-row" onClick={e => e.stopPropagation()}>
          <div className="week-nav">
            <button className="week-nav-btn" onClick={() => setWeekOffset(o => o - 1)}><Icon.ChevLeft /></button>
            <button className="week-nav-btn" onClick={() => setWeekOffset(o => o - 1)}><Icon.ChevLeft /></button>
            <span className="week-label">{weekLabel}</span>
            <button className="week-nav-btn" onClick={() => setWeekOffset(o => o + 1)}><Icon.ChevRight /></button>
            <button className="week-nav-btn" style={{ border: '1.5px solid var(--gray-200)', background: 'white', width:30, height:30, borderRadius:8, display:'flex',alignItems:'center',justifyContent:'center', cursor:'pointer' }}><Icon.Calendar /></button>
          </div>
          <div className="default-hours-text">Default Hours: 9:00 AM – 6:00 PM</div>
        </div>

        {/* Legend */}
        <div className="avail-legend">
          <div className="legend-item"><span className="legend-dot green" /> Available</div>
          <div className="legend-item"><span className="legend-dot red"   /> Unavailable</div>
          <div className="legend-item"><span className="legend-dot gray"  /> Not Set</div>
        </div>

        {/* Rows */}
        {schedule.map((row, idx) => (
          <div
            key={row.id}
            className="avail-row"
            style={row.isToday ? { background: 'rgba(37,99,235,0.03)' } : {}}
            onClick={e => e.stopPropagation()}
          >
            <div className="avail-date-col">
              <div className={`avail-date${row.isToday ? ' today-date' : ''}`}>{row.date}</div>
              {row.isToday && <span className="today-pill">Today</span>}
            </div>

            <div className="avail-day-col">{row.day}</div>

            <div className="avail-slot-col avail-popup-anchor">
              <div
                className={`time-slot-pill ${row.status}`}
                onClick={() => openEdit(idx)}
              >
                <span>{row.startTime}</span>
                <span className="arrow-divider">→</span>
                <span>{row.endTime}</span>
                {row.status === 'available' && (
                  <span className="slot-check-icon green"><Icon.Check /></span>
                )}
                {row.status === 'not-set' && (
                  <span className="slot-check-icon gray-c" style={{ fontSize: 13, fontWeight: 600 }}>·</span>
                )}
              </div>

              {row.status === 'available' && (
                <button className="add-break-btn">
                  <Icon.Plus /> Add Break
                </button>
              )}

              {editRow === idx && (
                <div className="edit-avail-popup" onClick={e => e.stopPropagation()}>
                  <div className="edit-popup-title">
                    Edit Availability – {row.day.slice(0,3)}, {row.date}
                    <button className="close-popup-btn" onClick={() => setEditRow(null)}><Icon.X /></button>
                  </div>
                  <div className="avail-from-label">Available from</div>
                  <div className="time-select-row">
                    <select className="time-select" value={popupStart} onChange={e => setPopupStart(e.target.value)}>
                      {TIMES.map(t => <option key={t}>{t}</option>)}
                    </select>
                    <span className="time-arrow">→</span>
                    <select className="time-select" value={popupEnd} onChange={e => setPopupEnd(e.target.value)}>
                      {TIMES.map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="popup-actions">
                    <button className="btn-popup-clear" onClick={clearEdit}>Clear</button>
                    <button className="btn-popup-cancel" onClick={() => setEditRow(null)}>Cancel</button>
                    <button className="btn-popup-save" onClick={saveEdit}>Save</button>
                  </div>
                </div>
              )}
            </div>

            <button className="more-dots-btn">···</button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   PAGE: Upcoming Calls
   ───────────────────────────────────────────────────────────── */
function UpcomingCallsPage({ onJoinCall, agentId }) {
  const [weekOffset, setWeekOffset] = useState(0);
  const [calls, setCalls]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [showModal, setShowModal]   = useState(false);

  const weekLabel = useMemo(() => {
    const arr = buildWeekSchedule(weekOffset);
    return `${arr[0].date} – ${arr[6].date}`;
  }, [weekOffset]);

  // ── Fetch real upcoming calls ──
  const fetchCalls = useCallback(async () => {
    if (!agentId) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/agent/upcoming?agentId=${agentId}`);
      const data = await res.json();
      setCalls(data);
    } catch {
      setCalls(MOCK_UPCOMING.map(u => ({
        id: u.id,
        customerName: u.name,
        propertyTitle: u.property,
        note: u.note,
        scheduledAtFormatted: u.time,
        minutesUntil: u.nextIn,
        status: 'UPCOMING',
      })));
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  useEffect(() => { fetchCalls(); }, [fetchCalls]);

  // ── Cancel call ──
  const handleCancel = async (id) => {
    await fetch(`${API_BASE}/api/agent/upcoming/${id}/cancel`, { method: 'PUT' });
    setCalls(prev => prev.filter(c => c.id !== id));
  };

  const upNext = calls.find(c => c.minutesUntil > 0 && c.minutesUntil <= 30);

  return (
    <div className="page">
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h1 className="page-title">Upcoming Calls</h1>
        <button
          onClick={() => setShowModal(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: 7,
            padding: '9px 18px', borderRadius: 10, border: 'none',
            background: 'var(--blue-600)', color: '#fff',
            fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 700,
            cursor: 'pointer', boxShadow: '0 2px 10px rgba(11,99,229,0.3)',
          }}
        >
          <Icon.Plus /> Schedule Call
        </button>
      </div>

      <div className="content-card">
        {/* Week nav */}
        <div className="avail-header-row" style={{ padding: '12px 22px' }}>
          <div className="week-nav">
            <button className="week-nav-btn" onClick={() => setWeekOffset(o => o - 1)}><Icon.ChevLeft /></button>
            <span className="week-label">{weekLabel}</span>
            <button className="week-nav-btn" onClick={() => setWeekOffset(o => o + 1)}><Icon.ChevRight /></button>
          </div>
          <span style={{ fontSize: 13, color: 'var(--gray-400)', fontFamily: 'var(--font-body)' }}>
            {calls.length} scheduled
          </span>
        </div>

        {/* Up next banner */}
        {upNext && (
          <div className="up-next-banner">
            <Icon.Bell />
            Up Next in {upNext.minutesUntil} mins — {upNext.customerName}
          </div>
        )}

        {/* Rows */}
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--gray-400)', fontFamily: 'var(--font-body)' }}>
            Loading…
          </div>
        ) : calls.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--gray-400)', fontFamily: 'var(--font-body)' }}>
            No upcoming calls. Click "Schedule Call" to add one.
          </div>
        ) : calls.map(item => {
          const initials = (item.customerName || '??').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
          const isNext   = item.minutesUntil > 0 && item.minutesUntil <= 30;
          const { bg, fg } = avatarColor(initials);
          return (
            <div key={item.id} className={`upcoming-row${isNext ? ' highlighted' : ''}`}>
              <div className="upcoming-time-col">{item.scheduledAtFormatted}</div>

              <div className="call-avatar-wrap" style={{ marginRight: 12 }}>
                <div className="avatar-circle"
                  style={{ width: 42, height: 42, background: bg, color: fg, fontSize: 15, fontFamily: 'var(--font-ui)', fontWeight: 700 }}>
                  {initials}
                </div>
                <span className="avatar-status-dot online" />
              </div>

              <div className="upcoming-info-col">
                <div className="upcoming-name">{item.customerName}</div>
                <div className="upcoming-property">{item.propertyTitle}</div>
                {item.note && <div className="upcoming-note">{item.note}</div>}
                {item.source && (
                  <span style={{
                    fontSize: 10.5, fontWeight: 700, padding: '2px 8px',
                    borderRadius: 20, marginTop: 4, display: 'inline-block',
                    background: item.source === 'CUSTOMER_BOOKING' ? '#eff6ff' : item.source === 'QUEUE_JOIN' ? '#f0fdf4' : '#fdf4ff',
                    color: item.source === 'CUSTOMER_BOOKING' ? '#0b63e5' : item.source === 'QUEUE_JOIN' ? '#15803d' : '#7c3aed',
                  }}>
                    {item.source === 'CUSTOMER_BOOKING' ? '🌐 Customer Booking'
                     : item.source === 'QUEUE_JOIN' ? '⚡ Queue Join'
                     : '✏️ Agent Scheduled'}
                  </span>
                )}
              </div>

              <div className="upcoming-actions">
                <button className="btn-join" onClick={() => onJoinCall({
                  name: item.customerName,
                  initials,
                  property: item.propertyTitle,
                  mobile: item.customerMobile,
                  email: item.customerEmail,
                })}>Join</button>
                <button
                  className="btn-reschedule"
                  onClick={() => handleCancel(item.id)}
                  style={{ color: '#ef4444', borderColor: '#fecaca' }}
                >Cancel</button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Schedule Call Modal */}
      {showModal && (
        <ScheduleCallModal
          agentId={agentId}
          onClose={() => setShowModal(false)}
          onSaved={(newCall) => {
            setCalls(prev => [...prev, newCall].sort((a, b) =>
              new Date(a.scheduledAt) - new Date(b.scheduledAt)
            ));
            setShowModal(false);
          }}
        />
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   MODAL: Schedule Call (agent manual)
   ───────────────────────────────────────────────────────────── */
function ScheduleCallModal({ agentId, onClose, onSaved }) {
  const [form, setForm] = useState({
    customerName: '', customerMobile: '', customerEmail: '',
    propertyId: '', note: '', scheduledAt: '',
  });
  const [saving, setSaving]   = useState(false);
  const [error,  setError]    = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.customerName || !form.customerMobile || !form.scheduledAt) {
      setError('Name, mobile and date/time are required.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/api/agent/book-call`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId,
          propertyId: form.propertyId ? Number(form.propertyId) : null,
          customerName: form.customerName,
          customerMobile: form.customerMobile,
          note: form.note,
          scheduledAt: form.scheduledAt,
          source: 'AGENT_SCHEDULED',
        }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      onSaved(data);
    } catch {
      setError('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = {
    width: '100%', padding: '10px 14px', borderRadius: 8, boxSizing: 'border-box',
    border: '1.5px solid var(--gray-200)', fontFamily: 'var(--font-body)',
    fontSize: 14, outline: 'none', background: 'var(--gray-50)',
  };
  const labelStyle = {
    display: 'block', fontSize: 12, fontWeight: 700,
    color: 'var(--gray-500)', marginBottom: 5, fontFamily: 'var(--font-ui)',
    textTransform: 'uppercase', letterSpacing: '0.4px',
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
    }}
      onClick={onClose}
    >
      <div style={{
        background: '#fff', borderRadius: 18, padding: '28px 30px',
        width: '100%', maxWidth: 480, boxShadow: '0 24px 64px rgba(15,23,42,0.18)',
        animation: 'loginSlideIn 0.25s ease',
      }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
          <h2 style={{ margin: 0, fontFamily: 'var(--font-ui)', fontWeight: 800, fontSize: 18, color: 'var(--blue-950)' }}>
            Schedule a Call
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-400)' }}>
            <Icon.X />
          </button>
        </div>

        {error && (
          <div style={{ padding: '10px 14px', background: '#fee2e2', borderRadius: 8, fontSize: 13, color: '#dc2626', marginBottom: 16 }}>
            {error}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div>
            <label style={labelStyle}>Customer Name *</label>
            <input style={inputStyle} placeholder="Priya Kapoor"
              value={form.customerName} onChange={e => set('customerName', e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>Mobile *</label>
            <input style={inputStyle} placeholder="9876543210"
              value={form.customerMobile} onChange={e => set('customerMobile', e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>Email</label>
            <input style={inputStyle} placeholder="optional"
              value={form.customerEmail} onChange={e => set('customerEmail', e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>Property ID</label>
            <input style={inputStyle} placeholder="e.g. 1"
              value={form.propertyId} onChange={e => set('propertyId', e.target.value)} />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelStyle}>Date & Time *</label>
            <input style={inputStyle} type="datetime-local"
              value={form.scheduledAt} onChange={e => set('scheduledAt', e.target.value)} />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelStyle}>Note</label>
            <input style={inputStyle} placeholder="e.g. Wants 2BHK walkthrough"
              value={form.note} onChange={e => set('note', e.target.value)} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 22, justifyContent: 'flex-end' }}>
          <button onClick={onClose}
            style={{ padding: '10px 20px', borderRadius: 8, border: '1.5px solid var(--gray-200)', background: '#fff', fontFamily: 'var(--font-ui)', fontSize: 13, cursor: 'pointer' }}>
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving}
            style={{ padding: '10px 22px', borderRadius: 8, border: 'none', background: 'var(--blue-600)', color: '#fff', fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            {saving ? 'Saving…' : 'Save Call'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   PAGE: Settings
   ───────────────────────────────────────────────────────────── */
function SettingsPage({ agent, onAgentUpdate }) {
  const [notifs,   setNotifs]  = useState(true);
  const [sounds,   setSounds]  = useState(true);
  const [darkMode, setDark]    = useState(false);

  // Editable profile fields
  const [editField, setEditField] = useState(null); // 'name' | 'phone' | null
  const [nameVal,   setNameVal]   = useState(agent.name  || '');
  const [phoneVal,  setPhoneVal]  = useState(agent.phone || '');
  const [saving,    setSaving]    = useState(false);
  const [saveMsg,   setSaveMsg]   = useState('');

  const agentId = agent.agentId || agent.id;

  const handleSave = async (field) => {
    setSaving(true);
    setSaveMsg('');
    try {
      const body = {
        agentId,
        name:  field === 'name'  ? nameVal  : agent.name,
        phone: field === 'phone' ? phoneVal : agent.phone,
      };
      const res = await fetch(`${API_BASE}/api/agent/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error();
      onAgentUpdate?.({ ...agent, ...body }); // update parent state
      setSaveMsg('Saved ✓');
    } catch {
      setSaveMsg('Save failed. Try again.');
    } finally {
      setSaving(false);
      setEditField(null);
      setTimeout(() => setSaveMsg(''), 3000);
    }
  };

  const handleCancel = () => {
    setNameVal(agent.name   || '');
    setPhoneVal(agent.phone || '');
    setEditField(null);
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Settings</h1>
      </div>

      {/* ── Profile ── */}
      <div className="settings-section">
        <div className="settings-section-title">Profile</div>
        <div className="content-card">

          {saveMsg && (
            <div style={{
              padding: '10px 16px', marginBottom: 12,
              borderRadius: 8, fontSize: 13, fontFamily: 'var(--font-ui)',
              background: saveMsg.includes('✓') ? '#dcfce7' : '#fee2e2',
              color:      saveMsg.includes('✓') ? '#15803d' : '#dc2626',
            }}>
              {saveMsg}
            </div>
          )}

          {/* Name */}
          <div className="settings-row">
            <div style={{ flex: 1 }}>
              <div className="settings-row-label">Display Name</div>
              {editField === 'name' ? (
                <div style={{ display: 'flex', gap: 8, marginTop: 6, alignItems: 'center' }}>
                  <input
                    autoFocus
                    value={nameVal}
                    onChange={e => setNameVal(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleSave('name'); if (e.key === 'Escape') handleCancel(); }}
                    style={{ flex: 1, padding: '7px 12px', borderRadius: 8, border: '1.5px solid var(--blue-300)', fontFamily: 'var(--font-ui)', fontSize: 14, outline: 'none' }}
                  />
                  <button
                    onClick={() => handleSave('name')}
                    disabled={saving}
                    style={{ padding: '7px 14px', borderRadius: 8, border: 'none', background: 'var(--blue-600)', color: '#fff', fontFamily: 'var(--font-ui)', fontSize: 13, cursor: 'pointer', fontWeight: 600 }}
                  >{saving ? '…' : 'Save'}</button>
                  <button
                    onClick={handleCancel}
                    style={{ padding: '7px 12px', borderRadius: 8, border: '1.5px solid var(--gray-200)', background: '#fff', fontFamily: 'var(--font-ui)', fontSize: 13, cursor: 'pointer' }}
                  >Cancel</button>
                </div>
              ) : (
                <div className="settings-row-desc">{agent.name}</div>
              )}
            </div>
            {editField !== 'name' && (
              <button
                onClick={() => setEditField('name')}
                style={{ padding: '7px 16px', borderRadius: 8, border: '1.5px solid var(--gray-200)', background: 'white', fontFamily: 'var(--font-ui)', fontSize: 13, cursor: 'pointer' }}
              >Edit</button>
            )}
          </div>

          {/* Email — read only */}
          <div className="settings-row">
            <div>
              <div className="settings-row-label">Email</div>
              <div className="settings-row-desc">{agent.email}</div>
            </div>
          </div>

          {/* Phone */}
          <div className="settings-row">
            <div style={{ flex: 1 }}>
              <div className="settings-row-label">Phone</div>
              {editField === 'phone' ? (
                <div style={{ display: 'flex', gap: 8, marginTop: 6, alignItems: 'center' }}>
                  <input
                    autoFocus
                    value={phoneVal}
                    onChange={e => setPhoneVal(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleSave('phone'); if (e.key === 'Escape') handleCancel(); }}
                    style={{ flex: 1, padding: '7px 12px', borderRadius: 8, border: '1.5px solid var(--blue-300)', fontFamily: 'var(--font-ui)', fontSize: 14, outline: 'none' }}
                  />
                  <button
                    onClick={() => handleSave('phone')}
                    disabled={saving}
                    style={{ padding: '7px 14px', borderRadius: 8, border: 'none', background: 'var(--blue-600)', color: '#fff', fontFamily: 'var(--font-ui)', fontSize: 13, cursor: 'pointer', fontWeight: 600 }}
                  >{saving ? '…' : 'Save'}</button>
                  <button
                    onClick={handleCancel}
                    style={{ padding: '7px 12px', borderRadius: 8, border: '1.5px solid var(--gray-200)', background: '#fff', fontFamily: 'var(--font-ui)', fontSize: 13, cursor: 'pointer' }}
                  >Cancel</button>
                </div>
              ) : (
                <div className="settings-row-desc">{agent.phone || '—'}</div>
              )}
            </div>
            {editField !== 'phone' && (
              <button
                onClick={() => setEditField('phone')}
                style={{ padding: '7px 16px', borderRadius: 8, border: '1.5px solid var(--gray-200)', background: 'white', fontFamily: 'var(--font-ui)', fontSize: 13, cursor: 'pointer' }}
              >Edit</button>
            )}
          </div>

          {/* Designation — read only */}
          <div className="settings-row">
            <div>
              <div className="settings-row-label">Role</div>
              <div className="settings-row-desc">{agent.designation || '—'}</div>
            </div>
          </div>

        </div>
      </div>

      {/* ── Preferences ── */}
      <div className="settings-section">
        <div className="settings-section-title">Preferences</div>
        <div className="content-card">
          {[
            { label: 'Push Notifications', desc: 'Get alerts for incoming calls',  val: notifs,   set: setNotifs  },
            { label: 'Sound Alerts',        desc: 'Ring on incoming video call',    val: sounds,   set: setSounds  },
            { label: 'Dark Mode',           desc: 'Coming soon',                    val: darkMode, set: setDark    },
          ].map(row => (
            <div key={row.label} className="settings-row">
              <div>
                <div className="settings-row-label">{row.label}</div>
                <div className="settings-row-desc">{row.desc}</div>
              </div>
              <div
                className={`toggle-track-outer ${row.val ? 'on' : 'off'}`}
                style={{ cursor: 'pointer' }}
                onClick={() => row.set(v => !v)}
              >
                <div className="toggle-thumb-circle" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   PAGE: Video Call Screen
   ───────────────────────────────────────────────────────────── */
function VideoCallScreen({ caller, agent, property, onEnd }) {
  const [micOn,   setMicOn]   = useState(true);
  const [camOn,   setCamOn]   = useState(true);
  const [elapsed, setElapsed] = useState(0);
  const [chatMsg, setChatMsg] = useState('');
  const [messages, setMessages] = useState([]);

  const jitsiRef = useRef(null);
  const jitsiApi = useRef(null);

  // Timer
  useEffect(() => {
    const t = setInterval(() => setElapsed(s => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  // Jitsi
  useEffect(() => {
    const roomName = `ogm-live-tour-${caller.property.toLowerCase().replace(/\s+/g,'-')}-${Date.now()}`;
    const loadJitsi = () => {
      if (!jitsiRef.current) return;
      jitsiApi.current = new window.JitsiMeetExternalAPI('meet.jit.si', {
        roomName,
        parentNode: jitsiRef.current,
        width: '100%',
        height: '100%',
        userInfo: { displayName: agent.name },
        configOverwrite: {
          prejoinPageEnabled: false,
          prejoinConfig: { enabled: false },
          startWithAudioMuted: false,
          startWithVideoMuted: false,
          disableDeepLinking: true,
          enableClosePage: false,
          toolbarButtons: [
            'microphone','camera','desktop','chat',
            'raisehand','tileview','participants-pane','hangup',
          ],
        },
        interfaceConfigOverwrite: {
          SHOW_JITSI_WATERMARK: false,
          SHOW_BRAND_WATERMARK: false,
          SHOW_POWERED_BY: false,
          DISABLE_JOIN_LEAVE_NOTIFICATIONS: true,
          TOOLBAR_ALWAYS_VISIBLE: true,
          SHOW_CHROME_EXTENSION_BANNER: false,
          MOBILE_APP_PROMO: false,
          filmStripOnly: false,
        },
      });
    };

    if (!window.JitsiMeetExternalAPI) {
      const s = document.createElement('script');
      s.src = 'https://meet.jit.si/external_api.js';
      s.async = true;
      s.onload = loadJitsi;
      document.body.appendChild(s);
    } else {
      loadJitsi();
    }

    return () => { jitsiApi.current?.dispose(); };
  }, []);

  const fmtElapsed = s => {
    const m = Math.floor(s / 60), sec = s % 60;
    return `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
  };

  const sendMsg = () => {
    if (!chatMsg.trim()) return;
    const now = new Date();
    const time = now.toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'});
    setMessages(m => [...m, {
      id: Date.now(),
      author: agent.name.split(' ').map(w=>w[0]).join(''),
      name: agent.name,
      time,
      text: chatMsg.trim(),
    }]);
    setChatMsg('');
  };

  return (
    <div className="vc-screen">
      {/* Top Bar */}
      <div className="vc-topbar">
        <div className="vc-header-left" style={{ display:'flex', alignItems:'center', gap:14 }}>
          <div className="vc-brand-badge">
            <span className="vc-live-dot" />
            Live Property Tour
          </div>
          <div className="vc-status-text">
            <span style={{ width:8,height:8,borderRadius:'50%',background:'var(--green-500)',display:'inline-block' }} />
            Live Tour in Progress
          </div>
        </div>
        <div className="vc-topbar-right">
          <div className="vc-connected">
            <span style={{ width:8,height:8,borderRadius:'50%',background:'var(--green-500)',display:'inline-block' }} />
            Connected
          </div>
          <div className="vc-record">
            <span className="rec-dot" /> Record
          </div>
          <span className="vc-elapsed">{fmtElapsed(elapsed)}</span>
        </div>
      </div>

      {/* Body */}
      <div className="vc-body">
        {/* Video Main */}
        <div className="vc-video-main">
          <div className="vc-jitsi-container" ref={jitsiRef} />

          <div className="vc-room-label">{caller.property || 'Live Tour'}</div>

          <div className="vc-pip">
            <span>Your camera</span>
          </div>

          {/* Controls */}
          <div className="vc-controls-bar">
            <button
              className={`vc-ctrl-btn${!micOn ? ' active-off' : ''}`}
              onClick={() => { setMicOn(v=>!v); jitsiApi.current?.executeCommand('toggleAudio'); }}
              title={micOn ? 'Mute' : 'Unmute'}
            >
              {micOn ? <Icon.Mic /> : <Icon.MicOff />}
            </button>

            <button
              className={`vc-ctrl-btn${!camOn ? ' active-off' : ''}`}
              onClick={() => { setCamOn(v=>!v); jitsiApi.current?.executeCommand('toggleVideo'); }}
              title={camOn ? 'Stop camera' : 'Start camera'}
            >
              {camOn ? <Icon.Video /> : <Icon.VideoOff />}
            </button>

            <button className="vc-ctrl-btn" title="Speaker"><Icon.Volume /></button>
            <button className="vc-ctrl-btn" title="Chat"><Icon.MessageSquare /></button>
            <button className="vc-ctrl-btn" title="Screen share"><Icon.Monitor /></button>

            <div className="vc-sep" />

            <button className="vc-end-call-btn" onClick={onEnd} title="End call">
              <Icon.PhoneOff />
            </button>
          </div>
        </div>

        {/* Right Sidebar */}
        <aside className="vc-sidebar">
          {/* Property */}
          <div className="vc-prop-section">
            <div className="vc-prop-heading">Property Details</div>
            {property ? (
              <PropertyMiniCard property={property} compact />
            ) : (
              <>
                <div className="vc-prop-img">
                  <span style={{ fontSize:13, color:'var(--gray-400)' }}>Property image</span>
                </div>
                <div className="vc-prop-name">{caller.property}</div>
                <div className="vc-prop-price">—</div>
                <div className="vc-prop-meta">Details not available</div>
              </>
            )}
          </div>

          {/* Client */}
          <div className="vc-client-section">
            <div className="vc-client-name-row">
              <Icon.PhoneIcon />
              {caller.name}
            </div>
            {caller.mobile && (
              <div className="vc-contact-row"><Icon.PhoneIcon /> {caller.mobile}</div>
            )}
            {caller.email && (
              <div className="vc-contact-row"><Icon.Mail /> {caller.email}</div>
            )}
            {!caller.mobile && !caller.email && (
              <div className="vc-contact-row" style={{ color: 'var(--gray-400)', fontSize: 12 }}>
                No contact details available
              </div>
            )}
          </div>

          {/* Chat */}
          <div className="vc-chat-section">
            <div className="vc-chat-heading">Chat</div>
            <div className="vc-chat-messages">
              {messages.map(msg => (
                <div key={msg.id} className="chat-msg">
                  <div className="chat-avatar">{msg.author}</div>
                  <div className="chat-body">
                    <div className="chat-header">
                      <span className="chat-name">{msg.name}</span>
                      <span className="chat-time">{msg.time}</span>
                    </div>
                    <div className="chat-text">{msg.text}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="vc-chat-input-row">
              <input
                className="vc-chat-input"
                placeholder="Type a message…"
                value={chatMsg}
                onChange={e => setChatMsg(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendMsg()}
              />
              <button className="vc-send-btn" onClick={sendMsg}><Icon.Send /></button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   ROOT: AgentAdminApp
   ───────────────────────────────────────────────────────────── */
/* ─────────────────────────────────────────────────────────────
   HOOK: useAgentStats — fetches real call stats from backend
   ───────────────────────────────────────────────────────────── */
function useAgentStats(agentId) {
  const [stats, setStats] = useState({ total: 0, completed: 0, active: 0 });

  useEffect(() => {
    if (!agentId) return;
    fetch(`${API_BASE}/api/agent/stats?agentId=${agentId}`)
      .then(r => r.json())
      .then(data => setStats(data))
      .catch(() => {});
  }, [agentId]);

  return stats;
}

/* ─────────────────────────────────────────────────────────────
   HOOK: useCallHistory — fetches real call history from backend
   ───────────────────────────────────────────────────────────── */
function useCallHistory(agentId) {
  const [calls, setCalls]     = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!agentId) return;
    fetch(`${API_BASE}/api/agent/calls?agentId=${agentId}`)
      .then(r => r.json())
      .then(data => {
        // Map backend CallHistoryDto → shape used by CallRow
        const mapped = data.map(c => ({
          id:       c.sessionId,
          name:     c.customerName,
          initials: c.customerName?.split(' ').map(w => w[0]).join('').toUpperCase() || '??',
          property: c.propertyTitle || `Property #${c.propertyId}`,
          status:   c.status?.toLowerCase() === 'completed' ? 'completed'
                  : c.status?.toLowerCase() === 'active'    ? 'ongoing'
                  : 'missed',
          duration: c.durationFormatted || '–',
          notes:    '–',
          time:     c.startedAt
                    ? new Date(c.startedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
                    : '–',
          online:   c.status?.toLowerCase() === 'active',
        }));
        setCalls(mapped);
      })
      .catch(() => setCalls(MOCK_CALLS)) // fallback to mock if API fails
      .finally(() => setLoading(false));
  }, [agentId]);

  return { calls, loading };
}


function useProperties() {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/api/properties?page=0&size=50`)
      .then(r => r.json())
      .then(data => setProperties(data?.content || data || []))
      .catch(() => setProperties([]))
      .finally(() => setLoading(false));
  }, []);

  // Find a property by slug or title keyword
  const findProperty = useCallback((nameOrSlug) => {
    if (!nameOrSlug) return null;
    const q = nameOrSlug.toLowerCase();
    return properties.find(p =>
      p.slug?.toLowerCase().includes(q) ||
      p.title?.toLowerCase().includes(q)
    ) || null;
  }, [properties]);

  return { properties, loading, findProperty };
}

/* ─────────────────────────────────────────────────────────────
   COMPONENT: PropertyMiniCard — used in Dashboard + VideoCall
   ───────────────────────────────────────────────────────────── */
function PropertyMiniCard({ property, compact = false }) {
  if (!property) return null;

  const formatPrice = (price) => {
    const n = Number(price);
    if (!price || isNaN(n)) return 'Price on request';
    if (n >= 10_000_000) return `₹ ${(n / 10_000_000).toFixed(2)} Cr`;
    if (n >= 100_000)    return `₹ ${(n / 100_000).toFixed(2)} Lakhs`;
    return `₹ ${n.toLocaleString('en-IN')}`;
  };

  const img = property.mainImages?.[0] || property.images?.[0] || property.image;

  if (compact) {
    // Small inline version for VideoCall sidebar
    return (
      <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid #e2e8f0', marginBottom: 12 }}>
        {img && (
          <img
            src={img}
            alt={property.title}
            style={{ width: '100%', height: 130, objectFit: 'cover', display: 'block' }}
          />
        )}
        <div style={{ padding: '10px 12px' }}>
          <div style={{ fontWeight: 800, fontSize: 14, color: '#0f172a', marginBottom: 4, lineHeight: 1.3 }}>
            {property.title}
          </div>
          <div style={{ fontSize: 12, color: '#64748b', marginBottom: 6 }}>
            📍 {property.location}
          </div>
          <div style={{ fontWeight: 800, fontSize: 14, color: '#0b63e5' }}>
            {formatPrice(property.price)}
          </div>
          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 3 }}>
            {property.type} • {property.sqft} sqft
          </div>
        </div>
      </div>
    );
  }

  // Full card for Dashboard grid
  return (
    <a
      href={`/property/${property.slug}`}
      target="_blank"
      rel="noreferrer"
      style={{ textDecoration: 'none', color: 'inherit' }}
    >
      <div style={{
        borderRadius: 14,
        overflow: 'hidden',
        border: '1px solid #e2e8f0',
        background: '#fff',
        boxShadow: '0 2px 12px rgba(15,23,42,0.06)',
        transition: 'transform 0.18s, box-shadow 0.18s',
        cursor: 'pointer',
      }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 8px 28px rgba(15,23,42,0.12)'; }}
        onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 2px 12px rgba(15,23,42,0.06)'; }}
      >
        <div style={{ position: 'relative', height: 160, background: '#f1f5f9' }}>
          {img
            ? <img src={img} alt={property.title} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32 }}>🏠</div>
          }
          {property.reraApproved && (
            <span style={{ position: 'absolute', top: 8, left: 8, background: 'rgba(255,255,255,0.95)', padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>
              RERA Approved
            </span>
          )}
          {property.soldOut && (
            <span style={{ position: 'absolute', top: 8, right: 8, background: 'linear-gradient(135deg,#ff4d4d,#d90429)', color: '#fff', padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 800 }}>
              Sold Out
            </span>
          )}
        </div>
        <div style={{ padding: '12px 14px' }}>
          <div style={{ fontWeight: 800, fontSize: 14, color: '#0f172a', marginBottom: 4, lineHeight: 1.35,
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {property.title}
          </div>
          <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600, marginBottom: 6 }}>📍 {property.location}</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: 800, fontSize: 14, color: '#0b63e5' }}>{formatPrice(property.price)}</span>
            <span style={{ fontSize: 11, background: '#f1f5f9', color: '#334155', padding: '3px 8px', borderRadius: 20, fontWeight: 700 }}>{property.type}</span>
          </div>
          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>{property.sqft} sqft</div>
        </div>
      </div>
    </a>
  );
}

export default function AgentAdminApp() {
  const [agent,     setAgent]     = useState(null);
  const [page,      setPage]      = useState('dashboard');
  const [available, setAvailable] = useState(true);
  const [showIncoming, setShowIncoming] = useState(false);
  const [activeCaller,  setActiveCaller]  = useState(null);
  const [restoring, setRestoring] = useState(true); // ← prevent login flash
  const incomingTimer = useRef(null);

  // ── Restore session from localStorage on page refresh ──────────────
  useEffect(() => {
    const token   = localStorage.getItem('agent_token');
    const cached  = localStorage.getItem('agent_data');
    if (token && cached) {
      try {
        const agentData = JSON.parse(cached);
        // Re-validate token with backend
        fetch(`${API_BASE}/api/agent/profile?agentId=${agentData.agentId}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
          .then(r => r.ok ? r.json() : Promise.reject())
          .then(data => {
            setAgent({ ...data, token });
          })
          .catch(() => {
            // Token expired or invalid — clear and show login
            localStorage.removeItem('agent_token');
            localStorage.removeItem('agent_data');
          })
          .finally(() => setRestoring(false));
      } catch {
        setRestoring(false);
      }
    } else {
      setRestoring(false);
    }
  }, []);

  const [incomingCaller, setIncomingCaller] = useState(MOCK_INCOMING_CALL);

  const { properties, loading: propsLoading, findProperty } = useProperties();

  // Simulate incoming call after 5 seconds (replace with real WebSocket)
  useEffect(() => {
    if (!agent) return;
    incomingTimer.current = setTimeout(() => setShowIncoming(true), 5000);
    return () => clearTimeout(incomingTimer.current);
  }, [agent]);

  // --- Real WebSocket (STOMP) integration ---
  // useEffect(() => {
  //   if (!agent) return;
  //   const socket = new SockJS(`${API_BASE}/live-queue`);
  //   const stompClient = Stomp.over(socket);
  //   stompClient.connect({}, () => {
  //     stompClient.subscribe(`/topic/agent/${agent.agentId}/incoming-call`, (msg) => {
  //       const data = JSON.parse(msg.body);
  //       setIncomingCaller({
  //         name:     data.callerName,
  //         initials: data.callerName.split(' ').map(w=>w[0]).join('').toUpperCase(),
  //         property: data.propertyId?.toString(),
  //         mobile:   data.callerMobile,
  //         email:    null,
  //       });
  //       setShowIncoming(true);
  //     });
  //   });
  //   return () => stompClient.disconnect();
  // }, [agent]);

  const handleLogin = useCallback((agentData) => {
    localStorage.setItem('agent_token', agentData.token);
    localStorage.setItem('agent_data', JSON.stringify(agentData));
    setAgent(agentData);
    setPage('dashboard');
  }, []);

  const handleLogout = useCallback(() => {
    localStorage.removeItem('agent_token');
    localStorage.removeItem('agent_data');
    setAgent(null);
    setShowIncoming(false);
    setActiveCaller(null);
  }, []);

  const handleAcceptCall = useCallback(() => {
    setShowIncoming(false);
    setActiveCaller(incomingCaller);
  }, [incomingCaller]);

  const handleDeclineCall = useCallback(() => {
    setShowIncoming(false);
  }, []);

  const handleEndCall = useCallback(() => {
    setActiveCaller(null);
    // === REAL API ===
    // fetch(`${API_BASE}/api/live-tour/end-session/${sessionId}`, { method:'POST' })
  }, []);

  const handleAgentUpdate = useCallback((updated) => {
    setAgent(updated);
  }, []);

  const handleJoinFromUpcoming = useCallback((item) => {
    setActiveCaller({ name: item.name, initials: item.initials, property: item.property });
  }, []);

  const handleToggleAvailable = useCallback(() => {
    setAvailable(v => {
      const next = !v;
      // === REAL API ===
      // fetch(`${API_BASE}/api/agent/availability`, {
      //   method: 'PUT',
      //   headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      //   body: JSON.stringify({ online: next, busy: false }),
      // });
      return next;
    });
  }, []);

  /* ── RESTORING SESSION ── */
  if (restoring) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center',
        justifyContent: 'center', background: '#edf0f8',
      }}>
        <div style={{
          width: 44, height: 44,
          border: '3px solid rgba(59,130,246,0.2)',
          borderTopColor: '#3b82f6',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  /* ── NOT LOGGED IN ── */
  if (!agent) return <LoginPage onLogin={handleLogin} />;

  /* ── VIDEO CALL ACTIVE ── */
  if (activeCaller) {
    return (
      <VideoCallScreen
        caller={activeCaller}
        agent={agent}
        property={findProperty(activeCaller.property)}
        onEnd={handleEndCall}
      />
    );
  }

  /* ── MAIN DASHBOARD ── */
  const renderPage = () => {
    switch (page) {
      case 'dashboard':
        return (
          <DashboardPage
            agent={agent}
            available={available}
            onToggleAvailable={handleToggleAvailable}
            showIncoming={showIncoming}
            agentId={agent.agentId || agent.id}
          />
        );
      case 'call-history':   return <CallHistoryPage />;
      case 'availability':   return <AvailabilityPage />;
      case 'upcoming-calls': return <UpcomingCallsPage onJoinCall={handleJoinFromUpcoming} agentId={agent.agentId || agent.id} />;
      case 'settings':       return <SettingsPage agent={agent} onAgentUpdate={handleAgentUpdate} />;
      default:               return null;
    }
  };

  return (
    <>
      <div className="app-layout">
        <Sidebar active={page} onNav={setPage} onLogout={handleLogout} />
        <main className="main-content">
          {renderPage()}
        </main>
      </div>

      {/* Incoming call overlay */}
      {showIncoming && (
        <IncomingCallModal
          caller={incomingCaller}
          onAccept={handleAcceptCall}
          onDecline={handleDeclineCall}
        />
      )}
    </>
  );
}