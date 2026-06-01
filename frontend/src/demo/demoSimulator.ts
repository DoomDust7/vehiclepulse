// Runs entirely in the browser when no backend WebSocket is reachable.
// Mirrors the mock_adapter.py sensor waveforms so the Vercel demo looks realistic.

import { usePIDStore } from '../store/pidStore'

const SESSION_ID = 'demo-session'

let _timer: ReturnType<typeof setInterval> | null = null
let _elapsed = 0
let _speed = 45
let _faultCooldown: Record<string, number> = {}

interface PIDSpec {
  pid: string; name: string; unit: string
  fn: (t: number) => number
}

const PIDS: PIDSpec[] = [
  { pid: '0C', name: 'RPM',          unit: 'rpm',  fn: t => 600 + 1450 * (1 + Math.sin(2 * Math.PI * 0.3 * t)) },
  { pid: '05', name: 'COOLANT_TEMP', unit: 'C',    fn: t => Math.min(85 + (t / 120) * 30, 115) },
  { pid: '0D', name: 'SPEED',        unit: 'km/h', fn: _randomWalk },
  { pid: '10', name: 'MAF',          unit: 'g/s',  fn: t => (600 + 1450 * (1 + Math.sin(2 * Math.PI * 0.3 * t))) / 1000 * 4.5 },
  { pid: '11', name: 'THROTTLE_POS', unit: '%',    fn: t => [5, 20, 40, 60, 15][Math.floor(t / 10) % 5] },
  { pid: '04', name: 'ENGINE_LOAD',  unit: '%',    fn: t => 30 + 20 * Math.sin(2 * Math.PI * 0.15 * t) },
  { pid: '0B', name: 'INTAKE_MAP',   unit: 'kPa',  fn: t => 50 + 30 * Math.sin(2 * Math.PI * 0.1 * t) },
  { pid: '0F', name: 'INTAKE_TEMP',  unit: 'C',    fn: () => 25 + (Math.random() - 0.5) * 4 },
  { pid: '14', name: 'O2_SENSOR_1',  unit: 'V',    fn: t => 0.45 + 0.35 * Math.sin(2 * Math.PI * 0.8 * t) + (Math.random() - 0.5) * 0.1 },
  { pid: '15', name: 'O2_SENSOR_2',  unit: 'V',    fn: t => 0.45 + 0.35 * Math.sin(2 * Math.PI * 0.8 * t + 0.5) + (Math.random() - 0.5) * 0.1 },
  { pid: '06', name: 'STFT_BANK1',   unit: '%',    fn: () => (Math.random() - 0.5) * 10 },
]

function _randomWalk(): number {
  _speed = Math.max(0, Math.min(120, _speed + (Math.random() - 0.5) * 6))
  return _speed
}

const FAULT_RULES = [
  { pid: '05', op: 'gt',            value: 110, severity: 'warning',  cooldown: 30 },
  { pid: '14', op: 'range_outside', min: 0.1,   max: 0.9, value: 0, severity: 'warning',  cooldown: 15 },
  { pid: '15', op: 'range_outside', min: 0.1,   max: 0.9, value: 0, severity: 'warning',  cooldown: 15 },
  { pid: '04', op: 'gt',            value: 95,  severity: 'critical', cooldown: 10 },
]

function checkFaults(pid: string, value: number, ts: number) {
  const { onFaultEvent } = usePIDStore.getState()
  for (const rule of FAULT_RULES) {
    if (rule.pid !== pid) continue
    const breached =
      rule.op === 'gt'           ? value > rule.value :
      rule.op === 'range_outside'? (value < (rule.min ?? 0) || value > (rule.max ?? 1)) :
      false
    if (!breached) continue
    const key = `${pid}:${rule.op}`
    if (ts - (_faultCooldown[key] ?? 0) < rule.cooldown) continue
    _faultCooldown[key] = ts
    onFaultEvent({
      id: `demo-${Math.random().toString(36).slice(2)}`,
      session_id: SESSION_ID,
      ts,
      pid,
      pid_name: PIDS.find(p => p.pid === pid)?.name ?? pid,
      value,
      threshold_op: rule.op,
      threshold_val: rule.value,
      severity: rule.severity as 'warning' | 'critical',
      freeze_frame_id: null,
    })
  }
}

export function startDemo() {
  const { onSessionStart, onPIDReading, setConnectionStatus } = usePIDStore.getState()

  onSessionStart({ session_id: SESSION_ID, mock_mode: true })
  setConnectionStatus('connected')

  _timer = setInterval(() => {
    _elapsed += 0.1
    const ts = Date.now() / 1000

    for (const spec of PIDS) {
      const value = spec.fn(_elapsed)
      onPIDReading({
        session_id: SESSION_ID,
        ts,
        pid: spec.pid,
        name: spec.name,
        value,
        unit: spec.unit,
        valid: true,
      })
      checkFaults(spec.pid, value, ts)
    }
  }, 100)
}

export function stopDemo() {
  if (_timer !== null) {
    clearInterval(_timer)
    _timer = null
  }
}
