const BASE = (import.meta.env.VITE_API_URL ?? '') + '/api/v1';
async function get(path) {
    const res = await fetch(`${BASE}${path}`);
    if (!res.ok)
        throw new Error(`GET ${path} → ${res.status}`);
    return res.json();
}
async function put(path, body) {
    const res = await fetch(`${BASE}${path}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    if (!res.ok)
        throw new Error(`PUT ${path} → ${res.status}`);
    return res.json();
}
export const api = {
    getSessions: () => get('/sessions/'),
    getSession: (id) => get(`/sessions/${id}`),
    getFaults: (sessionId) => get(`/sessions/${sessionId}/faults`),
    getFreezeFrame: (faultId) => get(`/faults/${faultId}/freeze-frame`),
    getThresholds: () => get('/config/thresholds'),
    setThresholds: (rules) => put('/config/thresholds', rules),
    getReplayPage: (sessionId, cursor = 0, limit = 500) => get(`/sessions/${sessionId}/replay?cursor=${cursor}&limit=${limit}`),
};
