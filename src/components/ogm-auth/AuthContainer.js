import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import LoginPanel from "./LoginPanel";
import SignupPanel from "./SignupPanel";
import OtpPanel from "./OtpPanel";
import { tokenStore } from "./utils/tokenstore";
import "./ogm-auth.css";

const VIEWS = { LOGIN: "login", SIGNUP: "signup", OTP: "otp" };

export default function AuthContainer({ onAuthSuccess }) {
    const [activeView, setActiveView] = useState(VIEWS.LOGIN);
    const location = useLocation();
    const navigate = useNavigate();

    /* ── Sync ?view= query param ───────────────────────────────── */
    useEffect(() => {
        const view = new URLSearchParams(location.search).get("view");
        if (view === VIEWS.SIGNUP) setActiveView(VIEWS.SIGNUP);
    }, [location.search]);

    /* ── Handle Google OAuth redirect (?token=…) ──────────────── */
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const token = params.get("token");

        if (token) {
            tokenStore.set(token);
            window.history.replaceState({}, "", window.location.pathname);
            onAuthSuccess?.();
            navigate("/", { replace: true });
        }
    }, [navigate, onAuthSuccess]);

    const handleSuccess = () => {
        onAuthSuccess?.();
        navigate("/", { replace: true });
    };

    const isTabView =
        activeView === VIEWS.LOGIN || activeView === VIEWS.SIGNUP;

    return (
        <div className="ogm-auth-page">
            <div className="ogm-auth-card">
                {/* Brand */}
                <div className="ogm-auth-brand">
                    <img src="/logo.png" alt="OGM Logo" />
                    <span>One Global Marketplace</span>
                </div>

                {/* Tabs – hidden during OTP flow */}
                {isTabView && (
                    <div className="ogm-auth-tabs" role="tablist">
                        {[VIEWS.LOGIN, VIEWS.SIGNUP].map((view) => (
                            <button
                                key={view}
                                role="tab"
                                aria-selected={activeView === view}
                                className={activeView === view ? "active" : ""}
                                onClick={() => setActiveView(view)}
                            >
                                {view === VIEWS.LOGIN ? "Login" : "Sign Up"}
                            </button>
                        ))}
                    </div>
                )}

                {/* Panels */}
                <div className={`ogm-auth-slider ogm-view-${activeView}`}>
                    {activeView === VIEWS.LOGIN && (
                        <LoginPanel
                            onOtp={() => setActiveView(VIEWS.OTP)}
                            onSuccess={handleSuccess}
                        />
                    )}

                    {activeView === VIEWS.SIGNUP && (
                        <SignupPanel onSuccess={() => setActiveView(VIEWS.LOGIN)} />
                    )}

                    {activeView === VIEWS.OTP && (
                        <OtpPanel
                            onBack={() => setActiveView(VIEWS.LOGIN)}
                            onSuccess={handleSuccess}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}