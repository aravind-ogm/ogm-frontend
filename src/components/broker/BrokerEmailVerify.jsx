import React, { useEffect, useRef, useState } from "react";
import { verifyEmailWithBackend } from "../../config/phoneEmailService";
import "./BrokerRegistration.css";

const BrokerEmailVerify = ({
                               email,
                               onVerified,
                               stage,
                               onStageChange,
                               panelOnly = false,
                           }) => {
    const [loading, setLoading] = useState(false);
    const [error, setError]     = useState("");
    const scriptLoadedRef       = useRef(false);

    const CLIENT_ID = process.env.REACT_APP_PHONE_EMAIL_CLIENT_ID || "11133177995114758829";

    const isValidEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

    useEffect(() => {
        if (!panelOnly || stage !== "sent") return;

        // Set up listener BEFORE loading script
        window.phoneEmailReceiver = async (userObj) => {
            const userJsonUrl = userObj.user_json_url;
            setLoading(true);
            setError("");
            try {
                const res = await verifyEmailWithBackend(userJsonUrl);
                if (res.verified) {
                    onStageChange("verified");
                    onVerified(res.email);
                }
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        if (scriptLoadedRef.current) return;

        // Exact script URL from phone.email dashboard
        const script = document.createElement("script");
        script.src   = "https://www.phone.email/verify_email_v1.js";
        script.async = true;
        script.onload = () => { scriptLoadedRef.current = true; };
        document.body.appendChild(script);

        return () => { window.phoneEmailReceiver = undefined; };
    }, [panelOnly, stage]);

    // ── Button inside field row ───────────────────────────────────────
    if (!panelOnly) {
        if (stage === "idle") {
            return (
                <button
                    type="button"
                    className="broker-otp__send-btn"
                    onClick={() => onStageChange("sent")}
                    disabled={!isValidEmail(email)}
                >
                    Verify Email ›
                </button>
            );
        }
        return null;
    }

    // ── Widget panel below field row ──────────────────────────────────
    if (stage !== "sent") return null;

    return (
        <div className="broker-otp__panel">
            <p className="broker-otp__hint">
                Verify your email <strong>{email}</strong>. Click the button below — an OTP will be sent to your inbox.
            </p>

            {loading && (
                <p style={{ fontSize: "0.82rem", color: "var(--broker-blue-mid)", marginBottom: 8 }}>
                    Verifying...
                </p>
            )}
            {error && <p className="broker-otp__error">⚠ {error}</p>}

            {/* Exact HTML from phone.email dashboard — class is pe_verify_email */}
            <div
                className="pe_verify_email"
                data-client-id={CLIENT_ID}
            />

            <button
                type="button"
                className="broker-otp__resend-btn"
                style={{ marginTop: 10 }}
                onClick={() => { setError(""); onStageChange("idle"); }}
            >
                ← Change email
            </button>
        </div>
    );
};

export default BrokerEmailVerify;