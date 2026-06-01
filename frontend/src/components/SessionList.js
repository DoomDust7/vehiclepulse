import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { api } from '../api/client';
export default function SessionList({ onBack }) {
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        api.getSessions().then(setSessions).finally(() => setLoading(false));
    }, []);
    return (_jsxs("div", { style: { padding: 24, maxWidth: 800, margin: '0 auto' }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }, children: [_jsx("button", { onClick: onBack, style: {
                            background: '#2a2a2a', border: '1px solid #333', color: '#e0e0e0',
                            borderRadius: 6, padding: '6px 12px', cursor: 'pointer', fontSize: 12,
                        }, children: "\u2190 Back" }), _jsx("h2", { style: { fontSize: 16, fontWeight: 700 }, children: "Session History" })] }), loading && _jsx("div", { style: { color: '#555' }, children: "Loading..." }), !loading && sessions.length === 0 && (_jsx("div", { style: { color: '#555', fontSize: 13 }, children: "No past sessions found." })), _jsx("div", { style: { display: 'flex', flexDirection: 'column', gap: 8 }, children: sessions.map((s) => (_jsxs("div", { style: {
                        background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 8, padding: '14px 16px',
                        display: 'grid', gridTemplateColumns: '1fr auto', gap: 8,
                    }, children: [_jsxs("div", { children: [_jsx("div", { style: { fontSize: 12, fontFamily: 'monospace', color: '#888' }, children: s.id }), _jsxs("div", { style: { fontSize: 11, color: '#555', marginTop: 4 }, children: [new Date(s.started_at).toLocaleString(), s.ended_at && ` → ${new Date(s.ended_at).toLocaleString()}`] })] }), _jsxs("div", { style: { textAlign: 'right', fontSize: 11, color: '#666' }, children: [_jsxs("div", { children: [s.total_readings.toLocaleString(), " readings"] }), _jsxs("div", { style: { color: s.total_faults ? '#f59e0b' : '#444' }, children: [s.total_faults, " faults"] }), s.mock_mode && _jsx("div", { style: { color: '#3b82f6' }, children: "MOCK" })] })] }, s.id))) })] }));
}
