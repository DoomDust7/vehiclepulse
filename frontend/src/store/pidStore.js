import { create } from 'zustand';
export const usePIDStore = create((set) => ({
    currentReadings: {},
    faultEvents: [],
    activeSession: null,
    connectionStatus: 'connecting',
    mockMode: false,
    onPIDReading: (r) => set((state) => ({
        currentReadings: { ...state.currentReadings, [r.pid]: r },
    })),
    onFaultEvent: (f) => set((state) => ({
        faultEvents: [f, ...state.faultEvents].slice(0, 100),
    })),
    onSessionStart: (payload) => set({ activeSession: payload, mockMode: payload.mock_mode }),
    onSessionEnd: () => set({ activeSession: null }),
    setConnectionStatus: (s) => set({ connectionStatus: s }),
}));
