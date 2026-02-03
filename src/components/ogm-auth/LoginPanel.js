import { useState } from "react";
import SocialAuthButtons from "./SocialAuthButtons";

export default function LoginPanel({ onOtp, onSuccess }) {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e) => {
        e.preventDefault(); // 🚫 stop page reload
        setError("");
        setLoading(true);

        try {
            const res = await fetch("http://localhost:8080/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password }),
            });

            if (!res.ok) {
                throw new Error("Invalid email or password");
            }

            const data = await res.json();

            // 🔐 OTP FLOW
            if (data.otpRequired) {
                onOtp();
                return;
            }

            // 🔐 NORMAL LOGIN
            localStorage.setItem("token", data.token);

            // 🔥 TELL APP LOGIN SUCCEEDED
            if (onSuccess) onSuccess();
        } catch (err) {
            setError(err.message || "Login failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <form className="ogm-auth-form" onSubmit={handleSubmit}>
            <input
                type="email"
                placeholder="Email address"
                value={email}
                required
                onChange={(e) => setEmail(e.target.value)}
            />

            <input
                type="password"
                placeholder="Password"
                value={password}
                required
                onChange={(e) => setPassword(e.target.value)}
            />

            {error && <p className="ogm-auth-error">{error}</p>}

            <div className="ogm-auth-actions">
        <span className="link" onClick={onOtp}>
          Login with OTP
        </span>
                <span className="link">
          Forgot?
        </span>
            </div>

            <button className="ogm-primary-btn" disabled={loading}>
                {loading ? "Logging in..." : "Login"}
            </button>

            {/* ✅ Social Login */}
            <SocialAuthButtons />
        </form>
    );
}
