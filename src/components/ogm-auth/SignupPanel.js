import { useState } from "react";
import SocialAuthButtons from "./SocialAuthButtons";

export default function SignupPanel({ onSuccess }) {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const handleSubmit = async (e) => {
        e.preventDefault(); // 🚫 prevent page reload
        setError("");
        setSuccess("");
        setLoading(true);

        try {
            const res = await fetch("http://localhost:8080/api/auth/signup", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name,
                    email,
                    password,
                }),
            });

            if (!res.ok) {
                throw new Error("Signup failed. Email may already exist.");
            }

            await res.json();

            // ✅ SIGNUP SUCCESS
            setSuccess("Account created successfully. Please login.");

            // 🔁 Switch back to login after short delay
            setTimeout(() => {
                if (onSuccess) onSuccess();
            }, 800);
        } catch (err) {
            setError(err.message || "Signup failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <form className="ogm-auth-form" onSubmit={handleSubmit}>
            <input
                type="text"
                placeholder="Full Name"
                value={name}
                required
                onChange={(e) => setName(e.target.value)}
            />

            <input
                type="email"
                placeholder="Email address"
                value={email}
                required
                onChange={(e) => setEmail(e.target.value)}
            />

            <input
                type="password"
                placeholder="Create password"
                value={password}
                required
                onChange={(e) => setPassword(e.target.value)}
            />

            {error && <p className="ogm-auth-error">{error}</p>}
            {success && <p className="ogm-auth-success">{success}</p>}

            <button className="ogm-primary-btn" disabled={loading}>
                {loading ? "Creating account..." : "Create Account"}
            </button>

            {/* ✅ Social Signup */}
            <SocialAuthButtons />
        </form>
    );
}
