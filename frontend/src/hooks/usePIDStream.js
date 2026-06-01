import { useRef, useEffect } from 'react';
import { usePIDStore } from '../store/pidStore';
const RING_SIZE = 200;
// Maintains a per-PID ring buffer of the last RING_SIZE samples for sparklines.
// Returns a stable ref to avoid re-renders on every reading.
export function usePIDHistory() {
    const historyRef = useRef({});
    const currentReadings = usePIDStore((s) => s.currentReadings);
    useEffect(() => {
        for (const [pid, reading] of Object.entries(currentReadings)) {
            if (!historyRef.current[pid])
                historyRef.current[pid] = [];
            const buf = historyRef.current[pid];
            buf.push(reading);
            if (buf.length > RING_SIZE)
                buf.shift();
        }
    }, [currentReadings]);
    return {
        getHistory: (pid) => historyRef.current[pid] ?? [],
    };
}
