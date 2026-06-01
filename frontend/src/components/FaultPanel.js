import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { usePIDStore } from '../store/pidStore';
import FreezeFrameModal from './FreezeFrameModal';
const SEVERITY_COLORS = {
    info: '#3b82f6',
    warning: '#f59e0b',
    critical: '#ef4444',
};
export default function FaultPanel() {
    const faults = usePIDStore((s) => s.faultEvents);
    const [selected, setSelected] = useState(null);
    return (_jsxs("div", { style: { display: 'flex', flexDirection: 'column', height: '100%' }, children: [_jsxs("div", { style: {
                    padding: '10px 14px',
                    borderBottom: '1px solid #2a2a2a',
                    fontSize: 12,
                    color: '#888',
                    textTransform: 'uppercase',
                    letterSpacing: 1,
                    display: 'flex',
                    justifyContent: 'space-between',
                }, children: [_jsx("span", { children: "Fault Events" }), _jsx("span", { style: { color: faults.length ? '#ef4444' : '#444' }, children: faults.length })] }), _jsxs("div", { style: { overflowY: 'auto', flex: 1 }, children: [faults.length === 0 && (_jsx("div", { style: { padding: 20, color: '#444', fontSize: 12, textAlign: 'center' }, children: "No faults detected" })), faults.map((f) => (_jsx(FaultRow, { fault: f, onClick: () => setSelected(f) }, f.id)))] }), selected && (_jsx(FreezeFrameModal, { fault: selected, onClose: () => setSelected(null) }))] }));
}
function FaultRow({ fault, onClick }) {
    const color = SEVERITY_COLORS[fault.severity] ?? '#888';
    const time = new Date(fault.ts * 1000).toLocaleTimeString();
    return (_jsxs("button", { onClick: onClick, style: {
            width: '100%', textAlign: 'left', background: 'none', border: 'none',
            borderBottom: '1px solid #1f1f1f', padding: '10px 14px', cursor: 'pointer',
            display: 'flex', flexDirection: 'column', gap: 3,
        }, children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' }, children: [_jsx("span", { style: { fontSize: 12, fontWeight: 600, color }, children: fault.pid_name.replace(/_/g, ' ') }), _jsx("span", { style: {
                            fontSize: 9, background: color + '22', color, padding: '1px 5px',
                            borderRadius: 3, textTransform: 'uppercase', letterSpacing: 0.5,
                        }, children: fault.severity })] }), _jsxs("div", { style: { fontSize: 11, color: '#666' }, children: [fault.value.toFixed(2), " ", fault.threshold_op, " ", fault.threshold_val, " \u00B7 ", time] })] }));
}
