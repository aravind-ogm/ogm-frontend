import React, { useEffect, useRef, useState } from "react";
import { verifyPhoneWithBackend } from "../../config/phoneEmailService";
import "./BrokerRegistration.css";

const BrokerOtpVerify = ({
                             mobile,
                             onVerified,
                             stage,
                             onStageChange,
                             panelOnly = false,
                         }) => {
    const [loading, setLoading] = useState(false);
    const [error, setError]     = useState("");
    const scriptLoadedRef       = useRef(false);

    const CLIENT_ID = process.env.REACT_APP_PHONE_EMAIL_CLIENT_ID || "11133177995114758829";

    useEffect(() => {
        if (!panelOnly || stage !== "sent") return;

        // Set up listener BEFORE loading script
        window.phoneEmailListener = async (userObj) => {
            const userJsonUrl = userObj.user_json_url;
            setLoading(true);
            setError("");
            try {
                const res = await verifyPhoneWithBackend(userJsonUrl);
                if (res.verified) {
                    const verifiedMobile = res.mobile.replace(/^\+?91/, "");
                    onStageChange("verified");
                    onVerified(verifiedMobile);
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
        script.src   = "https://www.phone.email/sign_in_button_v1.js";
        script.async = true;
        script.onload = () => { scriptLoadedRef.current = true; };
        document.body.appendChild(script);

        return () => { window.phoneEmailListener = undefined; };
    }, [panelOnly, stage]);

    // ── Button inside field row ───────────────────────────────────────
    if (!panelOnly) {
        if (stage === "idle") {
            return (
                <button
                    type="button"
                    className="broker-otp__send-btn"
                    onClick={() => onStageChange("sent")}
                    disabled={!mobile || mobile.length !== 10}
                >
                    Verify Mobile ›
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
                Verify your mobile number +91 {mobile}. Click the button below — an OTP will be sent.
            </p>

            {loading && (
                <p style={{ fontSize: "0.82rem", color: "var(--broker-blue-mid)", marginBottom: 8 }}>
                    Verifying...
                </p>
            )}
            {error && <p className="broker-otp__error">⚠ {error}</p>}

            {/* Exact HTML from phone.email dashboard */}
            <div
                className="pe_signin_button"
                data-client-id={CLIENT_ID}
            />

            <button
                type="button"
                className="broker-otp__resend-btn"
                style={{ marginTop: 10 }}
                onClick={() => { setError(""); onStageChange("idle"); }}
            >
                ← Change number
            </button>
        </div>
    );
};

export default BrokerOtpVerify;