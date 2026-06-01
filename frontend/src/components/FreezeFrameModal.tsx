import { useEffect, useState } from 'react'
import { FaultEvent } from '../store/pidStore'
import { api, FreezeFrame } from '../api/client'

interface Props {
  fault: FaultEvent
  onClose: () => void
}

export default function FreezeFrameModal({ fault, onClose }: Props) {
  const [frame, setFrame] = useState<FreezeFrame | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!fault.freeze_frame_id) { setLoading(false); return }
    api.getFreezeFrame(fault.id)
      .then(setFrame)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [fault.id])

  return (
    <div style={{
      position: 'fixed', inset: 0, background: '#000000cc', display: 'flex',
      alignItems: 'center', justifyContent: 'center', zIndex: 100,
    }} onClick={onClose}>
      <div style={{
        background: '#1a1a1a', border: '1px solid #333', borderRadius: 12,
        padding: 24, minWidth: 340, maxWidth: 480, width: '90%',
      }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <span style={{ fontWeight: 700, fontSize: 14 }}>
            Freeze Frame — {fault.pid_name.replace(/_/g, ' ')}
          </span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: 18 }}>×</button>
        </div>

        <div style={{ fontSize: 12, color: '#888', marginBottom: 16 }}>
          {new Date(fault.ts * 1000).toLocaleString()} ·{' '}
          <span style={{ color: '#f59e0b' }}>{fault.value.toFixed(2)} {fault.threshold_op} {fault.threshold_val}</span>
        </div>

        {loading && <div style={{ color: '#555', fontSize: 12 }}>Loading...</div>}

        {!loading && !frame && (
          <div style={{ color: '#555', fontSize: 12 }}>No freeze-frame data available.</div>
        )}

        {frame && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {Object.entries(frame.snapshot).map(([pid, data]) => (
              <div key={pid} style={{
                background: '#111', borderRadius: 6, padding: '8px 10px',
                display: 'flex', justifyContent: 'space-between',
              }}>
                <span style={{ fontSize: 11, color: '#888' }}>{pid}</span>
                <span style={{ fontSize: 12, fontWeight: 600 }}>
                  {data.value.toFixed(2)} <span style={{ color: '#555', fontWeight: 400 }}>{data.unit}</span>
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
