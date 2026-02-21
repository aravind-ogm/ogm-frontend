import React, { useEffect, useRef, useState } from "react";
import "./LiveTourButton.css";

export default function LiveTourButton({ property }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [joinedMeeting, setJoinedMeeting] = useState(false);

  const jitsiContainerRef = useRef(null);
  const apiRef = useRef(null);

  const roomName = `ogm-live-${property?.id}`;

  /* =========================
     LOAD JITSI
  ========================== */
  useEffect(() => {
    if (!joinedMeeting) return;

    const loadJitsi = () => {
      const domain = "meet.jit.si";

      apiRef.current = new window.JitsiMeetExternalAPI(domain, {
        roomName,
        parentNode: jitsiContainerRef.current,
        userInfo: {
          displayName: name || "Guest",
        },
        configOverwrite: {
          startWithAudioMuted: false,
          startWithVideoMuted: false,
        },
        interfaceConfigOverwrite: {
          SHOW_JITSI_WATERMARK: false,
          SHOW_BRAND_WATERMARK: false,
          SHOW_POWERED_BY: false,
          DISABLE_JOIN_LEAVE_NOTIFICATIONS: true,
        },
      });
    };

    if (!window.JitsiMeetExternalAPI) {
      const script = document.createElement("script");
      script.src = "https://meet.jit.si/external_api.js";
      script.async = true;
      script.onload = loadJitsi;
      document.body.appendChild(script);
    } else {
      loadJitsi();
    }

    return () => {
      apiRef.current?.dispose();
    };
  }, [joinedMeeting]);

  /* =========================
     CLOSE MEETING CLEANLY
  ========================== */
  const closeMeeting = () => {
    apiRef.current?.dispose();
    setJoinedMeeting(false);
    setOpen(false);
  };

  return (
    <>
      {/* FLOATING BUTTON */}
      <div className="live-premium-btn" onClick={() => setOpen(true)}>
        <span className="live-dot"></span>
        LIVE TOUR
      </div>

      {open && (
        <div className="premium-overlay">
          <div className="premium-modal">

            {/* PREJOIN */}
            {!joinedMeeting && (
              <div className="prejoin-screen">
                <img
                  src={property?.mainImages?.[0]}
                  alt="property"
                  className="prejoin-bg"
                />

                <div className="prejoin-content">
                  <h2>Join Live Tour</h2>
                  <p>{property?.title}</p>

                  <input
                    type="text"
                    placeholder="Enter your name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />

                  <button
                    onClick={() => setJoinedMeeting(true)}
                    disabled={!name}
                  >
                    Join Live Now
                  </button>

                  <button
                    className="cancel-btn"
                    onClick={() => setOpen(false)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* JITSI */}
            {joinedMeeting && (
              <>
                <button
                  className="jitsi-close-btn"
                  onClick={closeMeeting}
                >
                  ✕
                </button>

                <div
                  className="jitsi-container"
                  ref={jitsiContainerRef}
                ></div>
              </>
            )}

          </div>
        </div>
      )}
    </>
  );
}