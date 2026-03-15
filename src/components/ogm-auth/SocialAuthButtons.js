import { authApi } from "./utils/authapi";

export default function SocialAuthButtons() {
    return (
        <>
            <div className="ogm-divider">OR</div>

            <button
                type="button"
                className="ogm-google-btn"
                onClick={() => {
                    window.location.href = authApi.googleOAuthUrl();
                }}
            >
                <img src="/google.svg" alt="" aria-hidden="true" />
                Continue with Google
            </button>
        </>
    );
}