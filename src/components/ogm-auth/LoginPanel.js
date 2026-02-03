import SocialAuthButtons from "./SocialAuthButtons";

export default function LoginPanel({ onOtp }) {
    return (
        <form className="ogm-auth-form">
            <input
                type="email"
                placeholder="Email address"
                required
            />

            <input
                type="password"
                placeholder="Password"
                required
            />

            <div className="ogm-auth-actions">
        <span className="link" onClick={onOtp}>
          Login with OTP
        </span>
                <span className="link">
          Forgot?
        </span>
            </div>

            <button className="ogm-primary-btn">
                Login
            </button>

            {/* ✅ Google Login ALSO here */}
            <SocialAuthButtons />
        </form>
    );
}
