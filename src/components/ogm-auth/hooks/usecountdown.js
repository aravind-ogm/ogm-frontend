/**
 * useCountdown.js
 * Reusable countdown timer hook.
 *
 * Usage:
 *   const { seconds, start, canResend } = useCountdown(30);
 */

import { useCallback, useEffect, useRef, useState } from "react";

export function useCountdown(initial = 30) {
    const [seconds, setSeconds] = useState(0);
    const intervalRef = useRef(null);

    const stop = useCallback(() => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
    }, []);

    const start = useCallback(() => {
        stop();
        setSeconds(initial);
        intervalRef.current = setInterval(() => {
            setSeconds((s) => {
                if (s <= 1) {
                    stop();
                    return 0;
                }
                return s - 1;
            });
        }, 1000);
    }, [initial, stop]);

    // Clean up on unmount
    useEffect(() => stop, [stop]);

    return { seconds, start, canResend: seconds === 0 };
}