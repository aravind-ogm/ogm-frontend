import React, { useState, useCallback, useRef, useEffect, memo } from "react";
import { useNavigate } from "react-router-dom";

function AiBottomSearchBar({ onSend }) {
  const [text,      setText]      = useState("");
  const [recording, setRecording] = useState(false);
  const [loading,   setLoading]   = useState(false);
  const inputRef    = useRef(null);
  const fileRef     = useRef(null);
  const recognRef   = useRef(null);
  const navigate    = useNavigate();

  /* ── Send ── */
  const handleSend = useCallback(() => {
    const query = text.trim();
    if (!query || loading) return;
    if (onSend) {
      onSend(query);
      setText("");
    } else {
      setLoading(true);
      setTimeout(() => {
        navigate("/ai-search", { state: { question: query } });
        setText("");
        setLoading(false);
      }, 120);
    }
  }, [text, loading, onSend, navigate]);

  /* ── Attach — opens file picker ── */
  const handleAttach = useCallback(() => {
    fileRef.current?.click();
  }, []);

  const handleFileChange = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Notify parent with file name as context; extend as needed
    const msg = `[Attached file: ${file.name}]`;
    if (onSend) onSend(msg);
    e.target.value = "";
  }, [onSend]);

  /* ── Microphone — Web Speech API ── */
  const handleRecord = useCallback(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Voice input is not supported in this browser. Please use Chrome.");
      return;
    }

    if (recording) {
      recognRef.current?.stop();
      setRecording(false);
      return;
    }

    const recog = new SpeechRecognition();
    recog.lang             = "en-IN";
    recog.interimResults   = true;
    recog.continuous       = false;
    recognRef.current      = recog;

    recog.onstart  = () => setRecording(true);
    recog.onend    = () => setRecording(false);
    recog.onerror  = () => setRecording(false);

    recog.onresult = (e) => {
      const transcript = Array.from(e.results)
        .map((r) => r[0].transcript)
        .join("");
      setText(transcript);
      // Auto-send when final result comes in
      if (e.results[e.results.length - 1].isFinal) {
        setTimeout(() => {
          if (transcript.trim()) {
            if (onSend) { onSend(transcript.trim()); setText(""); }
          }
        }, 300);
      }
    };

    recog.start();
  }, [recording, onSend]);

  /* ── Stop recognition on unmount ── */
  useEffect(() => {
    return () => recognRef.current?.stop();
  }, []);

  return (
    <div className="abs-bar">

      {/* ── 70% white input zone ── */}
      <div className="abs-input-zone">
        <svg className="abs-search-icon" width="18" height="18" viewBox="0 0 24 24"
          fill="none" stroke="#aab4c4" strokeWidth="2.2" strokeLinecap="round">
          <circle cx="11" cy="11" r="7"/>
          <line x1="16.5" y1="16.5" x2="22" y2="22"/>
        </svg>
        <input
          ref={inputRef}
          className="abs-input"
          placeholder="Ask AI about properties…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          disabled={loading}
          autoComplete="off"
          aria-label="Ask AI property agent"
        />
        {text && (
          <button className="abs-clear" type="button" aria-label="Clear"
            onClick={() => { setText(""); inputRef.current?.focus(); }}>✕</button>
        )}
      </div>

      {/* ── 30% orange action zone ── */}
      <div className="abs-action-zone">

        {/* Attachment */}
        <button className="abs-action-btn" type="button"
          onClick={handleAttach} aria-label="Attach file" title="Attach file">
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
          </svg>
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*,.pdf,.doc,.docx"
          style={{ display: "none" }}
          aria-hidden="true"
          onChange={handleFileChange}
        />

        {/* Microphone */}
        <button
          className={`abs-action-btn${recording ? " abs-recording" : ""}`}
          type="button"
          onClick={handleRecord}
          aria-label={recording ? "Stop recording" : "Voice input"}
          title={recording ? "Stop recording" : "Voice input"}
        >
          {recording ? (
            /* Stop icon when recording */
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="none">
              <rect x="6" y="6" width="12" height="12" rx="2"/>
            </svg>
          ) : (
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
              <line x1="12" y1="19" x2="12" y2="23"/>
              <line x1="8"  y1="23" x2="16" y2="23"/>
            </svg>
          )}
          {recording && <span className="abs-rec-dot"/>}
        </button>

        {/* Waveform / Send */}
        <button
          className={`abs-action-btn abs-send${loading ? " abs-loading" : ""}${!text.trim() && !loading ? " abs-send-idle" : ""}`}
          type="button"
          onClick={handleSend}
          disabled={loading}
          aria-label="Send"
          title="Send"
        >
          {loading ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="2" x2="12" y2="6"/>
              <line x1="12" y1="18" x2="12" y2="22"/>
              <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/>
              <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/>
              <line x1="2" y1="12" x2="6" y2="12"/>
              <line x1="18" y1="12" x2="22" y2="12"/>
            </svg>
          ) : (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <line x1="2"  y1="12" x2="2"  y2="12"/>
              <line x1="5"  y1="9"  x2="5"  y2="15"/>
              <line x1="8"  y1="6"  x2="8"  y2="18"/>
              <line x1="11" y1="4"  x2="11" y2="20"/>
              <line x1="14" y1="6"  x2="14" y2="18"/>
              <line x1="17" y1="9"  x2="17" y2="15"/>
              <line x1="20" y1="12" x2="20" y2="12"/>
            </svg>
          )}
        </button>

      </div>
    </div>
  );
}

export default memo(AiBottomSearchBar);