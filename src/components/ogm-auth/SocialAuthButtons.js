export default function SocialAuthButtons() {
    return (
        <>
            <div className="ogm-divider">OR</div>

            <button
                type="button"
                className="ogm-google-btn"
                onClick={() => {
                    // later → redirect to backend Google OAuth
                    window.location.href = "http://localhost:8080/oauth2/authorization/google";
                }}
            >
                <img src="/google.svg" alt="Google" />
                Continue with Google
            </button>
        </>
    );
}
