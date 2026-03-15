/**
 * tokenStore.js
 * Single source of truth for reading / writing the auth token.
 * Swap the implementation here (e.g. httpOnly cookie, IndexedDB)
 * without touching any component.
 */

const TOKEN_KEY = "ogm_token";

export const tokenStore = {
    get: () => localStorage.getItem(TOKEN_KEY),
    set: (token) => localStorage.setItem(TOKEN_KEY, token),
    remove: () => localStorage.removeItem(TOKEN_KEY),
};