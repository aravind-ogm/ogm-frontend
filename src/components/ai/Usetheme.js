import { useState, useEffect, useCallback } from "react";

/**
 * useTheme — scoped to .ai-layout only.
 * Toggles "light-theme" class on .ai-layout element.
 * Does NOT touch document.documentElement or <html> or <body>.
 */
export default function useTheme() {
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem("ai-chat-theme") || "dark";
    } catch {
      return "dark";
    }
  });

  useEffect(() => {
    // Only toggle class on the AI layout container, not the whole page
    const el = document.querySelector(".ai-layout");
    if (el) {
      if (theme === "light") {
        el.classList.add("light-theme");
      } else {
        el.classList.remove("light-theme");
      }
    }
    try {
      localStorage.setItem("ai-chat-theme", theme);
    } catch {
      /* silent */
    }
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  }, []);

  return { theme, toggleTheme };
}