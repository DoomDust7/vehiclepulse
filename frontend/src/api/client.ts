const BASE = (import.meta.env.VITE_API_URL ?? '') + '/api/v1'

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`)
  if (!res.ok) throw new Error(`GET ${path} → ${res.status}`)
  return res.json()
}

async function put<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`PUT ${path} → ${res.status}`)
  return res.json()
}

export interface Session {
  id: string
  started_at: string
  ended_at: string | null
  vehicle_vin: string | null
  mock_mode: boolean
  total_readings: number
  total_faults: number
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
  severity: string
  freeze_frame_id: string | null
}

export interface FreezeFrame {
  id: string
  fault_event_id: string
  ts: number
  snapshot: Record<string, { value: number; unit: string }>
}

export interface ThresholdRule {
  pid: string
  op: string
  value: number
  severity: string
  cooldown_s: number
  range_min: number | null
  range_max: number | null
}

export const api = {
  getSessions: () => get<Session[]>('/sessions/'),
  getSession: (id: string) => get<Session>(`/sessions/${id}`),
  getFaults: (sessionId: string) => get<FaultEvent[]>(`/sessions/${sessionId}/faults`),
  getFreezeFrame: (faultId: string) => get<FreezeFrame>(`/faults/${faultId}/freeze-frame`),
  getThresholds: () => get<ThresholdRule[]>('/config/thresholds'),
  setThresholds: (rules: ThresholdRule[]) => put<{ updated: number }>('/config/thresholds', rules),
  getReplayPage: (sessionId: string, cursor = 0, limit = 500) =>
    get<{ items: unknown[]; next_cursor: number; has_more: boolean }>(
      `/sessions/${sessionId}/replay?cursor=${cursor}&limit=${limit}`
    ),
}
