import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import LoginPanel from "./LoginPanel";
import SignupPanel from "./SignupPanel";
import OtpPanel from "./OtpPanel";
import "./ogm-auth.css";

export default function AuthContainer({ onAuthSuccess }) {
    const [activeView, setActiveView] = useState("login");
    const location = useLocation();
    const navigate = useNavigate();

    /* 🔁 Read ?view=signup */
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const view = params.get("view");

        if (view === "signup") {
            setActiveView("signup");
        }
    }, [location.search]);

    const handleSuccess = () => {
        onAuthSuccess && onAuthSuccess();
        navigate("/", { replace: true });
    };

    return (
        <div className="ogm-auth-page">
            <div className="ogm-auth-card">
                <div className="ogm-auth-brand">
                    <img src="/logo.png" alt="OGM Logo" />
                    <span>One Global Marketplace</span>
                </div>

                {activeView !== "otp" && (
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
                )}

                <div className={`ogm-auth-slider ogm-view-${activeView}`}>
                    {activeView === "login" && (
                        <LoginPanel
                            onOtp={() => setActiveView("otp")}
                            onSuccess={handleSuccess}
                        />
                    )}

                    {activeView === "signup" && (
                        <SignupPanel onSuccess={() => setActiveView("login")} />
                    )}

                    {activeView === "otp" && (
                        <OtpPanel
                            onBack={() => setActiveView("login")}
                            onSuccess={handleSuccess}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}
