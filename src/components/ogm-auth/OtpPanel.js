/**
 * OtpPanel.js
 * Two-step OTP flow with Email or WhatsApp tab switcher.
 * Email OTP works immediately via EmailService.
 * WhatsApp OTP is shown as "coming soon" until Twilio is configured.
 */

import { useState } from "react";
import { authApi } from "./utils/authapi";
import { tokenStore } from "./utils/tokenstore";
import { useAsync } from "./hooks/useasync";
import { useCountdown } from "./hooks/usecountdown";
import FormField from "./FormField";

const STEP = { INPUT: "INPUT", OTP: "OTP" };
const TAB  = { EMAIL: "email", PHONE: "phone" };

export default function OtpPanel({ onBack, onSuccess }) {
    const [step, setStep]       = useState(STEP.INPUT);
    const [tab, setTab]         = useState(TAB.EMAIL);
    const [email, setEmail]     = useState("");
    const [phone, setPhone]     = useState("");
    const [otp, setOtp]         = useState("");
    const [fieldError, setFieldError] = useState("");

    const { run, loading, error } = useAsync();
    const { seconds, start, canResend } = useCountdown(30);

    // Identifier sent to backend — email as-is, phone with +91 prefix
    const identifier = tab === TAB.EMAIL ? email : `+91${phone}`;

    /* ── Validate ─────────────────────────────────────────────── */
    const validate = () => {
        if (tab === TAB.EMAIL) {
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                setFieldError("Enter a valid email address");
                return false;
            }
        } else {
            if (!/^[6-9]\d{9}$/.test(phone)) {
                setFieldError("Enter a valid 10-digit mobile number");
                return false;
            }
        }
        setFieldError("");
        return true;
    };

    /* ── Send OTP ─────────────────────────────────────────────── */
    const sendOtp = async () => {
        if (!validate()) return;
        const data = await run(() => authApi.sendOtpToIdentifier(identifier));
        if (data === null) return;
        setStep(STEP.OTP);
        start();
    };

    /* ── Verify OTP ───────────────────────────────────────────── */
    const verifyOtp = async () => {
        if (!/^\d{6}$/.test(otp)) {
            setFieldError("Enter a valid 6-digit OTP");
            return;
        }
        setFieldError("");
        const data = await run(() => authApi.verifyOtpForIdentifier(identifier, otp));
        if (!data) return;
        tokenStore.set(data.token);
        onSuccess?.();
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        step === STEP.INPUT ? sendOtp() : verifyOtp();
    };

    const switchTab = (t) => {
        setTab(t);
        setFieldError("");
        setStep(STEP.INPUT);
        setOtp("");
    };

    return (
        <form className="ogm-auth-form" onSubmit={handleSubmit} noValidate>

            {/* ── Tab switcher (only on input step) ────────────── */}
            {step === STEP.INPUT && (
                <div className="ogm-otp-tabs">
                    <button
                        type="button"
                        className={tab === TAB.EMAIL ? "active" : ""}
                        onClick={() => switchTab(TAB.EMAIL)}
                    >
                        📧 Email OTP
                    </button>
                    <button
                        type="button"
                        className={tab === TAB.PHONE ? "active" : ""}
                        onClick={() => switchTab(TAB.PHONE)}
                    >
                        💬 WhatsApp OTP
                    </button>
                </div>
            )}

            {/* ── Email input ───────────────────────────────────── */}
            {step === STEP.INPUT && tab === TAB.EMAIL && (
                <FormField
                    type="email"
                    placeholder="Enter your email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    error={fieldError}
                    required
                />
            )}

            {/* ── Phone input ───────────────────────────────────── */}
            {step === STEP.INPUT && tab === TAB.PHONE && (
                <>
                    <FormField
                        type="tel"
                        inputMode="numeric"
                        placeholder="10-digit mobile number"
                        maxLength={10}
                        value={phone}
                        onChange={(e) =>
                            setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))
                        }
                        error={fieldError}
                        required
                    />
                    <p className="ogm-otp-notice">
                        WhatsApp OTP coming soon — please use Email OTP for now.
                    </p>
                </>
            )}

            {/* ── OTP input ─────────────────────────────────────── */}
            {step === STEP.OTP && (
                <>
                    <p className="ogm-otp-sent-to">
                        OTP sent to <strong>{identifier}</strong>
                    </p>
                    <FormField
                        type="text"
                        inputMode="numeric"
                        placeholder="Enter 6-digit OTP"
                        maxLength={6}
                        value={otp}
                        onChange={(e) =>
                            setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
                        }
                        error={fieldError}
                        autoFocus
                        required
                    />
                </>
            )}

            {error && (
                <p className="ogm-auth-error" role="alert">{error}</p>
            )}

            <button className="ogm-primary-btn" disabled={loading} type="submit">
                {loading
                    ? "Please wait…"
                    : step === STEP.INPUT
                    ? "Send OTP"
                    : "Verify OTP"}
            </button>

            {/* ── Resend ───────────────────────────────────────── */}
            {step === STEP.OTP && (
                <span
                    className={`ogm-resend-otp ${!canResend ? "disabled" : ""}`}
                    onClick={canResend ? sendOtp : undefined}
                    role="button"
                    tabIndex={canResend ? 0 : -1}
                    aria-disabled={!canResend}
                >
                    {canResend ? "Resend OTP" : `Resend OTP in ${seconds}s`}
                </span>
            )}

            {/* ── Back ─────────────────────────────────────────── */}
            {onBack && (
                <span
                    className="ogm-back-link"
                    onClick={onBack}
                    role="button"
                    tabIndex={0}
                >
                    ← Back to Login
                </span>
            )}
        </form>
    );
}