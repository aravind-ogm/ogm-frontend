import SocialAuthButtons from "./SocialAuthButtons";

export default function SignupPanel() {
    return (
        <form className="ogm-auth-form">
            <input
                type="text"
                placeholder="Full Name"
                required
            />

            <input
                type="email"
                placeholder="Email address"
                required
            />

            <input
                type="password"
                placeholder="Create password"
                required
            />

            <button className="ogm-primary-btn">
                Create Account
            </button>

            {/* ✅ Google Signup ALSO here */}
            <SocialAuthButtons />
        </form>
    );
}
