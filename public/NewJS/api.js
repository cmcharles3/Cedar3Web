const API = {
    async request(endpoint, method = 'GET', data = null) {
        try {
            const options = {
                method,
                headers: { 'Content-Type': 'application/json' }
            };
            if (data) options.body = JSON.stringify(data);

            const response = await fetch(`${CONFIG.API_BASE_URL}/api${endpoint}`, options);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return await response.json();
        } catch (error) {
            console.warn(`[API] Server unavailable at endpoint ${endpoint}, falling back to LocalStorage.`);
            return this.fallbackStorage(endpoint, method, data);
        }
    },

    fallbackStorage(endpoint, method, data) {
        if (endpoint === '/jobs') {
            let jobs = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.JOBS)) || [];
            if (method === 'POST') {
                jobs.push(data);
                localStorage.setItem(CONFIG.STORAGE_KEYS.JOBS, JSON.stringify(jobs));
                return { success: true, job: data };
            }
            return jobs;
        }
        if (endpoint === '/logs') {
            let logs = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.TIME_LOGS)) || [];
            if (method === 'POST') {
                logs.push(data);
                localStorage.setItem(CONFIG.STORAGE_KEYS.TIME_LOGS, JSON.stringify(logs));
                return { success: true, log: data };
            }
            return logs;
        }
        return { success: false, message: "Fallback executed" };
    }
};