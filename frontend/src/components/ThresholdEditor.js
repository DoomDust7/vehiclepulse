import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { api } from '../api/client';
export default function ThresholdEditor({ onBack }) {
    const [rules, setRules] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    useEffect(() => {
        api.getThresholds().then(setRules).finally(() => setLoading(false));
    }, []);
    async function save() {
        setSaving(true);
        try {
            await api.setThresholds(rules);
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
        }
        finally {
            setSaving(false);
        }
    }
    function update(idx, field, val) {
        setRules((prev) => prev.map((r, i) => i === idx ? { ...r, [field]: val } : r));
    }
    return (_jsxs("div", { style: { padding: 24, maxWidth: 700, margin: '0 auto' }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }, children: [_jsx("button", { onClick: onBack, style: {
                            background: '#2a2a2a', border: '1px solid #333', color: '#e0e0e0',
                            borderRadius: 6, padding: '6px 12px', cursor: 'pointer', fontSize: 12,
                        }, children: "\u2190 Back" }), _jsx("h2", { style: { fontSize: 16, fontWeight: 700, flex: 1 }, children: "Threshold Rules" }), _jsx("button", { onClick: save, disabled: saving, style: {
                            background: saving ? '#1a3a1a' : '#166534', border: 'none', color: '#4ade80',
                            borderRadius: 6, padding: '6px 16px', cursor: 'pointer', fontSize: 12,
                        }, children: saving ? 'Saving...' : saved ? 'Saved!' : 'Save' })] }), loading && _jsx("div", { style: { color: '#555' }, children: "Loading..." }), _jsx("div", { style: { display: 'flex', flexDirection: 'column', gap: 8 }, children: rules.map((rule, i) => (_jsxs("div", { style: {
                        background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 8,
                        padding: '12px 14px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, alignItems: 'center',
                    }, children: [_jsx(Field, { label: "PID", value: rule.pid, onChange: (v) => update(i, 'pid', v) }), _jsx(Field, { label: "Op", value: rule.op, onChange: (v) => update(i, 'op', v) }), _jsx(Field, { label: "Value", value: String(rule.value), onChange: (v) => update(i, 'value', Number(v)), type: "number" }), _jsx(Field, { label: "Severity", value: rule.severity, onChange: (v) => update(i, 'severity', v) })] }, i))) })] }));
}
function Field({ label, value, onChange, type = 'text' }) {
    return (_jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: 3 }, children: [_jsx("label", { style: { fontSize: 10, color: '#555', textTransform: 'uppercase', letterSpacing: 0.5 }, children: label }), _jsx("input", { type: type, value: value, onChange: (e) => onChange(e.target.value), style: {
                    background: '#111', border: '1px solid #2a2a2a', borderRadius: 4,
                    color: '#e0e0e0', padding: '4px 8px', fontSize: 12, width: '100%',
                } })] }));
}
