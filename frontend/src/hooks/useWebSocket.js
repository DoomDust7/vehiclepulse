import { useEffect, useRef } from 'react';
import { usePIDStore } from '../store/pidStore';
import { startDemo, stopDemo } from '../demo/demoSimulator';
const WS_URL = import.meta.env.VITE_WS_URL ?? `ws://${window.location.hostname}:8000/ws`;
const MAX_BACKOFF_MS = 30000;
// Start demo after this many failed ms (first backoff = 1 s, so demo kicks in after ~2 s)
const DEMO_START_AFTER_MS = 2500;
export function useWebSocket() {
    const wsRef = useRef(null);
    const backoffRef = useRef(1000);
    const demoRunning = useRef(false);
    const demoTimer = useRef(null);
    const { onPIDReading, onFaultEvent, onSessionStart, onSessionEnd, setConnectionStatus } = usePIDStore();
    useEffect(() => {
        let unmounted = false;
        // Schedule demo if real backend doesn't connect within DEMO_START_AFTER_MS
        demoTimer.current = setTimeout(() => {
            if (!unmounted && backoffRef.current > 1000) {
                demoRunning.current = true;
                startDemo();
            }
        }, DEMO_START_AFTER_MS);
        function connect() {
            if (unmounted)
                return;
            setConnectionStatus('connecting');
            const ws = new WebSocket(WS_URL);
            wsRef.current = ws;
            ws.onopen = () => {
                backoffRef.current = 1000;
                setConnectionStatus('connected');
                // Real backend connected — tear down demo
                if (demoRunning.current) {
                    demoRunning.current = false;
                    stopDemo();
                }
                if (demoTimer.current) {
                    clearTimeout(demoTimer.current);
                    demoTimer.current = null;
                }
            };
            ws.onmessage = (ev) => {
                try {
                    const envelope = JSON.parse(ev.data);
                    const messages = envelope.type === 'batch' ? envelope.messages : [envelope];
                    for (const msg of messages)
                        dispatch(msg);
                }
                catch {
                    // ignore malformed frames
                }
            };
            ws.onclose = () => {
                if (unmounted)
                    return;
                setConnectionStatus('reconnecting');
                const delay = Math.min(backoffRef.current, MAX_BACKOFF_MS);
                backoffRef.current = Math.min(backoffRef.current * 2, MAX_BACKOFF_MS);
                setTimeout(connect, delay);
            };
            ws.onerror = () => ws.close();
        }
        function dispatch(msg) {
            if (msg.type === 'pid_reading')
                onPIDReading(msg.payload);
            else if (msg.type === 'fault_event')
                onFaultEvent(msg.payload);
            else if (msg.type === 'session_start')
                onSessionStart(msg.payload);
            else if (msg.type === 'session_end')
                onSessionEnd();
        }
        connect();
        return () => {
            unmounted = true;
            wsRef.current?.close();
            if (demoTimer.current)
                clearTimeout(demoTimer.current);
            if (demoRunning.current)
                stopDemo();
        };
    }, []);
}
