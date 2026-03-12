/* ─────────────────────────────────────────────
   SHARED UTILITY HELPERS
   ───────────────────────────────────────────── */

/**
 * Generate a unique ID
 */
export const uid = () => crypto.randomUUID();

/**
 * Truncate text to N words with ellipsis
 */
export const truncateWords = (text, count = 5) => {
  const words = text.trim().split(/\s+/);
  if (words.length <= count) return text;
  return words.slice(0, count).join(" ") + "…";
};

/**
 * Format timestamp to readable time
 */
export const formatTime = (ts) =>
  new Date(ts).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

/**
 * Format Indian-style price (Lakhs / Crores)
 */
export const formatPrice = (price) => {
  if (!price) return "Price on request";

  const cleaned = String(price).replace(/[₹,]/g, "");
  const num = Number(cleaned);

  if (isNaN(num)) return price;

  if (num >= 10000000) {
    return `₹ ${(num / 10000000).toFixed(2)} Cr`;
  }

  if (num >= 100000) {
    return `₹ ${(num / 100000).toFixed(2)} L`;
  }

  return `₹ ${num.toLocaleString("en-IN")}`;
};

/**
 * Debounce function
 */
export const debounce = (fn, ms = 300) => {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
};

/**
 * Simple markdown-like text formatter
 * Converts **bold**, *italic*, `code`, and ```code blocks```
 */
export const parseMarkdown = (text) => {
  if (!text) return "";

  let html = text
    // Escape HTML
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    // Code blocks (triple backtick)
    .replace(/```(\w*)\n?([\s\S]*?)```/g, '<pre class="code-block"><code>$2</code></pre>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>')
    // Bold
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    // Italic
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    // Line breaks
    .replace(/\n/g, "<br/>");

  return html;
};

/**
 * Keyboard shortcut helper
 */
export const isShortcut = (e, key, mod = "ctrl") => {
  const modKey = mod === "ctrl" ? e.ctrlKey || e.metaKey : e[`${mod}Key`];
  return modKey && e.key.toLowerCase() === key.toLowerCase();
};