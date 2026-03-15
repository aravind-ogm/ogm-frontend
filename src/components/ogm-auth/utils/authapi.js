/**
 * authapi.js
 * Centralised API layer for all auth requests.
 */

const BASE = process.env.REACT_APP_API_BASE_URL || "";

async function request(path, options = {}) {
    const url = `${BASE}${path}`;

    const res = await fetch(url, {
        headers: { "Content-Type": "application/json", ...options.headers },
        ...options,
    });

    let body = null;
    try {
        body = await res.json();
    } catch {
        /* non-JSON response – ignore */
    }

    if (!res.ok) {
        const message =
            body?.message || body?.error || `Request failed (${res.status})`;
        throw new Error(message);
    }

    return body;
}

export const authApi = {
    /* ── Email + password ──────────────────────────────────── */
    login: (email, password) =>
        request("/api/auth/login", {
            method: "POST",
            body: JSON.stringify({ email, password }),
        }),

    signup: (name, email, password) =>
        request("/api/auth/signup", {
            method: "POST",
            body: JSON.stringify({ fullName: name, email, password }),
        }),

    /* ── OTP (email or phone) ──────────────────────────────── */

    /**
     * Send OTP to any identifier (email or +91xxxxxxxxxx).
     * Uses URLSearchParams to avoid double-encoding the + sign.
     */
    sendOtpToIdentifier: (identifier) => {
        const params = new URLSearchParams({ identifier });
        return request(`/api/auth/otp/send?${params}`, { method: "POST" });
    },

    /**
     * Verify OTP for any identifier.
     * Returns { token, email } on success.
     */
    verifyOtpForIdentifier: (identifier, otp) =>
        request("/api/auth/otp/verify", {
            method: "POST",
            body: JSON.stringify({ email: identifier, otp }),
        }),

    /* ── Google OAuth ──────────────────────────────────────── */
    googleOAuthUrl: () => `${BASE}/oauth2/authorization/google`,
};