import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo } from 'react';
import { usePIDStore } from '../store/pidStore';
import { usePIDHistory } from '../hooks/usePIDStream';
import Sparkline from './Sparkline';
import { PID_META } from './pidMeta';
export default function GaugeCard({ pid }) {
    const reading = usePIDStore((s) => s.currentReadings[pid]);
    const faults = usePIDStore((s) => s.faultEvents);
    const { getHistory } = usePIDHistory();
    const recentFault = useMemo(() => faults.find((f) => f.pid === pid && Date.now() / 1000 - f.ts < 5), [faults, pid]);
    const meta = PID_META[pid] ?? { min: 0, max: 100 };
    const history = getHistory(pid);
    const value = reading?.value ?? null;
    const unit = reading?.unit ?? '';
    const name = reading?.name ?? pid;
    const pct = value !== null ? Math.min(1, Math.max(0, (value - meta.min) / (meta.max - meta.min))) : 0;
    const color = recentFault
        ? '#ef4444'
        : pct > 0.85
            ? '#f97316'
            : pct > 0.65
                ? '#facc15'
                : '#4ade80';
    return (_jsxs("div", { style: {
            background: '#1a1a1a',
            border: `1px solid ${recentFault ? '#ef4444' : '#2a2a2a'}`,
            borderRadius: 10,
            padding: '14px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            transition: 'border-color 0.3s',
            boxShadow: recentFault ? '0 0 12px #ef444440' : 'none',
        }, children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' }, children: [_jsx("span", { style: { fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: 1 }, children: name.replace(/_/g, ' ') }), recentFault && (_jsx("span", { style: {
                            fontSize: 10, background: recentFault.severity === 'critical' ? '#7f1d1d' : '#78350f',
                            color: '#fca5a5', padding: '2px 6px', borderRadius: 4,
                        }, children: recentFault.severity.toUpperCase() }))] }), _jsxs("div", { style: { display: 'flex', alignItems: 'baseline', gap: 4 }, children: [_jsx("span", { style: { fontSize: 28, fontWeight: 700, color, fontVariantNumeric: 'tabular-nums' }, children: value !== null ? value.toFixed(value > 99 ? 0 : 1) : '—' }), _jsx("span", { style: { fontSize: 13, color: '#666' }, children: unit })] }), _jsx("div", { style: { height: 4, background: '#2a2a2a', borderRadius: 2 }, children: _jsx("div", { style: { height: '100%', width: `${pct * 100}%`, background: color, borderRadius: 2, transition: 'width 0.1s' } }) }), _jsx(Sparkline, { history: history, min: meta.min, max: meta.max, color: color })] }));
}
