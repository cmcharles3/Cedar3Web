window.CONFIG = {
    API_BASE: window.location.protocol === 'file:'
        ? 'http://localhost:3000'
        : window.location.origin,
    LOGIN_PAGE: '/login.html',
    HOME_PAGE: '/index.html',
    TOKEN_KEY: 'cedar3_token',
    USER_KEY: 'cedar3_user',
    POLL_INTERVAL: 3000,
    CHARLES_WHATSAPP: '27764847360'
};
