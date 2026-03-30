/**
 * ═══════════════════════════════════════════════════════════════
 *  AGENT ADMIN DASHBOARD — AgentAdminApp.jsx
 *  Production-ready · WebSocket-first · Zero mock data at runtime
 * ═══════════════════════════════════════════════════════════════
 *
 *  BACKEND ENDPOINTS  (Spring Boot — com.ogm.market.live)
 *  ────────────────────────────────────────────────────────────
 *  AUTH
 *    POST /api/agent/login              { email, password }
 *    GET  /api/agent/profile?agentId=   → LoginResponse
 *    PUT  /api/agent/profile            UpdateProfileRequest
 *
 *  DASHBOARD
 *    GET  /api/agent/calls?agentId=     → CallHistoryDto[]
 *    GET  /api/agent/stats?agentId=     → { total, completed, active }
 *
 *  AVAILABILITY
 *    PUT  /api/agent/availability       AvailabilityToggleRequest
 *    GET  /api/agent/schedule?agentId=  → AgentSchedule[]
 *    PUT  /api/agent/schedule?agentId=  ScheduleSlotDto[]
 *
 *  UPCOMING CALLS
 *    GET  /api/agent/upcoming?agentId=  → ScheduledCallDto[]
 *    POST /api/agent/book-call          BookCallRequest
 *    PUT  /api/agent/upcoming/{id}/cancel
 *    PUT  /api/agent/upcoming/{id}/complete
 *
 *  WEBSOCKET (STOMP over SockJS at /live-queue)
 *    /topic/agent/{agentId}/incoming-call
 *      payload: { callerName, callerMobile, propertyId, queuePosition }
 *
 *  USAGE
 *    import AgentAdminApp from './AgentAdminApp';
 *    <AgentAdminApp />
 * ═══════════════════════════════════════════════════════════════
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
   ENVIRONMENT CONFIG
   ───────────────────────────────────────────────────────────── */
const API_BASE    = process.env.REACT_APP_API_BASE   || '';  // Set REACT_APP_API_BASE in .env
const WS_BASE     = process.env.REACT_APP_WS_BASE    || '';   // Set REACT_APP_WS_BASE in .env
const JITSI_HOST  = process.env.REACT_APP_JITSI_HOST  || 'meet.jit.si';
/* JaaS — set REACT_APP_JAAS_APP_ID in .env to enable (free at jaas.8x8.vc) */
const JAAS_APP_ID = process.env.REACT_APP_JAAS_APP_ID || '';

/* Fetch JaaS JWT from backend — agent is always moderator */
async function fetchJaasToken(userName, roomName, isModerator = false) {
  try {
    const res = await fetch(`${API_BASE}/api/live-tour/jaas-token`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('agent_token') || ''}` },
      body:    JSON.stringify({ userName, roomName, moderator: String(isModerator) }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.token || null;
  } catch {
    return null;
  }
}

/* ─────────────────────────────────────────────────────────────
   TOKEN HELPERS  (centralise all auth header logic)
   ───────────────────────────────────────────────────────────── */
const getToken  = () => localStorage.getItem('agent_token') || '';
const authHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${getToken()}`,
});

/* ─────────────────────────────────────────────────────────────
   DATE / TIME UTILS
   ───────────────────────────────────────────────────────────── */
const DAYS_OF_WEEK = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];

function buildWeekSchedule(weekOffset = 0) {
  const today    = new Date();
  const dow      = today.getDay();              // 0 = Sun
  const monday   = new Date(today);
  monday.setDate(today.getDate() - ((dow + 6) % 7) + weekOffset * 7);

  return DAYS_OF_WEEK.map((day, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const isToday = d.toDateString() === today.toDateString();
    return {
      id: i, day, isToday,
      date:      d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      isoDate:   d.toISOString().slice(0, 10),
      startTime: '9:00 AM',
      endTime:   '6:00 PM',
      status:    'available',
    };
  });
}

function fmtDuration(seconds) {
  if (!seconds || seconds === 0) return '–';
  // Guard: backend stores milliseconds — divide if > 1 day in seconds
  const secs = seconds > 86400 ? Math.floor(seconds / 1000) : seconds;
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2,'0')}m`;
  if (m > 0) return `${m}m ${String(s).padStart(2,'0')}s`;
  return `${s}s`;
}

function fmtTime(isoString) {
  if (!isoString) return '–';
  try {
    return new Date(isoString).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  } catch { return '–'; }
}

/* ─────────────────────────────────────────────────────────────
   AVATAR COLOR  (deterministic from initials)
   ───────────────────────────────────────────────────────────── */
const AVATAR_PALETTE = [
  { bg: '#dbeafe', fg: '#2563eb' },
  { bg: '#dcfce7', fg: '#16a34a' },
  { bg: '#fce7f3', fg: '#be185d' },
  { bg: '#ede9fe', fg: '#7c3aed' },
  { bg: '#ffedd5', fg: '#ea580c' },
  { bg: '#cffafe', fg: '#0891b2' },
];
function avatarColor(initials = 'XX') {
  const idx = (initials.charCodeAt(0) + (initials.charCodeAt(1) || 0)) % AVATAR_PALETTE.length;
  return AVATAR_PALETTE[idx];
}
function toInitials(name = '') {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '??';
}

/* ─────────────────────────────────────────────────────────────
   INLINE SVG ICON LIBRARY  (zero external deps)
   ───────────────────────────────────────────────────────────── */
const Icon = {
  Dashboard:    () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>,
  CallHistory:  () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  Availability: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  Settings:     () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
  UpcomingCalls:() => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 17H2a3 3 0 0 0 3-3V9a7 7 0 0 1 14 0v5a3 3 0 0 0 3 3z"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>,
  Phone:        () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.4 2 2 0 0 1 3.6 1.22h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 9a16 16 0 0 0 6.09 6.09l1.86-1.86a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>,
  PhoneOff:     () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-3.33-2.67m-2.67-3.34a19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91"/><line x1="23" y1="1" x2="1" y2="23"/></svg>,
  Video:        () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>,
  VideoOff:     () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 16v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2m5.66 0H14a2 2 0 0 1 2 2v3.34l1 1L23 7v10"/><line x1="1" y1="1" x2="23" y2="23"/></svg>,
  Mic:          () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>,
  MicOff:       () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="1" y1="1" x2="23" y2="23"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>,
  Volume:       () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>,
  MessageSquare:() => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
  Monitor:      () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>,
  Search:       () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  ChevLeft:     () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>,
  ChevRight:    () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>,
  ChevDown:     () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>,
  Calendar:     () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  Plus:         () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  Check:        () => <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  X:            () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  Bell:         () => <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>,
  Eye:          () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
  EyeOff:       () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>,
  Lock:         () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
  Mail:         () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>,
  PhoneIcon:    () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.4 2 2 0 0 1 3.6 1.22h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 9a16 16 0 0 0 6.09 6.09l1.86-1.86a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>,
  Send:         () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>,
  Logout:       () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
  GearPerson:   () => <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="10" cy="8" r="4"/><path d="M2 20c0-4 3.6-7 8-7"/><circle cx="18" cy="17" r="3"/><path d="M18 14v-1m0 7v-1m-3-3h-1m7 0h-1m-1.5-2.5-.7-.7m-1.6 4.4-.7-.7m4.4-1.6.7.7m-4.4 1.6.7.7"/></svg>,
  Refresh:      () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>,
  WifiOff:      () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="1" y1="1" x2="23" y2="23"/><path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"/><path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"/><path d="M10.71 5.05A16 16 0 0 1 22.56 9"/><path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>,
};

/* ─────────────────────────────────────────────────────────────
   HOOK: useWebSocket  — STOMP over SockJS, auto-reconnect
   ─────────────────────────────────────────────────────────────

   Root cause of 🔴 Offline: the callbacks (onIncomingCall,
   onAvailabilityChange) are new function refs every render,
   so useCallback re-creates `connect` every render, which
   triggers the useEffect, which disconnects and reconnects
   endlessly — staying in 'disconnected' state.

   Fix: store callbacks in refs so connect() is stable and
   the useEffect only runs once when agentId is first set.
   ───────────────────────────────────────────────────────────── */
function useWebSocket(agentId, onIncomingCall, onAvailabilityChange) {
  const stompRef        = useRef(null);
  const reconnectRef    = useRef(null);
  const mountedRef      = useRef(true);
  const onCallRef       = useRef(onIncomingCall);
  const onAvailRef      = useRef(onAvailabilityChange);
  const agentIdRef      = useRef(agentId);
  const [wsStatus, setWsStatus] = useState('disconnected');

  // Keep refs current every render — zero effect cost
  useEffect(() => { onCallRef.current  = onIncomingCall;    });
  useEffect(() => { onAvailRef.current = onAvailabilityChange; });
  useEffect(() => { agentIdRef.current = agentId;           });

  // Stable connect function — never changes, reads everything via refs
  const connect = useCallback(() => {
    const aid = agentIdRef.current;
    if (!aid || !window.SockJS || !window.Stomp) return;
    if (stompRef.current?.connected) return;

    setWsStatus('connecting');
    try {
      const socket = new window.SockJS(`${API_BASE}/live-queue`);
      const stomp  = window.Stomp.over(socket);
      stomp.debug  = null;

      // Send JWT header so server authenticates agent topic subscriptions
      const _wsToken = localStorage.getItem('agent_token') || '';
      stomp.connect(
          _wsToken ? { Authorization: `Bearer ${_wsToken}` } : {},
          () => {
            if (!mountedRef.current) return;
            stompRef.current = stomp;
            setWsStatus('connected');

            stomp.subscribe(`/topic/agent/${aid}/incoming-call`, (msg) => {
              try { onCallRef.current?.(JSON.parse(msg.body)); } catch { /* ignore */ }
            });

            stomp.subscribe(`/topic/agent/${aid}/availability`, (msg) => {
              try { onAvailRef.current?.(JSON.parse(msg.body)); } catch { /* ignore */ }
            });
          },
          (error) => {
            // STOMP error callback — schedule reconnect
            if (!mountedRef.current) return;
            console.warn('WS disconnected, reconnecting in 5s…', error);
            setWsStatus('disconnected');
            stompRef.current = null;
            reconnectRef.current = setTimeout(connect, 5000);
          }
      );
    } catch (err) {
      console.warn('WS connect error:', err);
      setWsStatus('disconnected');
      reconnectRef.current = setTimeout(connect, 5000);
    }
  }, []); // ← stable, no deps — everything via refs

  // Load scripts once, then connect — only re-runs if agentId changes
  useEffect(() => {
    if (!agentId) return;
    mountedRef.current = true;

    const loadScripts = (cb) => {
      if (window.SockJS && window.Stomp) { cb(); return; }

      const s1 = document.createElement('script');
      s1.src = 'https://cdnjs.cloudflare.com/ajax/libs/sockjs-client/1.6.1/sockjs.min.js';
      s1.onerror = () => console.warn('Failed to load SockJS');
      s1.onload  = () => {
        const s2 = document.createElement('script');
        s2.src = 'https://cdnjs.cloudflare.com/ajax/libs/stomp.js/2.3.3/stomp.min.js';
        s2.onerror = () => console.warn('Failed to load STOMP');
        s2.onload  = cb;
        document.body.appendChild(s2);
      };
      document.body.appendChild(s1);
    };

    loadScripts(connect);

    return () => {
      mountedRef.current = false;
      clearTimeout(reconnectRef.current);
      if (stompRef.current?.connected) {
        stompRef.current.disconnect();
      }
      stompRef.current = null;
    };
  }, [agentId, connect]); // connect is now stable so this only fires on agentId change

  return { wsStatus };
}

/* ─────────────────────────────────────────────────────────────
   HOOK: useCallHistory
   ───────────────────────────────────────────────────────────── */
function useCallHistory(agentId) {
  const [calls,   setCalls]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  const refresh = useCallback(async () => {
    if (!agentId) return;
    setLoading(true); setError(null);
    try {
      const res  = await fetch(`${API_BASE}/api/agent/calls?agentId=${agentId}`, { headers: authHeaders() });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setCalls(data.map(c => ({
        id:           c.sessionId,
        name:         c.customerName    || 'Unknown',
        initials:     toInitials(c.customerName),
        property:     c.propertyTitle   || `Property #${c.propertyId}`,
        status:       (c.status || '').toLowerCase() === 'completed' ? 'completed'
            : (c.status || '').toLowerCase() === 'active'    ? 'ongoing'
                : 'missed',
        duration:     fmtDuration(c.durationSeconds),  // always reformat — backend string may be wrong
        durationRaw:  c.durationSeconds || 0,
        notes:        (c.notes && c.notes !== '–') ? c.notes : (c.customerNote && c.customerNote !== '–') ? c.customerNote : '',
        time:         fmtTime(c.startedAt),
        startedAtRaw: c.startedAt || null,
        online:       (c.status || '').toLowerCase() === 'active',
      })));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  useEffect(() => { refresh(); }, [refresh]);

  // Optimistic status update — changes UI immediately, syncs to backend
  const setCallStatus = useCallback(async (sessionId, newStatus) => {
    // 1. Update UI immediately
    setCalls(prev => prev.map(c =>
        c.id === sessionId ? { ...c, status: newStatus, online: false } : c
    ));
    // 2. Sync to backend — end the session if marking completed
    try {
      if (newStatus === 'completed') {
        await fetch(`${API_BASE}/api/live-tour/end-session/${sessionId}`, {
          method: 'POST',
          headers: authHeaders(),
        });
      }
    } catch {
      // Non-critical — UI already updated, backend may auto-resolve
    }
  }, []);

  return { calls, loading, error, refresh, setCallStatus };
}

