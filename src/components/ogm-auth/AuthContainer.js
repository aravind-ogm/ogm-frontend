"use client";

import { useEffect, useState } from "react";
import LoginPanel from "./LoginPanel";
import SignupPanel from "./SignupPanel";
import OtpPanel from "./OtpPanel";
import "./ogm-auth.css";

export default function AuthContainer() {
    const [activeView, setActiveView] = useState("login");
    // login | signup | otp

    /* 🔒 Lock scroll for auth page */
    useEffect(() => {
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = "auto";
        };
    }, []);

    return (
        <div className="ogm-auth-page">
            <div className="ogm-auth-card">

                {/* ===== Brand ===== */}
                <div className="ogm-auth-brand">
                    <img src="/logo.png" alt="OGM Logo" />
                    <span>One Global Marketplace</span>
                </div>

                {/* ===== Tabs ===== */}
                <div className="ogm-auth-tabs">
                    <button
                        className={activeView === "login" ? "active" : ""}
                        onClick={() => setActiveView("login")}
                    >
                        Login
                    </button>

                    <button
                        className={activeView === "signup" ? "active" : ""}
                        onClick={() => setActiveView("signup")}
                    >
                        Sign Up
                    </button>
                </div>

                {/* ===== Content (Animated) ===== */}
                <div className={`ogm-auth-slider ogm-view-${activeView}`}>
                    {activeView === "login" && (
                        <LoginPanel onOtp={() => setActiveView("otp")} />
                    )}

                    {activeView === "signup" && (
                        <SignupPanel />
                    )}

                    {activeView === "otp" && (
                        <OtpPanel onBack={() => setActiveView("login")} />
                    )}
                </div>

            </div>

        </div>
    );
}
