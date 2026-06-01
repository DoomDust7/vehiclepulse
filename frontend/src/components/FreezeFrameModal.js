import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { api } from '../api/client';
export default function FreezeFrameModal({ fault, onClose }) {
    const [frame, setFrame] = useState(null);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        if (!fault.freeze_frame_id) {
            setLoading(false);
            return;
        }
        api.getFreezeFrame(fault.id)
            .then(setFrame)
            .catch(() => { })
            .finally(() => setLoading(false));
    }, [fault.id]);
    return (_jsx("div", { style: {
            position: 'fixed', inset: 0, background: '#000000cc', display: 'flex',
            alignItems: 'center', justifyContent: 'center', zIndex: 100,
        }, onClick: onClose, children: _jsxs("div", { style: {
                background: '#1a1a1a', border: '1px solid #333', borderRadius: 12,
                padding: 24, minWidth: 340, maxWidth: 480, width: '90%',
            }, onClick: (e) => e.stopPropagation(), children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', marginBottom: 16 }, children: [_jsxs("span", { style: { fontWeight: 700, fontSize: 14 }, children: ["Freeze Frame \u2014 ", fault.pid_name.replace(/_/g, ' ')] }), _jsx("button", { onClick: onClose, style: { background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: 18 }, children: "\u00D7" })] }), _jsxs("div", { style: { fontSize: 12, color: '#888', marginBottom: 16 }, children: [new Date(fault.ts * 1000).toLocaleString(), " \u00B7", ' ', _jsxs("span", { style: { color: '#f59e0b' }, children: [fault.value.toFixed(2), " ", fault.threshold_op, " ", fault.threshold_val] })] }), loading && _jsx("div", { style: { color: '#555', fontSize: 12 }, children: "Loading..." }), !loading && !frame && (_jsx("div", { style: { color: '#555', fontSize: 12 }, children: "No freeze-frame data available." })), frame && (_jsx("div", { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }, children: Object.entries(frame.snapshot).map(([pid, data]) => (_jsxs("div", { style: {
                            background: '#111', borderRadius: 6, padding: '8px 10px',
                            display: 'flex', justifyContent: 'space-between',
                        }, children: [_jsx("span", { style: { fontSize: 11, color: '#888' }, children: pid }), _jsxs("span", { style: { fontSize: 12, fontWeight: 600 }, children: [data.value.toFixed(2), " ", _jsx("span", { style: { color: '#555', fontWeight: 400 }, children: data.unit })] })] }, pid))) }))] }) }));
}
