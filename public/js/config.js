// ============================================
// Cedar3 Web — Global Config
// ============================================

// Auto-detect API base — works on localhost, LAN, Tailscale, or cloud
window.CONFIG = {
    // If page is served from file:// (not expected), fallback
    API_BASE: window.location.protocol === 'file:'
        ? 'http://localhost:3000'
        : window.location.origin,

    // Where to redirect if not logged in
    LOGIN_PAGE: '/login.html',

    // Where to redirect after login
    HOME_PAGE: '/index.html',

    // Token storage keys
    TOKEN_KEY: 'cedar3_token',
    USER_KEY: 'cedar3_user',

    // How often to poll for updates (ms). Will become WebSockets later.
    POLL_INTERVAL: 3000
};