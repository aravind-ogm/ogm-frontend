import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function SocialAuthButtons() {
    const navigate = useNavigate();

    useEffect(() => {
        // 🔐 Handle Google OAuth redirect
        const params = new URLSearchParams(window.location.search);
        const token = params.get("token");

        if (token) {
            // Store token
            localStorage.setItem("token", token);

            // Clean URL
            window.history.replaceState({}, document.title, window.location.pathname);

            // Redirect to home
            navigate("/", { replace: true });
        }
    }, [navigate]);

    return (
        <>
            <div className="ogm-divider">OR</div>

            <button
                type="button"
                className="ogm-google-btn"
                onClick={() => {
                    // 🔁 Redirect to backend Google OAuth
                    window.location.href =
                        "http://localhost:8080/oauth2/authorization/google";
                }}
            >
                <img src="/google.svg" alt="Google" />
                Continue with Google
            </button>
        </>
    );
}