/* ─────────────────────────────────────────────────────────────
   HOOK: useAgentStats
   ───────────────────────────────────────────────────────────── */
function useAgentStats(agentId) {
  const [stats, setStats] = useState({ total: 0, completed: 0, active: 0 });

  useEffect(() => {
    if (!agentId) return;
    fetch(`${API_BASE}/api/agent/stats?agentId=${agentId}`, { headers: authHeaders() })
        .then(r => r.ok ? r.json() : Promise.reject())
        .then(setStats)
        .catch(() => {});
  }, [agentId]);

  return stats;
}

/* ─────────────────────────────────────────────────────────────
   HOOK: useProperties  — for matching property in video call
   ───────────────────────────────────────────────────────────── */
function useProperties() {
  const [properties, setProperties] = useState([]);

  useEffect(() => {
    fetch(`${API_BASE}/api/properties?page=0&size=100`)
        .then(r => r.ok ? r.json() : Promise.reject())
        .then(data => setProperties(data?.content || data || []))
        .catch(() => {});
  }, []);

  const findPropertyById = useCallback((id) => {
    if (!id) return null;
    return properties.find(p => String(p.id) === String(id)) || null;
  }, [properties]);

  const findProperty = useCallback((nameOrSlug) => {
    if (!nameOrSlug) return null;
    const q = nameOrSlug.toLowerCase();
    return properties.find(p =>
        p.slug?.toLowerCase().includes(q) || p.title?.toLowerCase().includes(q)
    ) || null;
  }, [properties]);

  return { properties, findProperty, findPropertyById };

}

/* ─────────────────────────────────────────────────────────────
   COMPONENT: AvatarCircle
   ───────────────────────────────────────────────────────────── */
