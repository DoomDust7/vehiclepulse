import { create } from 'zustand'

export interface PIDReading {
  session_id: string
  ts: number
  pid: string
  name: string
  value: number | null
  unit: string
  valid: boolean
}

export interface FaultEvent {
  id: string
  session_id: string
  ts: number
  pid: string
  pid_name: string
  value: number
  threshold_op: string
  threshold_val: number
  severity: 'info' | 'warning' | 'critical'
  freeze_frame_id: string | null
}

export type ConnectionStatus = 'connecting' | 'connected' | 'reconnecting' | 'disconnected'

interface PIDStore {
  currentReadings: Record<string, PIDReading>
  faultEvents: FaultEvent[]
  activeSession: { session_id: string; mock_mode: boolean } | null
  connectionStatus: ConnectionStatus
  mockMode: boolean

  onPIDReading: (r: PIDReading) => void
  onFaultEvent: (f: FaultEvent) => void
  onSessionStart: (payload: { session_id: string; mock_mode: boolean }) => void
  onSessionEnd: () => void
  setConnectionStatus: (s: ConnectionStatus) => void
}

export const usePIDStore = create<PIDStore>((set) => ({
  currentReadings: {},
  faultEvents: [],
  activeSession: null,
  connectionStatus: 'connecting',
  mockMode: false,

  onPIDReading: (r) =>
    set((state) => ({
      currentReadings: { ...state.currentReadings, [r.pid]: r },
    })),

  onFaultEvent: (f) =>
    set((state) => ({
      faultEvents: [f, ...state.faultEvents].slice(0, 100),
    })),

  onSessionStart: (payload) =>
    set({ activeSession: payload, mockMode: payload.mock_mode }),

  onSessionEnd: () => set({ activeSession: null }),

  setConnectionStatus: (s) => set({ connectionStatus: s }),
}))
