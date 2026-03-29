// src/config/phoneEmailService.js
// Replaces firebaseOtpService.js
// phone.email works via a script widget — no npm package needed.
// The widget calls your JS listener with a user_json_url.
// You send that URL to your backend which fetches the verified number/email.

const BACKEND_URL = process.env.REACT_APP_API_BASE_URL || "http://localhost:8080/api";

/**
 * Sends user_json_url to backend for phone verification.
 * Backend fetches phone.email servers to get the verified mobile number.
 *
 * @param {string} userJsonUrl - URL provided by phone.email widget
 * @returns {Promise<{ verified: boolean, mobile: string }>}
 */
export const verifyPhoneWithBackend = async (userJsonUrl) => {
    const res = await fetch(`${BACKEND_URL}/broker/verify-phone`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userJsonUrl }),
    });
    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Phone verification failed");
    }
    return await res.json(); // { verified: true, mobile: "9876543210" }
};

/**
 * Sends user_json_url to backend for email verification.
 * Backend fetches phone.email servers to get the verified email.
 *
 * @param {string} userJsonUrl - URL provided by phone.email email widget
 * @returns {Promise<{ verified: boolean, email: string }>}
 */
export const verifyEmailWithBackend = async (userJsonUrl) => {
    const res = await fetch(`${BACKEND_URL}/broker/verify-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userJsonUrl }),
    });
    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Email verification failed");
    }
    return await res.json(); // { verified: true, email: "user@example.com" }
};