function AvatarCircle({ initials, size = 42, online = false, busy = false }) {
  const { bg, fg } = avatarColor(initials);
  const dotClass = online ? 'online' : busy ? 'busy' : 'offline';
  return (
      <div className="call-avatar-wrap">
        <div className="avatar-circle" style={{ width: size, height: size, background: bg, color: fg, fontSize: size * 0.35 }}>
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
  const [email,    setEmail]   = useState('');
  const [password, setPass]    = useState('');
  const [showPass, setShowP]   = useState(false);
  const [loading,  setLoading] = useState(false);
  const [error,    setError]   = useState('');

  const handleSubmit = async () => {
    setError('');
    if (!email.trim() || !password) { setError('Please enter your email and password.'); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/agent/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      if (!res.ok) throw new Error('Invalid credentials');
      const data = await res.json();
      onLogin(data);
    } catch {
      setError('Invalid email or password. Please try again.');
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
          <h1 className="login-title">Agent Login</h1>

          <div className="login-form-card">
            {error && (
                <div className="login-error" role="alert">
                  <Icon.X /> {error}
                </div>
            )}

            <div className="login-input-group">
              <div className="login-input-wrap">
                <span className="login-input-icon"><Icon.Mail /></span>
                <input
                    className="login-input"
                    type="email"
                    placeholder="Email address"
                    value={email}
                    autoComplete="email"
                    onChange={e => setEmail(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                    aria-label="Email address"
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
                    autoComplete="current-password"
                    onChange={e => setPass(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                    aria-label="Password"
                />
                <button className="login-eye" onClick={() => setShowP(p => !p)} type="button" aria-label={showPass ? 'Hide password' : 'Show password'}>
                  {showPass ? <Icon.EyeOff /> : <Icon.Eye />}
                </button>
              </div>
            </div>

            <button className="login-btn" onClick={handleSubmit} disabled={loading}>
              {loading ? <><span className="login-spinner" /> Signing in…</> : 'Sign In'}
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
  { id: 'dashboard',      label: 'Dashboard',      icon: 'Dashboard'      },
  { id: 'call-history',   label: 'Call History',   icon: 'CallHistory'    },
  { id: 'availability',   label: 'Availability',   icon: 'Availability'   },
  { id: 'upcoming-calls', label: 'Upcoming Calls', icon: 'UpcomingCalls'  },
  { id: 'settings',       label: 'Settings',       icon: 'Settings'       },
];

function Sidebar({ active, onNav, onLogout, wsStatus }) {
  return (
      <aside className="sidebar" role="navigation" aria-label="Main navigation">
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
                    aria-current={active === item.id ? 'page' : undefined}
                >
                  <span className="sidebar-icon"><IconComp /></span>
                  <span>{item.label}</span>
                </button>
            );
          })}
        </nav>

        <div className="sidebar-divider" />

        <div className="sidebar-bottom">
          {/* WebSocket live status */}
          <div className="ws-status-row" title={`Live connection: ${wsStatus}`}>
            <span className={`ws-dot ws-dot--${wsStatus === 'connected' ? 'green' : wsStatus === 'connecting' ? 'yellow' : 'red'}`} />
            <span className="ws-label">
            {wsStatus === 'connected' ? 'Live' : wsStatus === 'connecting' ? 'Connecting…' : 'Offline'}
          </span>
          </div>
          <button className="sidebar-logout-btn" onClick={onLogout}>
            <span className="sidebar-icon"><Icon.Logout /></span>
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
  );
}

/* ─────────────────────────────────────────────────────────────
   COMPONENT: AvailabilityToggle
   ───────────────────────────────────────────────────────────── */
function AvailabilityToggle({ available, onToggle, saving }) {
  return (
      <div className="avail-toggle-wrap">
        <span>{saving ? 'Saving…' : available ? 'Available' : 'Offline'}</span>
        <div
            className={`toggle-track-outer ${available ? 'on' : 'off'}${saving ? ' toggle-saving' : ''}`}
            onClick={!saving ? onToggle : undefined}
            role="switch"
            aria-checked={available}
            aria-label="Toggle availability"
            tabIndex={0}
            onKeyDown={e => e.key === 'Enter' && !saving && onToggle()}
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
      <div className="filter-tabs" role="tablist">
        {tabs.map(tab => (
            <button
                key={tab}
                role="tab"
                aria-selected={active === tab}
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
        <input
            className="search-input"
            type="text"
            placeholder={placeholder}
            value={value}
            onChange={e => onChange(e.target.value)}
            aria-label={placeholder}
        />
        {value && (
            <button className="search-clear" onClick={() => onChange('')} aria-label="Clear search">
              <Icon.X />
            </button>
        )}
      </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   COMPONENT: IncomingCallModal
   NEW: shows caller photo if available, ring animation,
        auto-dismiss after 45 s if not answered
   ───────────────────────────────────────────────────────────── */
function IncomingCallModal({ caller, onAccept, onDecline }) {
  const [seconds,    setSeconds]    = useState(0);
  const [dismissed,  setDismissed]  = useState(false);
  const AUTO_DISMISS = 45;

  useEffect(() => {
    const t = setInterval(() => setSeconds(s => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  // Auto-dismiss if agent ignores for 45 s
  useEffect(() => {
    if (seconds >= AUTO_DISMISS && !dismissed) {
      setDismissed(true);
      onDecline();
    }
  }, [seconds, dismissed, onDecline]);

  const pct  = Math.min((seconds / AUTO_DISMISS) * 100, 100);
  const fmt  = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  const { bg, fg } = avatarColor(caller.initials);

  return (
      <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Incoming video call">
        <div className="incoming-call-card">
          {/* Auto-dismiss progress bar */}
          <div className="autodismiss-bar" style={{ width: `${100 - pct}%` }} />

          <button className="close-modal-btn" onClick={onDecline} aria-label="Decline call"><Icon.X /></button>

          <div className="incoming-label">
            <Icon.Video />
            Incoming Video Call
          </div>

          <div className="caller-avatar-wrap">
            <div className="caller-ring"  aria-hidden="true" />
            <div className="caller-ring2" aria-hidden="true" />
            {caller.photoUrl ? (
                <img
                    src={caller.photoUrl}
                    alt={caller.name}
                    className="caller-avatar-img"
                    onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                />
            ) : null}
            <div className="caller-avatar-circle" style={{ background: bg, color: fg, display: caller.photoUrl ? 'none' : 'flex' }}>
              {caller.initials}
            </div>
          </div>

          <div className="caller-name">{caller.name}</div>
          <div className="caller-property">{caller.property}</div>
          {caller.mobile && <div className="caller-mobile">{caller.mobile}</div>}

          {caller.queuePosition > 0 && (
              <div className="caller-queue-badge">
                Queue position #{caller.queuePosition}
              </div>
          )}

          <div className="call-timer-display">
            <div className="timer-dots" aria-hidden="true">
              {[0, 0.15, 0.3].map((d, i) => <div key={i} className="timer-dot" style={{ animationDelay: `${d}s` }} />)}
            </div>
            <span className="timer-text" aria-live="polite">{fmt(seconds)}</span>
            <div className="timer-dots" aria-hidden="true">
              {[0, 0.15, 0.3].map((d, i) => <div key={i} className="timer-dot" style={{ animationDelay: `${d}s` }} />)}
            </div>
          </div>

          <p className="autodismiss-hint">Auto-dismiss in {AUTO_DISMISS - seconds}s</p>

          <div className="call-action-btns">
            <button className="btn-decline" onClick={onDecline}>
              <Icon.PhoneOff /> Decline
            </button>
            <button className="btn-accept" onClick={onAccept}>
              <Icon.Video /> Accept
            </button>
          </div>
        </div>
      </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   COMPONENT: CallRow
   ───────────────────────────────────────────────────────────── */
function NotesModal({ notes, onClose }) {
  return (
      <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center' }}>
        <div onClick={e => e.stopPropagation()} style={{ background:'white', borderRadius:14, padding:24, width:'min(480px,92vw)', maxHeight:'80vh', overflowY:'auto', border:'0.5px solid var(--gray-200)' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
            <span style={{ fontWeight:600, fontSize:15 }}>Session notes</span>
            <button onClick={onClose} style={{ background:'none', border:'none', fontSize:20, cursor:'pointer', color:'var(--gray-400)', lineHeight:1 }}>×</button>
          </div>
          <div style={{ background:'var(--gray-50)', borderRadius:8, padding:'12px 14px', fontSize:13, color:'var(--gray-700)', lineHeight:1.65 }}>{notes}</div>
        </div>
      </div>
  );
}

function CallRow({ call, onStatusChange }) {
  const [statusMenu, setStatusMenu] = useState(null);
  const [notesOpen,  setNotesOpen]  = useState(false);
  const [liveElapsed, setLiveElapsed] = useState(0);

  useEffect(() => {
    if (call.status !== 'ongoing') return;
    const t = setInterval(() => setLiveElapsed(s => s + 1), 1000);
    return () => clearInterval(t);
  }, [call.status]);

  const displayDuration = call.status === 'ongoing'
      ? (() => { const m = Math.floor(liveElapsed/60); const s = liveElapsed%60; return `${m}m ${String(s).padStart(2,'0')}s`; })()
      : call.duration;

  const statusConfig = {
    completed: { label: 'Completed', bg: '#dcfce7', color: '#166534', dot: '#22c55e' },
    ongoing:   { label: 'Ongoing',   bg: '#dbeafe', color: '#1e40af', dot: '#3b82f6' },
    missed:    { label: 'Missed',    bg: '#fef3c7', color: '#92400e', dot: '#f59e0b' },
    cancelled: { label: 'Cancelled', bg: '#fee2e2', color: '#991b1b', dot: '#ef4444' },
  };
  const sc = statusConfig[call.status] || { label: call.status, bg: '#f3f4f6', color: '#374151', dot: '#9ca3af' };

  const truncNote = call.notes && call.notes !== '–' && call.notes.length > 0;
  const shortNote = truncNote ? call.notes.slice(0, 40) : '';
  const hasMore   = truncNote && call.notes.length > 40;

  return (
      <>
        {notesOpen && <NotesModal notes={call.notes} onClose={() => setNotesOpen(false)} />}
        <tr className="ent-row" role="row" onMouseEnter={e=>e.currentTarget.style.background='#f8f7ff'} onMouseLeave={e=>e.currentTarget.style.background=''}>
          {/* Customer */}
          <td style={{ padding:'11px 16px' }}>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <AvatarCircle initials={call.initials} online={call.online} />
              <div style={{ minWidth:0 }}>
                <div style={{ fontSize:13, fontWeight:600, color:'var(--gray-900)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{call.name}</div>
                <div style={{ fontSize:11, color:'var(--gray-400)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', maxWidth:220 }}>{call.property}</div>
              </div>
            </div>
          </td>

          {/* Status pill */}
          <td data-label="Status" style={{ padding:'11px 16px' }}>
            <div style={{ position:'relative', display:'inline-block' }}>
            <span onClick={() => call.status === 'ongoing' && setStatusMenu(v => v ? null : call.id)}
                  style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'4px 10px', borderRadius:20, background:sc.bg, color:sc.color, fontSize:11, fontWeight:700, cursor: call.status === 'ongoing' ? 'pointer' : 'default', whiteSpace:'nowrap' }}
            >
              <span style={{ width:6, height:6, borderRadius:'50%', background:sc.dot, flexShrink:0 }} />
              {sc.label}
              {call.status === 'ongoing' && <span style={{ fontSize:9, opacity:0.6, marginLeft:2 }}>▾</span>}
            </span>
              {statusMenu === call.id && (
                  <div style={{ position:'absolute', top:'110%', left:0, zIndex:200, background:'white', borderRadius:8, boxShadow:'0 8px 24px rgba(0,0,0,0.14)', border:'1px solid var(--gray-200)', padding:4, minWidth:152 }}>
                    {[['completed','✓ Mark completed'],['missed','✗ Mark missed']].map(([s, lbl]) => (
                        <button key={s} onClick={() => { onStatusChange(call.id, s); setStatusMenu(null); }}
                                style={{ display:'block', width:'100%', textAlign:'left', padding:'7px 12px', border:'none', background:'none', cursor:'pointer', fontSize:12, borderRadius:6, color:'var(--gray-700)' }}
                                onMouseEnter={e => e.currentTarget.style.background='var(--gray-50)'}
                                onMouseLeave={e => e.currentTarget.style.background='none'}
                        >{lbl}</button>
                    ))}
                  </div>
              )}
            </div>
          </td>

          {/* Duration */}
          <td data-label="Duration" style={{ padding:'11px 16px' }}>
            <span style={{ fontSize:12, fontWeight:500, fontVariantNumeric:'tabular-nums', color:'var(--gray-700)', whiteSpace:'nowrap' }}>{displayDuration || '–'}</span>
          </td>

          {/* Notes */}
          <td data-label="Notes" className="call-notes-cell" style={{ padding:'11px 16px', whiteSpace:'normal' }}>
            {truncNote ? (
                <span style={{ fontSize:12, color:'var(--gray-500)' }}>
              {shortNote}{hasMore ? '…' : ''}
                  {hasMore && (
                      <button onClick={e => { e.stopPropagation(); setNotesOpen(true); }}
                              style={{ marginLeft:5, fontSize:11, fontWeight:700, color:'#6366f1', background:'none', border:'none', cursor:'pointer', padding:0 }}>
                        View
                      </button>
                  )}
            </span>
            ) : (
                <span style={{ color:'var(--gray-300)', fontSize:12 }}>—</span>
            )}
          </td>

          {/* Time */}
          <td data-label="Time" style={{ padding:'11px 16px', textAlign:'left' }}>
            <span style={{ fontSize:12, fontWeight:600, fontVariantNumeric:'tabular-nums', color:'var(--gray-700)', whiteSpace:'nowrap' }}>{call.time}</span>
          </td>
        </tr>
      </>
  );
}

/* ─────────────────────────────────────────────────────────────
   COMPONENT: EmptyState
   ───────────────────────────────────────────────────────────── */
function EmptyState({ icon, title, subtitle, action }) {
  return (
      <div className="empty-state">
        <div className="empty-icon">{icon}</div>
        <div className="empty-title">{title}</div>
        {subtitle && <div className="empty-subtitle">{subtitle}</div>}
        {action}
      </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   COMPONENT: ErrorBanner
   ───────────────────────────────────────────────────────────── */
function ErrorBanner({ message, onRetry }) {
  return (
      <div className="error-banner" role="alert">
        <Icon.WifiOff />
        <span>{message}</span>
        {onRetry && (
            <button className="error-retry-btn" onClick={onRetry}>
              <Icon.Refresh /> Retry
            </button>
        )}
      </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   PAGE: Dashboard
   ───────────────────────────────────────────────────────────── */
function DashboardPage({ agent, available, onToggleAvailable, availSaving, onAgentUpdate }) {
  const [filter,  setFilter]  = useState('All');
  const [search,  setSearch]  = useState('');
  const [sortBy,  setSortBy]  = useState('time');   // 'time'|'name'|'status'|'duration'
  const [sortDir, setSortDir] = useState('desc');   // 'asc'|'desc'

  const agentId = agent.agentId || agent.id;
  const stats   = useAgentStats(agentId);
  const { calls: rawCalls, loading, error, refresh, setCallStatus } = useCallHistory(agentId);

  const calls = useMemo(() => {
    let src = rawCalls;
    const now = new Date();
    if (filter === 'Today') {
      const start = new Date(now); start.setHours(0, 0, 0, 0);
      src = src.filter(c => !c.startedAtRaw || new Date(c.startedAtRaw) >= start);
    } else if (filter === 'Yesterday') {
      const end   = new Date(now); end.setHours(0, 0, 0, 0);
      const start = new Date(end); start.setDate(start.getDate() - 1);
      src = src.filter(c => !c.startedAtRaw || (new Date(c.startedAtRaw) >= start && new Date(c.startedAtRaw) < end));
    } else if (filter === 'Last 7 days') {
      const start = new Date(now); start.setDate(start.getDate() - 7);
      src = src.filter(c => !c.startedAtRaw || new Date(c.startedAtRaw) >= start);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      src = src.filter(c => c.name.toLowerCase().includes(q) || c.property.toLowerCase().includes(q));
    }
    // Sort
    src = [...src].sort((a, b) => {
      let va, vb;
      if (sortBy === 'name')     { va = a.name.toLowerCase(); vb = b.name.toLowerCase(); }
      else if (sortBy === 'status') { va = a.status; vb = b.status; }
      else if (sortBy === 'duration') { va = a.durationRaw || 0; vb = b.durationRaw || 0; }
      else { va = a.startedAtRaw || ''; vb = b.startedAtRaw || ''; }
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return src;
  }, [rawCalls, filter, search, sortBy, sortDir]);

  return (
      <div className="page">
        <div className="page-header">
          <h1 className="page-title"><span>Agent</span> Dashboard</h1>
          <AvailabilityToggle available={available} onToggle={onToggleAvailable} saving={availSaving} />
        </div>

        <div className="dashboard-grid">
          {/* LEFT — call list */}
          <div>
            <div className="toolbar">
              <FilterTabs tabs={['Today', 'Yesterday', 'Last 7 days', 'All']} active={filter} onChange={setFilter} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <SearchBar value={search} onChange={setSearch} placeholder="Search name or property" />
                {/*<button className="icon-btn" onClick={refresh} title="Refresh" aria-label="Refresh calls">*/}
                {/*  <Icon.Refresh />*/}
                {/*</button>*/}
              </div>
            </div>

            <div className="content-card ent-card">
              {/* Enterprise table */}
              <div style={{ overflowX:'auto' }}>
                <table className="ent-table">
                  <thead>
                  <tr>
                    {[
                      { key:'name',     label:'Customer',  w:'38%' },
                      { key:'status',   label:'Status',    w:'18%' },
                      { key:'duration', label:'Duration',  w:'16%' },
                      { key:'notes',    label:'Notes',     w:'16%' },
                      { key:'time',     label:'Time',      w:'12%' },
                    ].map(col => (
                        <th key={col.key} style={{ width:col.w }}
                            className={sortBy===col.key?'ent-th ent-th-active':'ent-th'}
                            onClick={() => { if(sortBy===col.key) setSortDir(d=>d==='asc'?'desc':'asc'); else { setSortBy(col.key); setSortDir('desc'); } }}
                        >
                          {col.label}
                          <span className="ent-sort-icon">
                          {sortBy===col.key ? (sortDir==='asc'?'↑':'↓') : '↕'}
                        </span>
                        </th>
                    ))}
                  </tr>
                  </thead>
                  <tbody>
                  {loading ? (
                      <tr><td colSpan={5} style={{ padding:'40px', textAlign:'center', color:'var(--gray-400)', fontSize:13 }}>
                        <span className="login-spinner" style={{ borderTopColor:'var(--blue-500)', verticalAlign:'middle', marginRight:8 }} />Loading sessions…
                      </td></tr>
                  ) : error ? (
                      <tr><td colSpan={5}><ErrorBanner message={`Failed to load calls: ${error}`} onRetry={refresh} /></td></tr>
                  ) : calls.length === 0 ? (
                      <tr><td colSpan={5}>
                        <div style={{ padding:'52px 20px', textAlign:'center' }}>
                          <div style={{ width:52, height:52, background:'var(--gray-50)', borderRadius:14, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 14px', fontSize:22 }}>📋</div>
                          <div style={{ fontSize:15, fontWeight:600, color:'var(--gray-700)', marginBottom:6 }}>No sessions found</div>
                          <div style={{ fontSize:12, color:'var(--gray-400)' }}>
                            {search ? 'Try a different search term.' : filter === 'Today' ? 'No calls today yet.' : 'Call history will appear here.'}
                          </div>
                        </div>
                      </td></tr>
                  ) : (
                      calls.map(call => <CallRow key={call.id} call={call} onStatusChange={setCallStatus} />)
                  )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* RIGHT — agent profile + stats */}
          <div>
            <div className="agent-profile-card">
              <div className="agent-profile-title">
                Agent Profile
              </div>

              <div className="agent-profile-info">
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <div className="agent-avatar-lg">
                    {(agent.photoUrl || agent._localPhoto)
                        ? <img src={agent._localPhoto || agent.photoUrl} alt={agent.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                        : toInitials(agent.name)}
                  </div>
                  {/* Photo upload button */}
                  <label htmlFor="agent-photo-upload" style={{
                    position: 'absolute', bottom: -2, right: -2,
                    width: 22, height: 22, borderRadius: '50%',
                    background: 'var(--blue-600)', border: '2px solid white',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                    zIndex: 1,
                  }} title="Upload photo">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                  </label>
                  <input id="agent-photo-upload" type="file" accept="image/*" style={{ display: 'none' }}
                         onChange={e => {
                           const file = e.target.files[0];
                           if (!file) return;
                           const reader = new FileReader();
                           reader.onload = ev => {
                             const dataUrl = ev.target.result;
                             localStorage.setItem('agent_photo_' + agentId, dataUrl);
                             onAgentUpdate?.({ ...agent, _localPhoto: dataUrl });
                           };
                           reader.readAsDataURL(file);
                         }}
                  />
                </div>
                <div>
                  <div className="agent-name">{agent.name}</div>
                  <div className="agent-role">{agent.designation || agent.role || 'Property Advisor'}</div>
                  <div className={`agent-status-badge ${available ? 'available' : 'busy'}`}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: available ? 'var(--green-500)' : 'var(--orange-500)', display: 'inline-block' }} />
                    {available ? 'Available' : 'Offline'}
                  </div>
                </div>
              </div>

              <div className="stats-row">
                {[
                  { label: 'Total Calls', value: stats.total ?? 0 },
                  { label: 'Completed',   value: stats.completed ?? 0 },
                  { label: 'Active',      value: stats.active ?? 0 },
                ].map(s => (
                    <div key={s.label} className="stat-box">
                      <div className="stat-value">{s.value}</div>
                      <div className="stat-label">{s.label}</div>
                    </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   PAGE: Call History  (standalone, with export hint)
   ───────────────────────────────────────────────────────────── */
function CallHistoryPage({ agentId }) {
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const { calls: rawCalls, loading, error, refresh, setCallStatus } = useCallHistory(agentId);

  const calls = useMemo(() => {
    let src = rawCalls;
    const now = new Date();
    if (filter === 'Today') {
      const start = new Date(now); start.setHours(0, 0, 0, 0);
      src = src.filter(c => !c.startedAtRaw || new Date(c.startedAtRaw) >= start);
    } else if (filter === 'Yesterday') {
      const end   = new Date(now); end.setHours(0, 0, 0, 0);
      const start = new Date(end); start.setDate(start.getDate() - 1);
      src = src.filter(c => !c.startedAtRaw || (new Date(c.startedAtRaw) >= start && new Date(c.startedAtRaw) < end));
    } else if (filter === 'Last 7 days') {
      const start = new Date(now); start.setDate(start.getDate() - 7);
      src = src.filter(c => !c.startedAtRaw || new Date(c.startedAtRaw) >= start);
    }
    if (!search.trim()) return src;
    const q = search.toLowerCase();
    return src.filter(c => c.name.toLowerCase().includes(q) || c.property.toLowerCase().includes(q));
  }, [rawCalls, filter, search]);

  return (
      <div className="page">
        <div className="page-header">
          <h1 className="page-title">Call History</h1>
          <button
              onClick={() => {
                const rows = [['Name','Property','Status','Duration','Time'],
                  ...calls.map(c => [c.name, c.property, c.status, c.duration, c.time])];
                const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n');
                const a = document.createElement('a');
                a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
                a.download = `call-history-${new Date().toISOString().slice(0,10)}.csv`;
                a.click();
              }}
              style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 16px', borderRadius:8, border:'1.5px solid var(--gray-200)', background:'white', fontFamily:'var(--font-ui)', fontSize:13, cursor:'pointer', color:'var(--gray-700)' }}
          >
            ⬇ Export CSV
          </button>
        </div>

        <div className="ch-toolbar">
          <FilterTabs tabs={['Today', 'Yesterday', 'Last 7 days', 'All']} active={filter} onChange={setFilter} />
          <div style={{ display: 'flex', gap: 8 }}>
            <SearchBar value={search} onChange={setSearch} placeholder="Search name or property" />
            <button className="icon-btn" onClick={refresh} title="Refresh" aria-label="Refresh"><Icon.Refresh /></button>
          </div>
        </div>

        <div className="content-card">
          <div className="table-header">
            <div style={{ flex: 1 }}>Name</div>
            <div style={{ minWidth: 105 }}>Status</div>
            <div style={{ minWidth: 110, maxWidth: 110 }}>Duration</div>
            <div style={{ flex: 1, maxWidth: 175 }}>Notes</div>
            <div style={{ minWidth: 65, textAlign: 'right' }}>Time</div>
          </div>

          {loading ? (
              <div className="table-loading"><span className="login-spinner" style={{ borderTopColor: 'var(--blue-500)' }} /> Loading…</div>
          ) : error ? (
              <ErrorBanner message={`Failed to load: ${error}`} onRetry={refresh} />
          ) : calls.length === 0 ? (
              <EmptyState icon="📞" title="No calls found" subtitle={search ? 'Try a different search.' : 'Your call history will appear here.'} />
          ) : (
              calls.map(call => <CallRow key={call.id} call={call} onStatusChange={setCallStatus} />)
          )}
        </div>
      </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   PAGE: Availability  (week schedule editor)
   ───────────────────────────────────────────────────────────── */
const TIME_OPTIONS = [
  '6:00 AM','7:00 AM','8:00 AM','9:00 AM','10:00 AM','11:00 AM',
  '12:00 PM','1:00 PM','2:00 PM','3:00 PM','4:00 PM','5:00 PM',
  '6:00 PM','7:00 PM','8:00 PM','9:00 PM',
];

function AvailabilityPage({ agentId }) {
  const [weekOffset, setWeekOffset] = useState(0);
  const [schedule,   setSchedule]   = useState(() => buildWeekSchedule(0));
  const [editRow,    setEditRow]     = useState(null);
  const [popStart,   setPopStart]   = useState('9:00 AM');
  const [popEnd,     setPopEnd]     = useState('6:00 PM');
  const [saving,     setSaving]     = useState(false);
  const [saveMsg,    setSaveMsg]    = useState('');

  // Rebuild schedule grid on week change
  useEffect(() => { setSchedule(buildWeekSchedule(weekOffset)); setEditRow(null); }, [weekOffset]);

  // Fetch saved schedule from backend
  useEffect(() => {
    if (!agentId) return;
    fetch(`${API_BASE}/api/agent/schedule?agentId=${agentId}`, { headers: authHeaders() })
        .then(r => r.ok ? r.json() : Promise.reject())
        .then(data => {
          // Merge backend data into local week grid
          setSchedule(prev => prev.map(row => {
            const saved = data.find(s => s.dayOfWeek === row.day || s.isoDate === row.isoDate);
            if (!saved) return row;
            return { ...row, startTime: saved.startTime || row.startTime, endTime: saved.endTime || row.endTime, status: saved.active ? 'available' : 'unavailable' };
          }));
        })
        .catch(() => {});
  }, [agentId, weekOffset]);

  const weekLabel = useMemo(() => {
    const arr = buildWeekSchedule(weekOffset);
    return `${arr[0].date} – ${arr[6].date}, ${new Date().getFullYear()}`;
  }, [weekOffset]);

  const openEdit = (idx) => { setPopStart(schedule[idx].startTime); setPopEnd(schedule[idx].endTime); setEditRow(idx); };

  const saveEdit = async () => {
    const updated = schedule.map((row, i) =>
        i === editRow ? { ...row, startTime: popStart, endTime: popEnd, status: 'available' } : row
    );
    setSchedule(updated);
    setEditRow(null);

    // Persist to backend
    setSaving(true);
    try {
      const slots = updated.map(r => ({ dayOfWeek: r.day, isoDate: r.isoDate, startTime: r.startTime, endTime: r.endTime, active: r.status === 'available' }));
      await fetch(`${API_BASE}/api/agent/schedule?agentId=${agentId}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify(slots),
      });
      setSaveMsg('Schedule saved ✓');
    } catch {
      setSaveMsg('Save failed — changes kept locally.');
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMsg(''), 3000);
    }
  };

  const clearEdit = () => {
    setSchedule(s => s.map((row, i) => i === editRow ? { ...row, status: 'not-set' } : row));
    setEditRow(null);
  };

  return (
      <div className="page">
        <div className="page-header">
          <h1 className="page-title">Availability</h1>
          <button className="apply-all-btn" onClick={() => {
            const first = schedule.find(r => r.status === 'available');
            if (!first) return;
            setSchedule(s => s.map(r => ({ ...r, startTime: first.startTime, endTime: first.endTime, status: 'available' })));
            setSaveMsg('Applied to all days — click any slot to save.');
            setTimeout(() => setSaveMsg(''), 3000);
          }}>Apply to all <Icon.ChevDown /></button>
        </div>

        {saveMsg && (
            <div className={`save-toast ${saveMsg.includes('✓') ? 'save-toast--ok' : 'save-toast--err'}`} role="status">
              {saveMsg}
            </div>
        )}

        <div className="content-card" onClick={() => setEditRow(null)}>
          {/* Week nav */}
          <div className="avail-header-row" onClick={e => e.stopPropagation()}>
            <div className="week-nav">
              <button className="week-nav-btn" onClick={() => setWeekOffset(o => o - 1)} aria-label="Previous week"><Icon.ChevLeft /></button>
              <span className="week-label">{weekLabel}</span>
              <button className="week-nav-btn" onClick={() => setWeekOffset(o => o + 1)} aria-label="Next week"><Icon.ChevRight /></button>
              <label className="week-nav-btn" aria-label="Open calendar" title="Jump to date" style={{ cursor: 'pointer' }}>
                <Icon.Calendar />
                <input type="date" style={{ position: 'absolute', opacity: 0, width: 1, height: 1, pointerEvents: 'none' }}
                       onChange={e => {
                         if (!e.target.value) return;
                         const selected = new Date(e.target.value);
                         const today = new Date();
                         const diffDays = Math.round((selected - today) / (1000*60*60*24));
                         const diffWeeks = Math.floor(diffDays / 7);
                         setWeekOffset(diffWeeks);
                       }}
                />
              </label>
            </div>
            <div className="default-hours-text">Default: 9:00 AM – 6:00 PM</div>
          </div>

          {/* Legend */}
          <div className="avail-legend">
            {[['green','Available'],['red','Unavailable'],['gray','Not Set']].map(([c,l]) => (
                <div key={c} className="legend-item"><span className={`legend-dot ${c}`} />{l}</div>
            ))}
          </div>

          {/* Rows */}
          {schedule.map((row, idx) => (
              <div key={row.id} className="avail-row" style={row.isToday ? { background: 'rgba(37,99,235,0.03)' } : {}} onClick={e => e.stopPropagation()}>
                <div className="avail-date-col">
                  <div className={`avail-date${row.isToday ? ' today-date' : ''}`}>{row.date}</div>
                  {row.isToday && <span className="today-pill">Today</span>}
                </div>

                <div className="avail-day-col">{row.day}</div>

                <div className="avail-slot-col avail-popup-anchor">
                  <div className={`time-slot-pill ${row.status}`} onClick={() => openEdit(idx)}>
                    <span>{row.startTime}</span>
                    <span className="arrow-divider">→</span>
                    <span>{row.endTime}</span>
                    {row.status === 'available' && <span className="slot-check-icon green"><Icon.Check /></span>}
                    {row.status === 'not-set'   && <span className="slot-check-icon gray-c">·</span>}
                  </div>

                  {row.status === 'available' && (
                      <button className="add-break-btn"><Icon.Plus /> Add Break</button>
                  )}

                  {editRow === idx && (
                      <div className="edit-avail-popup" onClick={e => e.stopPropagation()} role="dialog" aria-label="Edit availability">
                        <div className="edit-popup-title">
                          Edit — {row.day.slice(0, 3)}, {row.date}
                          <button className="close-popup-btn" onClick={() => setEditRow(null)} aria-label="Close"><Icon.X /></button>
                        </div>
                        <div className="avail-from-label">Available from</div>
                        <div className="time-select-row">
                          <select className="time-select" value={popStart} onChange={e => setPopStart(e.target.value)} aria-label="Start time">
                            {TIME_OPTIONS.map(t => <option key={t}>{t}</option>)}
                          </select>
                          <span className="time-arrow">→</span>
                          <select className="time-select" value={popEnd} onChange={e => setPopEnd(e.target.value)} aria-label="End time">
                            {TIME_OPTIONS.map(t => <option key={t}>{t}</option>)}
                          </select>
                        </div>
                        <div className="popup-actions">
                          <button className="btn-popup-clear" onClick={clearEdit}>Clear</button>
                          <button className="btn-popup-cancel" onClick={() => setEditRow(null)}>Cancel</button>
                          <button className="btn-popup-save" onClick={saveEdit} disabled={saving}>
                            {saving ? 'Saving…' : 'Save'}
                          </button>
                        </div>
                      </div>
                  )}
                </div>

                <button className="more-dots-btn" aria-label="More options">···</button>
              </div>
          ))}
        </div>
      </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   MODAL: Schedule Call
   ───────────────────────────────────────────────────────────── */
function ScheduleCallModal({ agentId, onClose, onSaved }) {
  const [form, setForm] = useState({ customerName: '', customerMobile: '', customerEmail: '', propertyId: '', note: '', scheduledAt: '' });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.customerName.trim() || !form.customerMobile.trim() || !form.scheduledAt) {
      setError('Name, mobile and date/time are required.'); return;
    }
    setSaving(true); setError('');
    try {
      const res = await fetch(`${API_BASE}/api/agent/book-call`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          agentId,
          propertyId:     form.propertyId ? Number(form.propertyId) : null,
          customerName:   form.customerName.trim(),
          customerMobile: form.customerMobile.trim(),
          customerEmail:  form.customerEmail.trim() || null,
          note:           form.note.trim() || null,
          scheduledAt:    form.scheduledAt,
          source:         'AGENT_SCHEDULED',
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      onSaved(data);
    } catch (e) {
      setError(`Failed to save: ${e.message}. Please try again.`);
    } finally {
      setSaving(false);
    }
  };

  const iStyle = { width: '100%', padding: '10px 14px', borderRadius: 8, boxSizing: 'border-box', border: '1.5px solid var(--gray-200)', fontFamily: 'var(--font-body)', fontSize: 14, outline: 'none', background: 'var(--gray-50)' };
  const lStyle = { display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--gray-500)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.4px' };

  return (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={onClose} role="dialog" aria-modal="true" aria-label="Schedule a call">
        <div style={{ background: '#fff', borderRadius: 18, padding: '28px 30px', width: '100%', maxWidth: 480, boxShadow: '0 24px 64px rgba(15,23,42,0.18)' }} onClick={e => e.stopPropagation()}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
            <h2 style={{ margin: 0, fontFamily: 'var(--font-ui)', fontWeight: 800, fontSize: 18, color: 'var(--blue-950)' }}>Schedule a Call</h2>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-400)' }} aria-label="Close"><Icon.X /></button>
          </div>

          {error && <div style={{ padding: '10px 14px', background: '#fee2e2', borderRadius: 8, fontSize: 13, color: '#dc2626', marginBottom: 16 }} role="alert">{error}</div>}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            {[
              ['customerName',   'Customer Name *', 'text',  'Priya Kapoor'],
              ['customerMobile', 'Mobile *',        'tel',   '9876543210'],
              ['customerEmail',  'Email',           'email', 'optional'],
            ].map(([key, label, type, ph]) => (
                <div key={key}>
                  <label style={lStyle}>{label}</label>
                  <input style={iStyle} type={type} placeholder={ph} value={form[key]} onChange={e => set(key, e.target.value)} />
                </div>
            ))}
            <div>
              <label style={lStyle}>Property ID</label>
              <input style={iStyle} type="number" placeholder="e.g. 42" value={form.propertyId} onChange={e => set('propertyId', e.target.value)} />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={lStyle}>Date &amp; Time *</label>
              <input style={iStyle} type="datetime-local" value={form.scheduledAt} onChange={e => set('scheduledAt', e.target.value)} />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={lStyle}>Note</label>
              <input style={iStyle} placeholder="e.g. Wants 2BHK walkthrough" value={form.note} onChange={e => set('note', e.target.value)} />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 22, justifyContent: 'flex-end' }}>
            <button onClick={onClose} style={{ padding: '10px 20px', borderRadius: 8, border: '1.5px solid var(--gray-200)', background: '#fff', fontFamily: 'var(--font-ui)', fontSize: 13, cursor: 'pointer' }}>Cancel</button>
            <button onClick={handleSave} disabled={saving} style={{ padding: '10px 22px', borderRadius: 8, border: 'none', background: 'var(--blue-600)', color: '#fff', fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Saving…' : 'Save Call'}
            </button>
          </div>
        </div>
      </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   PAGE: Upcoming Calls
   ───────────────────────────────────────────────────────────── */
function UpcomingCallsPage({ onJoinCall, agentId }) {
  const [weekOffset,   setWeekOffset]   = useState(0);
  const [calls,        setCalls]        = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(null);
  const [showModal,    setShowModal]    = useState(false);
  const [rescheduleId, setRescheduleId] = useState(null);

  const weekLabel = useMemo(() => {
    const arr = buildWeekSchedule(weekOffset);
    return `${arr[0].date} – ${arr[6].date}`;
  }, [weekOffset]);

  const fetchCalls = useCallback(async () => {
    if (!agentId) return;
    setLoading(true); setError(null);
    try {
      const res  = await fetch(`${API_BASE}/api/agent/upcoming?agentId=${agentId}`, { headers: authHeaders() });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setCalls(await res.json());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  useEffect(() => { fetchCalls(); }, [fetchCalls]);

  const handleCancel = async (id) => {
    try {
      await fetch(`${API_BASE}/api/agent/upcoming/${id}/cancel`, { method: 'PUT', headers: authHeaders() });
      setCalls(prev => prev.filter(c => c.id !== id));
    } catch {
      // Show error toast if needed
    }
  };

  const upNext = calls.find(c => c.minutesUntil > 0 && c.minutesUntil <= 30);

  const sourceLabel = {
    CUSTOMER_BOOKING: '🌐 Customer Booking',
    QUEUE_JOIN:       '⚡ Queue',
    AGENT_SCHEDULED:  '✏️ Scheduled',
    AUTO_QUEUE:       '🤖 Auto-Queue',
  };
  const sourceBg = { CUSTOMER_BOOKING: '#eff6ff', QUEUE_JOIN: '#f0fdf4', AGENT_SCHEDULED: '#fdf4ff', AUTO_QUEUE: '#fff7ed' };
  const sourceFg = { CUSTOMER_BOOKING: '#0b63e5', QUEUE_JOIN: '#15803d', AGENT_SCHEDULED: '#7c3aed', AUTO_QUEUE: '#ea580c' };

  const [upFilter, setUpFilter] = useState('All');

  const filteredCalls = useMemo(() => {
    if (upFilter === 'All') return calls;
    const now = new Date();
    if (upFilter === 'Today') {
      const start = new Date(now); start.setHours(0,0,0,0);
      const end   = new Date(now); end.setHours(23,59,59,999);
      return calls.filter(c => { const d = new Date(c.scheduledAt); return d >= start && d <= end; });
    }
    if (upFilter === 'This Week') {
      const start = new Date(now); start.setDate(now.getDate() - now.getDay());
      const end   = new Date(start); end.setDate(start.getDate() + 6);
      return calls.filter(c => { const d = new Date(c.scheduledAt); return d >= start && d <= end; });
    }
    return calls;
  }, [calls, upFilter]);

  return (
      <div className="page">
        <div className="page-header">
          <h1 className="page-title">Upcoming Calls</h1>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="icon-btn" onClick={fetchCalls} title="Refresh" aria-label="Refresh"><Icon.Refresh /></button>
            <button
                onClick={() => setShowModal(true)}
                style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 18px', borderRadius: 10, border: 'none', background: 'var(--blue-600)', color: '#fff', fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 700, cursor: 'pointer', boxShadow: '0 2px 10px rgba(11,99,229,0.3)' }}
            >
              <Icon.Plus /> Schedule Call
            </button>
          </div>
        </div>
        <div style={{ marginBottom: 14 }}>
          <FilterTabs tabs={['All', 'Today', 'This Week']} active={upFilter} onChange={setUpFilter} />
        </div>

        <div className="content-card">
          {/* Week nav */}
          <div className="avail-header-row" style={{ padding: '12px 22px' }}>
            <div className="week-nav">
              <button className="week-nav-btn" onClick={() => setWeekOffset(o => o - 1)} aria-label="Previous week"><Icon.ChevLeft /></button>
              <span className="week-label">{weekLabel}</span>
              <button className="week-nav-btn" onClick={() => setWeekOffset(o => o + 1)} aria-label="Next week"><Icon.ChevRight /></button>
            </div>
            <span style={{ fontSize: 13, color: 'var(--gray-400)', fontFamily: 'var(--font-body)' }}>
            {loading ? '…' : `${calls.length} scheduled`}
          </span>
          </div>

          {/* Up-next banner */}
          {upNext && (
              <div className="up-next-banner" role="alert">
                <Icon.Bell />
                Up Next in {upNext.minutesUntil} min — {upNext.customerName}
              </div>
          )}

          {loading ? (
              <div className="table-loading"><span className="login-spinner" style={{ borderTopColor: 'var(--blue-500)' }} /> Loading…</div>
          ) : error ? (
              <ErrorBanner message={`Failed to load: ${error}`} onRetry={fetchCalls} />
          ) : calls.length === 0 ? (
              <EmptyState
                  icon="📅"
                  title="No upcoming calls"
                  subtitle='Click "Schedule Call" to add one.'
                  action={<button onClick={() => setShowModal(true)} style={{ marginTop: 12, padding: '9px 18px', borderRadius: 8, border: 'none', background: 'var(--blue-600)', color: '#fff', fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}><Icon.Plus /> Schedule Call</button>}
              />
          ) : calls.map(item => {
            const initials = toInitials(item.customerName);
            const isNext   = item.minutesUntil > 0 && item.minutesUntil <= 30;
            const { bg, fg } = avatarColor(initials);
            return (
                <div key={item.id} className={`upcoming-row${isNext ? ' highlighted' : ''}`}>
                  <div className="upcoming-time-col">{item.scheduledAtFormatted}</div>

                  <div className="call-avatar-wrap" style={{ marginRight: 12 }}>
                    <div className="avatar-circle" style={{ width: 42, height: 42, background: bg, color: fg, fontSize: 15, fontWeight: 700 }}>{initials}</div>
                    <span className="avatar-status-dot online" />
                  </div>

                  <div className="upcoming-info-col">
                    <div className="upcoming-name">{item.customerName}</div>
                    <div className="upcoming-property">{item.propertyTitle}</div>
                    {item.note && <div className="upcoming-note">{item.note}</div>}
                    {item.source && (
                        <span style={{ fontSize: 10.5, fontWeight: 700, padding: '2px 8px', borderRadius: 20, marginTop: 4, display: 'inline-block', background: sourceBg[item.source] || '#f1f5f9', color: sourceFg[item.source] || '#334155' }}>
                    {sourceLabel[item.source] || item.source}
                  </span>
                    )}
                  </div>

                  <div className="upcoming-actions">
                    <button
                        className="btn-join"
                        onClick={() => onJoinCall({ name: item.customerName, initials, property: item.propertyTitle, mobile: item.customerMobile, email: item.customerEmail })}
                    >
                      Join
                    </button>
                    <button
                        className="btn-reschedule"
                        onClick={() => setRescheduleId(item.id)}
                        aria-label={`Reschedule call with ${item.customerName}`}
                    >
                      Reschedule
                    </button>
                    <button
                        className="btn-reschedule"
                        onClick={() => handleCancel(item.id)}
                        style={{ color: '#ef4444', borderColor: '#fecaca' }}
                        aria-label={`Cancel call with ${item.customerName}`}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
            );
          })}
        </div>

        {showModal && (
            <ScheduleCallModal
                agentId={agentId}
                onClose={() => setShowModal(false)}
                onSaved={newCall => {
                  setCalls(prev => [...prev, newCall].sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt)));
                  setShowModal(false);
                }}
            />
        )}

        {rescheduleId && (
            <div style={{ position:'fixed', inset:0, background:'rgba(15,23,42,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 }}
                 onClick={() => setRescheduleId(null)} role="dialog" aria-modal="true" aria-label="Reschedule call">
              <div style={{ background:'#fff', borderRadius:18, padding:'28px 30px', width:'100%', maxWidth:380, boxShadow:'0 24px 64px rgba(15,23,42,0.18)' }}
                   onClick={e => e.stopPropagation()}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
                  <h2 style={{ margin:0, fontFamily:'var(--font-ui)', fontWeight:800, fontSize:18, color:'var(--blue-950)' }}>Reschedule Call</h2>
                  <button onClick={() => setRescheduleId(null)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--gray-400)' }} aria-label="Close"><Icon.X /></button>
                </div>
                <label style={{ display:'block', fontSize:12, fontWeight:700, color:'var(--gray-500)', marginBottom:6, textTransform:'uppercase', letterSpacing:'0.4px' }}>New Date &amp; Time</label>
                <input type="datetime-local" id="reschedule-dt"
                       style={{ width:'100%', padding:'10px 14px', borderRadius:8, border:'1.5px solid var(--gray-200)', fontFamily:'var(--font-body)', fontSize:14, outline:'none', background:'var(--gray-50)', boxSizing:'border-box' }}
                       defaultValue={calls.find(c => c.id === rescheduleId)?.scheduledAt?.slice(0,16) || ''}
                />
                <div style={{ display:'flex', gap:10, marginTop:20, justifyContent:'flex-end' }}>
                  <button onClick={() => setRescheduleId(null)}
                          style={{ padding:'10px 20px', borderRadius:8, border:'1.5px solid var(--gray-200)', background:'#fff', fontFamily:'var(--font-ui)', fontSize:13, cursor:'pointer' }}>Cancel</button>
                  <button onClick={async () => {
                    const newDt = document.getElementById('reschedule-dt').value;
                    if (!newDt) return;
                    try {
                      // Cancel old + create new
                      await fetch(`${API_BASE}/api/agent/upcoming/${rescheduleId}/cancel`, { method:'PUT', headers: authHeaders() });
                      const old = calls.find(c => c.id === rescheduleId);
                      const res = await fetch(`${API_BASE}/api/agent/book-call`, {
                        method:'POST', headers: authHeaders(),
                        body: JSON.stringify({ agentId, propertyId: old?.propertyId, customerName: old?.customerName, customerMobile: old?.customerMobile, scheduledAt: newDt, source:'AGENT_SCHEDULED', note: 'Rescheduled by agent' })
                      });
                      const newCall = await res.json();
                      setCalls(prev => [...prev.filter(c => c.id !== rescheduleId), newCall].sort((a,b) => new Date(a.scheduledAt) - new Date(b.scheduledAt)));
                      setRescheduleId(null);
                    } catch { alert('Failed to reschedule. Please try again.'); }
                  }}
                          style={{ padding:'10px 22px', borderRadius:8, border:'none', background:'var(--blue-600)', color:'#fff', fontFamily:'var(--font-ui)', fontSize:13, fontWeight:700, cursor:'pointer' }}>
                    Confirm Reschedule
                  </button>
                </div>
              </div>
            </div>
        )}
      </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   PAGE: Settings
   ───────────────────────────────────────────────────────────── */
function SettingsPage({ agent, onAgentUpdate }) {
  const [notifs,   setNotifs]   = useState(true);
  const [sounds,   setSounds]   = useState(true);
  const [darkMode, setDark]     = useState(() => {
    const saved = localStorage.getItem('agent_dark_mode');
    if (saved === '1') { document.documentElement.setAttribute('data-theme', 'dark'); return true; }
    return false;
  });
  const [editField, setEditField] = useState(null);
  const [nameVal,   setNameVal]   = useState(agent.name  || '');
  const [phoneVal,  setPhoneVal]  = useState(agent.phone || '');
  const [saving,    setSaving]    = useState(false);
  const [saveMsg,   setSaveMsg]   = useState('');

  const agentId = agent.agentId || agent.id;

  const handleSave = async (field) => {
    setSaving(true); setSaveMsg('');
    try {
      const body = { agentId, name: field === 'name' ? nameVal : agent.name, phone: field === 'phone' ? phoneVal : agent.phone };
      const res  = await fetch(`${API_BASE}/api/agent/profile`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify(body) });
      if (!res.ok) throw new Error();
      const data = await res.json();
      onAgentUpdate?.({ ...agent, ...data });
      setSaveMsg('Saved ✓');
    } catch {
      setSaveMsg('Save failed. Please try again.');
    } finally {
      setSaving(false);
      setEditField(null);
      setTimeout(() => setSaveMsg(''), 3000);
    }
  };

  const handleCancel = () => { setNameVal(agent.name || ''); setPhoneVal(agent.phone || ''); setEditField(null); };

  const iStyle = { flex: 1, padding: '7px 12px', borderRadius: 8, border: '1.5px solid var(--blue-300)', fontFamily: 'var(--font-ui)', fontSize: 14, outline: 'none' };

  return (
      <div className="page">
        <div className="page-header"><h1 className="page-title">Settings</h1></div>

        {/* ── Profile ── */}
        <div className="settings-section">
          <div className="settings-section-title">Profile</div>
          <div className="content-card">
            {saveMsg && (
                <div style={{ padding: '10px 16px', marginBottom: 0, borderRadius: 0, fontSize: 13, fontFamily: 'var(--font-ui)', background: saveMsg.includes('✓') ? '#dcfce7' : '#fee2e2', color: saveMsg.includes('✓') ? '#15803d' : '#dc2626' }} role="status">
                  {saveMsg}
                </div>
            )}

            {/* Name */}
            <div className="settings-row">
              <div style={{ flex: 1 }}>
                <div className="settings-row-label">Display Name</div>
                {editField === 'name' ? (
                    <div style={{ display: 'flex', gap: 8, marginTop: 6, alignItems: 'center' }}>
                      <input autoFocus value={nameVal} onChange={e => setNameVal(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleSave('name'); if (e.key === 'Escape') handleCancel(); }} style={iStyle} aria-label="Display name" />
                      <button onClick={() => handleSave('name')} disabled={saving} style={{ padding: '7px 14px', borderRadius: 8, border: 'none', background: 'var(--blue-600)', color: '#fff', fontFamily: 'var(--font-ui)', fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>{saving ? '…' : 'Save'}</button>
                      <button onClick={handleCancel} style={{ padding: '7px 12px', borderRadius: 8, border: '1.5px solid var(--gray-200)', background: '#fff', fontFamily: 'var(--font-ui)', fontSize: 13, cursor: 'pointer' }}>Cancel</button>
                    </div>
                ) : (
                    <div className="settings-row-desc">{agent.name}</div>
                )}
              </div>
              {editField !== 'name' && <button onClick={() => setEditField('name')} style={{ padding: '7px 16px', borderRadius: 8, border: '1.5px solid var(--gray-200)', background: 'white', fontFamily: 'var(--font-ui)', fontSize: 13, cursor: 'pointer' }}>Edit</button>}
            </div>

            {/* Email — read only */}
            <div className="settings-row">
              <div><div className="settings-row-label">Email</div><div className="settings-row-desc">{agent.email}</div></div>
            </div>

            {/* Phone */}
            <div className="settings-row">
              <div style={{ flex: 1 }}>
                <div className="settings-row-label">Phone</div>
                {editField === 'phone' ? (
                    <div style={{ display: 'flex', gap: 8, marginTop: 6, alignItems: 'center' }}>
                      <input autoFocus value={phoneVal} onChange={e => setPhoneVal(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleSave('phone'); if (e.key === 'Escape') handleCancel(); }} style={iStyle} type="tel" aria-label="Phone number" />
                      <button onClick={() => handleSave('phone')} disabled={saving} style={{ padding: '7px 14px', borderRadius: 8, border: 'none', background: 'var(--blue-600)', color: '#fff', fontFamily: 'var(--font-ui)', fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>{saving ? '…' : 'Save'}</button>
                      <button onClick={handleCancel} style={{ padding: '7px 12px', borderRadius: 8, border: '1.5px solid var(--gray-200)', background: '#fff', fontFamily: 'var(--font-ui)', fontSize: 13, cursor: 'pointer' }}>Cancel</button>
                    </div>
                ) : (
                    <div className="settings-row-desc">{agent.phone || '—'}</div>
                )}
              </div>
              {editField !== 'phone' && <button onClick={() => setEditField('phone')} style={{ padding: '7px 16px', borderRadius: 8, border: '1.5px solid var(--gray-200)', background: 'white', fontFamily: 'var(--font-ui)', fontSize: 13, cursor: 'pointer' }}>Edit</button>}
            </div>

            {/* Designation */}
            <div className="settings-row">
              <div style={{ flex: 1 }}>
                <div className="settings-row-label">Designation / Role</div>
                {editField === 'designation' ? (
                    <div style={{ display: 'flex', gap: 8, marginTop: 6, alignItems: 'center' }}>
                      <input autoFocus value={nameVal} onChange={e => setNameVal(e.target.value)}
                             onKeyDown={e => { if (e.key === 'Enter') handleSave('designation'); if (e.key === 'Escape') handleCancel(); }}
                             style={iStyle} placeholder="e.g. Senior Property Consultant" aria-label="Designation" />
                      <button onClick={() => handleSave('designation')} disabled={saving} style={{ padding: '7px 14px', borderRadius: 8, border: 'none', background: 'var(--blue-600)', color: '#fff', fontFamily: 'var(--font-ui)', fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>{saving ? '…' : 'Save'}</button>
                      <button onClick={handleCancel} style={{ padding: '7px 12px', borderRadius: 8, border: '1.5px solid var(--gray-200)', background: '#fff', fontFamily: 'var(--font-ui)', fontSize: 13, cursor: 'pointer' }}>Cancel</button>
                    </div>
                ) : (
                    <div className="settings-row-desc">{agent.designation || '—'}</div>
                )}
              </div>
              {editField !== 'designation' && <button onClick={() => { setNameVal(agent.designation || ''); setEditField('designation'); }} style={{ padding: '7px 16px', borderRadius: 8, border: '1.5px solid var(--gray-200)', background: 'white', fontFamily: 'var(--font-ui)', fontSize: 13, cursor: 'pointer' }}>Edit</button>}
            </div>
          </div>
        </div>

        {/* ── Security ── */}
        <div className="settings-section">
          <div className="settings-section-title">Security</div>
          <div className="content-card">
            <div className="settings-row">
              <div>
                <div className="settings-row-label">Password</div>
                <div className="settings-row-desc">Last changed: unknown</div>
              </div>
              <button
                  onClick={() => alert('Password change via email link — feature coming soon.')}
                  style={{ padding: '7px 16px', borderRadius: 8, border: '1.5px solid var(--gray-200)', background: 'white', fontFamily: 'var(--font-ui)', fontSize: 13, cursor: 'pointer' }}
              >Change</button>
            </div>
            <div className="settings-row">
              <div>
                <div className="settings-row-label">Active Sessions</div>
                <div className="settings-row-desc">You are logged in on this device</div>
              </div>
              <button
                  onClick={() => { localStorage.clear(); window.location.reload(); }}
                  style={{ padding: '7px 16px', borderRadius: 8, border: '1.5px solid #fca5a5', background: '#fff1f2', color: '#dc2626', fontFamily: 'var(--font-ui)', fontSize: 13, cursor: 'pointer', fontWeight: 600 }}
              >Sign Out All</button>
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
              { label: 'Dark Mode',           desc: 'Toggle dark theme',               val: darkMode, set: (fn) => {
                  const next = typeof fn === 'function' ? fn(darkMode) : fn;
                  setDark(next);
                  document.documentElement.setAttribute('data-theme', next ? 'dark' : 'light');
                  localStorage.setItem('agent_dark_mode', next ? '1' : '0');
                }},
            ].map(row => (
                <div key={row.label} className="settings-row">
                  <div><div className="settings-row-label">{row.label}</div><div className="settings-row-desc">{row.desc}</div></div>
                  <div className={`toggle-track-outer ${row.val ? 'on' : 'off'}`} style={{ cursor: 'pointer' }} onClick={() => row.set(v => !v)} role="switch" aria-checked={row.val} aria-label={row.label} tabIndex={0} onKeyDown={e => e.key === 'Enter' && row.set(v => !v)}>
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
   COMPONENT: PropertyMiniCard
   ───────────────────────────────────────────────────────────── */
function PropertyMiniCard({ property }) {
  if (!property) return null;
  const fmt = p => {
    const n = Number(p);
    if (!p || isNaN(n)) return 'Price on request';
    if (n >= 10_000_000) return `₹ ${(n / 10_000_000).toFixed(2)} Cr`;
    if (n >= 100_000)    return `₹ ${(n / 100_000).toFixed(2)} L`;
    return `₹ ${n.toLocaleString('en-IN')}`;
  };
  const img = property.mainImages?.[0] || property.images?.[0] || property.image;
  return (
      <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid #e2e8f0', marginBottom: 12 }}>
        {img && <img src={img} alt={property.title} style={{ width: '100%', height: 130, objectFit: 'cover', display: 'block' }} />}
        <div style={{ padding: '10px 12px' }}>
          <div style={{ fontWeight: 800, fontSize: 14, color: '#0f172a', marginBottom: 4 }}>{property.title}</div>
          <div style={{ fontSize: 12, color: '#64748b', marginBottom: 6 }}>📍 {property.location}</div>
          <div style={{ fontWeight: 800, fontSize: 14, color: '#0b63e5' }}>{fmt(property.price)}</div>
          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 3 }}>{property.type} · {property.sqft} sqft</div>
        </div>
      </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   PAGE: Video Call Screen
   ───────────────────────────────────────────────────────────── */
function VideoCallScreen({ caller, agent, property, onEnd }) {
  const [micOn,       setMicOn]      = useState(true);
  const [camOn,       setCamOn]      = useState(true);
  const [elapsed,     setElapsed]    = useState(0);
  const [chatMsg,     setChatMsg]    = useState('');
  const [messages,    setMessages]   = useState([]);
  const [isRecording, setIsRecording]= useState(false);
  const [recDuration, setRecDuration]= useState(0);
  const [sharedFiles, setSharedFiles]= useState([]);

  const jitsiRef      = useRef(null);
  const jitsiApi      = useRef(null);
  const mediaRecRef   = useRef(null);
  const recChunksRef  = useRef([]);
  const recTimerRef   = useRef(null);
  // Stable refs so the mount effect has zero external dependencies
  // and never needs to re-run when props change
  const onEndRef   = useRef(onEnd);
  const callerRef  = useRef(caller);
  const agentRef   = useRef(agent);

  // Keep refs in sync with latest props every render
  useEffect(() => { onEndRef.current  = onEnd;   });
  useEffect(() => { callerRef.current = caller;  });
  useEffect(() => { agentRef.current  = agent;   });

  // Elapsed timer — runs once on mount, no deps needed
  useEffect(() => {
    const t = setInterval(() => setElapsed(s => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  // Mount Jitsi — JaaS powered. Runs once on mount only.
  // Props accessed through stable refs to avoid stale closures.
  useEffect(() => {
    // Use UUID room the customer joined — passed via WebSocket payload.
    // Falls back to date-based name for backwards compatibility.
    const callerRoomName = callerRef.current.roomName;
    const today    = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const propId   = callerRef.current.propertyId || callerRef.current.property || 'tour';
    const roomName = callerRoomName || `ogmLive${propId}${today}`;  // alphanumeric fallback

    const load = async () => {
      if (!jitsiRef.current) return;

      // Agent is always moderator — can control the room
      const jwt = await fetchJaasToken(agentRef.current.name, roomName, true);

      // JaaS room name must be prefixed with App ID
      const jaasRoom = JAAS_APP_ID ? `${JAAS_APP_ID}/${roomName}` : roomName;
      const domain   = JAAS_APP_ID ? '8x8.vc' : JITSI_HOST;

      const apiOptions = {
        roomName:   jaasRoom,
        parentNode: jitsiRef.current,
        width:      '100%',
        height:     '100%',
        userInfo:   { displayName: agentRef.current.name },
        configOverwrite: {
          prejoinPageEnabled:          false,
          prejoinConfig:               { enabled: false },
          startWithAudioMuted:         false,
          startWithVideoMuted:         false,
          disableDeepLinking:          true,
          enableClosePage:             false,
          disableAudioLevels:          false,
          enableNoisyMicDetection:     false,
          enableNoAudioDetection:      false,
          p2p:                         { enabled: false },
          fileRecordingsEnabled:        true,
          toolbarButtons: ['microphone','camera','desktop','chat','file-sharing','raisehand','tileview','participants-pane','hangup'],
        },
        interfaceConfigOverwrite: {
          SHOW_JITSI_WATERMARK:             false,
          SHOW_BRAND_WATERMARK:             false,
          SHOW_POWERED_BY:                  false,
          DISABLE_JOIN_LEAVE_NOTIFICATIONS: true,
          TOOLBAR_ALWAYS_VISIBLE:           true,
          SHOW_CHROME_EXTENSION_BANNER:     false,
          MOBILE_APP_PROMO:                 false,
        },
      };
      if (jwt) apiOptions.jwt = jwt;

      const initApi = () => {
        jitsiApi.current = new window.JitsiMeetExternalAPI(domain, apiOptions);

        jitsiApi.current.addListener('videoConferenceJoined', () => {
          // Set clean subject — hides the room hash displayed by JaaS
          try { jitsiApi.current.executeCommand('subject', 'OGM Live Property Tour'); } catch {}
          try {
            const iframe = jitsiRef.current?.querySelector('iframe');
            if (iframe?.contentDocument) {
              const style = iframe.contentDocument.createElement('style');
              style.textContent = `
                #jitsiLogo, .watermark, .leftwatermark, .rightwatermark,
                .powered-by-div, [class*="watermark"],
                .subject, [class*="subject"], #subject { display: none !important; }
              `;
              iframe.contentDocument.head.appendChild(style);
            }
          } catch { /* cross-origin — silent fail */ }
        });

        jitsiApi.current.addEventListeners({
          participantLeft: () => onEndRef.current?.(),
          readyToClose:    () => onEndRef.current?.(),
        });
      };

      const scriptSrc = JAAS_APP_ID
          ? `https://8x8.vc/${JAAS_APP_ID}/external_api.js`
          : `https://${JITSI_HOST}/external_api.js`;

      if (!window.JitsiMeetExternalAPI) {
        const s  = document.createElement('script');
        s.src    = scriptSrc;
        s.async  = true;
        s.onload = initApi;
        document.body.appendChild(s);
      } else {
        initApi();
      }
    };

    load();
    return () => { jitsiApi.current?.dispose(); };
  }, []); // mount-only — props accessed via refs above

  const fmtElapsed = s => `${String(Math.floor(s / 60)).padStart(2,'0')}:${String(s % 60).padStart(2,'0')}`;

  const startRecording = async () => {
    try {
      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
          ? 'video/webm;codecs=vp9,opus' : 'video/webm';
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { displaySurface: 'browser', cursor: 'always' },
        audio: { echoCancellation: false, noiseSuppression: false },
        preferCurrentTab: true,
      });
      recChunksRef.current = [];
      const mr = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 2500000 });
      mr.ondataavailable = e => { if (e.data.size > 0) recChunksRef.current.push(e.data); };
      mr.onstop = () => {
        const blob = new Blob(recChunksRef.current, { type: 'video/webm' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        const now  = new Date().toISOString().slice(0,19).replace(/[T:]/g,'-');
        a.href     = url;
        a.download = `ogm-agent-tour-${now}.webm`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 5000);
        stream.getTracks().forEach(t => t.stop());
        setIsRecording(false);
        clearInterval(recTimerRef.current);
        setRecDuration(0);
      };
      stream.getVideoTracks()[0].onended = () => mr.stop();
      mr.start(1000);
      mediaRecRef.current = mr;
      setIsRecording(true);
      setRecDuration(0);
      recTimerRef.current = setInterval(() => setRecDuration(s => s + 1), 1000);
    } catch (err) {
      if (err.name !== 'AbortError' && err.name !== 'NotAllowedError') {
        console.warn('Agent recording failed:', err);
      }
    }
  };

  const stopRecording = () => { mediaRecRef.current?.stop(); };

  const sendMsg = () => {
    if (!chatMsg.trim()) return;
    const time = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    setMessages(m => [...m, { id: Date.now(), author: toInitials(agent.name), name: agent.name, time, text: chatMsg.trim() }]);
    setChatMsg('');
  };

  return (
      <div className="vc-screen" role="main" aria-label="Live video call">
        {/* Top bar */}
        <div className="vc-topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div className="vc-brand-badge">
              <div style={{ width:20,height:20,borderRadius:6,background:'linear-gradient(135deg,#3b82f6,#f97316)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,fontWeight:900,color:'white',flexShrink:0 }}>OG</div>
              OGM Live
              <span className="vc-live-dot" aria-hidden="true" style={{ marginLeft:4 }} />
            </div>
            <div className="vc-status-text">
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--green-500)', display: 'inline-block' }} aria-hidden="true" />
              Live Tour in Progress
            </div>
          </div>
          <div className="vc-topbar-right">
            <div className="vc-connected"><span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--green-500)', display: 'inline-block' }} aria-hidden="true" />Connected</div>
            <button
                onClick={isRecording ? stopRecording : startRecording}
                title={isRecording ? 'Stop & save recording' : 'Record this tour'}
                style={{ display:'flex', alignItems:'center', gap:5, padding:'4px 10px', borderRadius:6, border:'none', background: isRecording ? 'rgba(220,38,38,0.85)' : 'rgba(255,255,255,0.12)', color:'white', fontSize:11, fontWeight:700, cursor:'pointer' }}
            >
              <span style={{ width:7,height:7,borderRadius:'50%',background:'#ef4444',display:'inline-block' }} />
              {isRecording ? `REC ${fmtElapsed(recDuration)}` : 'REC'}
            </button>
            <span className="vc-elapsed" aria-live="polite">{fmtElapsed(elapsed)}</span>
          </div>
        </div>

        {/* Body */}
        <div className="vc-body">
          {/* Video */}
          <div className="vc-video-main">
            {/* Jitsi fills the entire container — it renders its own controls, pip, and room label */}
            <div className="vc-jitsi-container" ref={jitsiRef} />

            {/* Center Jitsi label hidden — no overlay needed */}

            {/* Premium OGM badge — covers Jitsi logo, frosted glass style */}
            <div style={{
              position: 'absolute', top: 8, left: 8, zIndex: 9999,
              display: 'flex', alignItems: 'center', gap: 10,
              background: 'rgba(10,14,20,0.88)',
              backdropFilter: 'blur(14px)',
              WebkitBackdropFilter: 'blur(14px)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 12,
              padding: '8px 16px 8px 9px',
              pointerEvents: 'none',
              boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
              minWidth: 140,
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: 9,
                background: 'linear-gradient(135deg, #3b82f6, #f97316)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, fontWeight: 900, color: 'white', flexShrink: 0,
                boxShadow: '0 3px 10px rgba(59,130,246,0.55)',
              }}>OG</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span style={{ color: 'white', fontFamily: 'var(--font-ui)', fontSize: 14, fontWeight: 800, lineHeight: 1, letterSpacing: 0.2 }}>OGM Live</span>
                <span style={{ color: 'rgba(255,255,255,0.5)', fontFamily: 'var(--font-ui)', fontSize: 11, lineHeight: 1 }}>Property Tour</span>
              </div>
            </div>

            {/* End Tour button — bottom-left, clear of the face */}
            <button
                onClick={onEnd}
                aria-label="End tour and return to dashboard"
                style={{
                  position: 'absolute',
                  bottom: 80,
                  left: 16,
                  zIndex: 9999,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '9px 18px',
                  background: 'rgba(220,38,38,0.92)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 8,
                  fontFamily: 'var(--font-ui)',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                  backdropFilter: 'blur(4px)',
                  boxShadow: '0 4px 14px rgba(220,38,38,0.5)',
                }}
            >
              <Icon.PhoneOff /> End Tour
            </button>
          </div>

          {/* Sidebar */}
          <aside className="vc-sidebar" aria-label="Call details">
            {/* Property */}
            <div className="vc-prop-section">
              <div className="vc-prop-heading">Property</div>
              {property
                  ? <PropertyMiniCard property={property} />
                  : <><div className="vc-prop-img"><span style={{ fontSize: 13, color: 'var(--gray-400)' }}>No property image</span></div><div className="vc-prop-name">{caller.property}</div></>
              }
            </div>

            {/* Client */}
            <div className="vc-client-section">
              <div className="vc-client-name-row"><Icon.PhoneIcon />{caller.name}</div>
              {caller.mobile && <div className="vc-contact-row"><Icon.PhoneIcon />{caller.mobile}</div>}
              {caller.email  && <div className="vc-contact-row"><Icon.Mail />{caller.email}</div>}
              {!caller.mobile && !caller.email && <div className="vc-contact-row" style={{ color: 'var(--gray-400)', fontSize: 12 }}>No contact details</div>}
            </div>

            {/* In-call chat */}
            <div className="vc-chat-section">
              <div className="vc-chat-heading">Notes / Chat</div>
              <div className="vc-chat-messages" aria-live="polite">
                {messages.length === 0 && (
                    <div style={{ fontSize: 12, color: 'var(--gray-400)', textAlign: 'center', marginTop: 12 }}>
                      Add notes or send a message…
                    </div>
                )}
                {messages.map(msg => (
                    <div key={msg.id} className="chat-msg">
                      <div className="chat-avatar">{msg.author}</div>
                      <div>
                        <div className="chat-header">
                          <span className="chat-name">{msg.name}</span>
                          <span className="chat-time">{msg.time}</span>
                        </div>
                        <div className="chat-text">{msg.text}</div>
                      </div>
                    </div>
                ))}
              </div>
              {/* Shared files list */}
              {sharedFiles.length > 0 && (
                  <div style={{ padding:'6px 12px', borderTop:'0.5px solid var(--gray-100)' }}>
                    <div style={{ fontSize:10, fontWeight:700, color:'var(--gray-400)', textTransform:'uppercase', letterSpacing:.4, marginBottom:4 }}>Shared Files</div>
                    {sharedFiles.map((f,i) => (
                        <div key={i} style={{ display:'flex', alignItems:'center', gap:6, padding:'4px 0', fontSize:12 }}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--blue-500)" strokeWidth="2"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>
                          <a href={f.url} target="_blank" rel="noreferrer" style={{ color:'var(--blue-500)', fontWeight:500, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:140 }}>{f.name}</a>
                          <span style={{ fontSize:10, color:'var(--gray-400)', marginLeft:'auto', flexShrink:0 }}>{f.size}</span>
                        </div>
                    ))}
                  </div>
              )}

              <div className="vc-chat-input-row">
                <input
                    className="vc-chat-input"
                    placeholder="Type a note…"
                    value={chatMsg}
                    onChange={e => setChatMsg(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && sendMsg()}
                    aria-label="Chat message"
                />
                {/* Attachment button */}
                <label style={{ cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', width:32, height:32, borderRadius:6, background:'var(--gray-50)', border:'0.5px solid var(--gray-200)', flexShrink:0 }} title="Attach file">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--gray-500)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
                  </svg>
                  <input type="file" style={{ display:'none' }} multiple accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip"
                         onChange={e => {
                           const files = Array.from(e.target.files || []);
                           files.forEach(file => {
                             const url = URL.createObjectURL(file);
                             const size = file.size > 1024*1024 ? `${(file.size/1024/1024).toFixed(1)}MB` : `${(file.size/1024).toFixed(0)}KB`;
                             setSharedFiles(prev => [...prev, { name: file.name, url, size }]);
                             // Add to chat messages
                             const time = new Date().toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit' });
                             setMessages(m => [...m, { id: Date.now(), author: toInitials(agent?.name || 'A'), name: agent?.name || 'Agent', time, text: `📎 ${file.name} (${size})`, isFile: true, fileUrl: url }]);
                           });
                           e.target.value = '';
                         }}
                  />
                </label>
                <button className="vc-send-btn" onClick={sendMsg} aria-label="Send message"><Icon.Send /></button>
              </div>
            </div>
          </aside>
        </div>
      </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   ROOT: AgentAdminApp
   ═════════════════════════════════════════════════════════════ */
export default function AgentAdminApp() {
  const [agent,         setAgent]         = useState(null);
  const [page,          setPage]          = useState('dashboard');
  const [available,     setAvailable]     = useState(true);
  const [availSaving,   setAvailSaving]   = useState(false);
  const [activeCaller,  setActiveCaller]  = useState(null);
  const [incomingCaller,setIncomingCaller]= useState(null);
  const [restoring,     setRestoring]     = useState(true);

  const { findProperty, findPropertyById } = useProperties();

  /* ── WebSocket incoming call handler ── */
  // Production: auto-decline if agent doesn't respond in 60 seconds
  const incomingTimerRef = useRef(null);

  const handleIncomingCallWS = useCallback((data) => {
    // Clear any existing timeout
    if (incomingTimerRef.current) clearTimeout(incomingTimerRef.current);
    // Auto-dismiss after 60 seconds
    incomingTimerRef.current = setTimeout(() => {
      setIncomingCaller(null);
    }, 60000);

    setIncomingCaller({
      name:          data.callerName  || 'Unknown Caller',
      initials:      toInitials(data.callerName),
      property:      data.propertyId?.toString() || 'Unknown Property',
      propertyId:    data.propertyId  || null,
      roomName:      data.roomName    || null,   // ← UUID room from customer — MUST match
      mobile:        data.callerMobile || null,
      email:         null,
      photoUrl:      data.callerPhotoUrl || null,
      queuePosition: data.queuePosition || 0,
    });
  }, []);

  /* ── WebSocket availability push (e.g. admin forced offline) ── */
  const handleAvailabilityWS = useCallback((data) => {
    setAvailable(!!data.online);
  }, []);

  const agentId  = agent?.agentId || agent?.id;
  const { wsStatus } = useWebSocket(agentId, handleIncomingCallWS, handleAvailabilityWS);

  /* ── Restore session from localStorage ── */
  useEffect(() => {
    const token  = localStorage.getItem('agent_token');
    const cached = localStorage.getItem('agent_data');
    if (token && cached) {
      try {
        const parsed = JSON.parse(cached);
        fetch(`${API_BASE}/api/agent/profile?agentId=${parsed.agentId}`, { headers: authHeaders() })
            .then(r => r.ok ? r.json() : Promise.reject())
            .then(data => {
              const localPhoto = localStorage.getItem('agent_photo_' + data.agentId);
              setAgent({ ...data, token, _localPhoto: localPhoto || null });
            })
            .catch(() => {
              localStorage.removeItem('agent_token');
              localStorage.removeItem('agent_data');
            })
            .finally(() => setRestoring(false));
      } catch { setRestoring(false); }
    } else {
      setRestoring(false);
    }
  }, []);

  /* ── Auth ── */
  const handleLogin = useCallback((data) => {
    localStorage.setItem('agent_token', data.token);
    localStorage.setItem('agent_data', JSON.stringify(data));
    // Load stored local photo
    const localPhoto = localStorage.getItem('agent_photo_' + data.agentId);
    setAgent({ ...data, _localPhoto: localPhoto || null });
    setPage('dashboard');
  }, []);

  const handleLogout = useCallback(() => {
    localStorage.removeItem('agent_token');
    localStorage.removeItem('agent_data');
    setAgent(null);
    setIncomingCaller(null);
    setActiveCaller(null);
  }, []);

  /* ── Availability toggle (persists to backend) ── */
  const handleToggleAvailable = useCallback(async () => {
    const next = !available;
    setAvailable(next);
    setAvailSaving(true);
    try {
      await fetch(`${API_BASE}/api/agent/availability`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ agentId, online: next, busy: false }),
      });
    } catch {
      // Revert on failure
      setAvailable(!next);
    } finally {
      setAvailSaving(false);
    }
  }, [available, agentId]);

  /* ── Call actions ── */
  const handleAcceptCall = useCallback(async () => {
    if (incomingTimerRef.current) clearTimeout(incomingTimerRef.current);
    const caller = incomingCaller;
    setActiveCaller(caller);
    setIncomingCaller(null);
    setAvailable(false);

    // Mark agent busy
    fetch(`${API_BASE}/api/agent/availability`, {
      method: 'PUT', headers: authHeaders(),
      body: JSON.stringify({ agentId, online: true, busy: true }),
    }).catch(() => {});

    // ✅ Create session record in DB — this makes it appear in call history
    try {
      const res = await fetch(`${API_BASE}/api/live-tour/start-session`, {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId,
          propertyId:  caller.propertyId || null,
          callerName:  caller.name,
          callerMobile: caller.mobile || '',
          roomName:    caller.roomName || '',
        }),
      });
      if (res.ok) {
        const data = await res.json();
        // Store sessionId on activeCaller so end-session can use it
        setActiveCaller(prev => prev ? { ...prev, sessionId: data.sessionId || data.id } : prev);
      }
    } catch { /* non-critical — UI still works */ }
  }, [incomingCaller, agentId]);

  const handleDeclineCall = useCallback(() => {
    if (incomingTimerRef.current) clearTimeout(incomingTimerRef.current);
    setIncomingCaller(null);
  }, []);

  const handleEndCall = useCallback(async () => {
    const sessionId = activeCaller?.sessionId;

    // End session in DB — marks status as completed
    if (sessionId) {
      try {
        await fetch(`${API_BASE}/api/live-tour/end-session/${sessionId}`, {
          method: 'POST',
          headers: authHeaders(),
        });
      } catch { /* non-critical */ }
    }

    setActiveCaller(null);
    setAvailable(true);

    // Mark agent available again
    fetch(`${API_BASE}/api/agent/availability`, {
      method: 'PUT', headers: authHeaders(),
      body: JSON.stringify({ agentId, online: true, busy: false }),
    }).catch(() => {});
  }, [activeCaller, agentId]);

  // ── Production: cleanup session if agent closes browser mid-call ──────────
  useEffect(() => {
    const handleUnload = () => {
      const sessionId = activeCaller?.sessionId;
      if (sessionId) {
        // Use sendBeacon — works even during page unload (fetch doesn't)
        const url = `${API_BASE}/api/live-tour/end-session/${sessionId}`;
        const token = localStorage.getItem('agent_token') || '';
        navigator.sendBeacon(url, new Blob(
            [JSON.stringify({ beacon: true })],
            { type: 'application/json' }
        ));
      }
      // Mark agent available on close
      const agId = agent?.agentId || agent?.id;
      if (agId) {
        const url2 = `${API_BASE}/api/agent/availability`;
        const token = localStorage.getItem('agent_token') || '';
        navigator.sendBeacon(url2, new Blob(
            [JSON.stringify({ agentId: agId, online: false, busy: false })],
            { type: 'application/json' }
        ));
      }
    };
    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, [activeCaller, agent]);

  const handleJoinFromUpcoming = useCallback((item) => {
    setActiveCaller(item);
  }, []);

  const handleAgentUpdate = useCallback((updated) => {
    setAgent(updated);
    localStorage.setItem('agent_data', JSON.stringify(updated));
  }, []);

  /* ── Restoring session ── */
  if (restoring) {
    return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#edf0f8' }}>
          <span className="login-spinner" style={{ borderTopColor: '#3b82f6', width: 44, height: 44, borderWidth: 3 }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );
  }

  /* ── Not logged in ── */
  if (!agent) return <LoginPage onLogin={handleLogin} />;

  /* ── Video call active — full screen ── */
  if (activeCaller) {
    return (
        <VideoCallScreen
            caller={activeCaller}
            agent={agent}
            property={findPropertyById(activeCaller.propertyId) || findProperty(activeCaller.property)}
            onEnd={handleEndCall}
        />
    );
  }

  /* ── Main dashboard ── */
  const renderPage = () => {
    const aid = agent.agentId || agent.id;
    switch (page) {
      case 'dashboard':
        return <DashboardPage agent={agent} available={available} onToggleAvailable={handleToggleAvailable} availSaving={availSaving} onAgentUpdate={handleAgentUpdate} />;
      case 'call-history':
        return <CallHistoryPage agentId={aid} />;
      case 'availability':
        return <AvailabilityPage agentId={aid} />;
      case 'upcoming-calls':
        return <UpcomingCallsPage onJoinCall={handleJoinFromUpcoming} agentId={aid} />;
      case 'settings':
        return <SettingsPage agent={agent} onAgentUpdate={handleAgentUpdate} />;
      default:
        return null;
    }
  };

  return (
      <>
        <div className="app-layout">
          <Sidebar active={page} onNav={setPage} onLogout={handleLogout} wsStatus={wsStatus} />
          <main className="main-content" id="main-content">
            {renderPage()}
          </main>
        </div>

        {/* Incoming call overlay */}
        {incomingCaller && (
            <IncomingCallModal
                caller={incomingCaller}
                onAccept={handleAcceptCall}
                onDecline={handleDeclineCall}
            />
        )}
      </>
  );
}