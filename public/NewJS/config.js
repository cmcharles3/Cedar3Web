const CONFIG = {
    API_BASE_URL: window.location.origin.includes('http') ? window.location.origin : 'http://localhost:3000',
    DEFAULT_ADMIN_PIN: "1234",
    STORAGE_KEYS: {
        JOBS: "job_tickets",
        TIME_LOGS: "time_logs",
        ACTIVE_SESSIONS: "active_sessions",
        CURRENT_USER: "current_user",
        THEME: "theme_preference"
    },
    HOURLY_RATES: {
        "Receptionist": 85.00,
        "Talent": 150.00,
        "Simba": 150.00
    }
};