/**
 * useAsync.js
 * Generic hook that wraps any async function and manages
 * loading / error / data state so components stay clean.
 *
 * Usage:
 *   const { run, loading, error } = useAsync();
 *   await run(() => authApi.login(email, password));
 */

import { useCallback, useState } from "react";

export function useAsync() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const run = useCallback(async (asyncFn) => {
        setLoading(true);
        setError("");
        try {
            const result = await asyncFn();
            return result;
        } catch (err) {
            const msg = err?.message || "Something went wrong. Please try again.";
            setError(msg);
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    const clearError = useCallback(() => setError(""), []);

    return { run, loading, error, clearError };
}