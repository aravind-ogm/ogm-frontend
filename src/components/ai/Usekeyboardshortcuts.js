import { useEffect } from "react";

/**
 * useKeyboardShortcuts – global keyboard shortcut handler
 * @param {Object} shortcutMap – { "key": callbackFn } where key is checked with Ctrl/Cmd
 */
export default function useKeyboardShortcuts(shortcutMap = {}) {
  useEffect(() => {
    const handler = (e) => {
      if (!(e.ctrlKey || e.metaKey)) return;

      const key = e.key.toLowerCase();
      if (shortcutMap[key]) {
        e.preventDefault();
        shortcutMap[key]();
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [shortcutMap]);
}