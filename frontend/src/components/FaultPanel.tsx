import { useState } from 'react'
import { usePIDStore, FaultEvent } from '../store/pidStore'
import FreezeFrameModal from './FreezeFrameModal'

const SEVERITY_COLORS: Record<string, string> = {
  info: '#3b82f6',
  warning: '#f59e0b',
  critical: '#ef4444',
}

export default function FaultPanel() {
  const faults = usePIDStore((s) => s.faultEvents)
  const [selected, setSelected] = useState<FaultEvent | null>(null)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{
        padding: '10px 14px',
        borderBottom: '1px solid #2a2a2a',
        fontSize: 12,
        color: '#888',
        textTransform: 'uppercase',
        letterSpacing: 1,
        display: 'flex',
        justifyContent: 'space-between',
      }}>
        <span>Fault Events</span>
        <span style={{ color: faults.length ? '#ef4444' : '#444' }}>{faults.length}</span>
      </div>

      <div style={{ overflowY: 'auto', flex: 1 }}>
        {faults.length === 0 && (
          <div style={{ padding: 20, color: '#444', fontSize: 12, textAlign: 'center' }}>
            No faults detected
          </div>
        )}
        {faults.map((f) => (
          <FaultRow key={f.id} fault={f} onClick={() => setSelected(f)} />
        ))}
      </div>

      {selected && (
        <FreezeFrameModal fault={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  )
}

function FaultRow({ fault, onClick }: { fault: FaultEvent; onClick: () => void }) {
  const color = SEVERITY_COLORS[fault.severity] ?? '#888'
  const time = new Date(fault.ts * 1000).toLocaleTimeString()

  return (
    <button onClick={onClick} style={{
      width: '100%', textAlign: 'left', background: 'none', border: 'none',
      borderBottom: '1px solid #1f1f1f', padding: '10px 14px', cursor: 'pointer',
      display: 'flex', flexDirection: 'column', gap: 3,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 12, fontWeight: 600, color }}>
          {fault.pid_name.replace(/_/g, ' ')}
        </span>
        <span style={{
          fontSize: 9, background: color + '22', color, padding: '1px 5px',
          borderRadius: 3, textTransform: 'uppercase', letterSpacing: 0.5,
        }}>
          {fault.severity}
        </span>
      </div>
      <div style={{ fontSize: 11, color: '#666' }}>
        {fault.value.toFixed(2)} {fault.threshold_op} {fault.threshold_val} · {time}
      </div>
    </button>
  )
}
