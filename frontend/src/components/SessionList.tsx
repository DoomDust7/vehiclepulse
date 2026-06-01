import { useEffect, useState } from 'react'
import { api, Session } from '../api/client'

interface Props {
  onBack: () => void
}

export default function SessionList({ onBack }: Props) {
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.getSessions().then(setSessions).finally(() => setLoading(false))
  }, [])

  return (
    <div style={{ padding: 24, maxWidth: 800, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button onClick={onBack} style={{
          background: '#2a2a2a', border: '1px solid #333', color: '#e0e0e0',
          borderRadius: 6, padding: '6px 12px', cursor: 'pointer', fontSize: 12,
        }}>
          ← Back
        </button>
        <h2 style={{ fontSize: 16, fontWeight: 700 }}>Session History</h2>
      </div>

      {loading && <div style={{ color: '#555' }}>Loading...</div>}

      {!loading && sessions.length === 0 && (
        <div style={{ color: '#555', fontSize: 13 }}>No past sessions found.</div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {sessions.map((s) => (
          <div key={s.id} style={{
            background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 8, padding: '14px 16px',
            display: 'grid', gridTemplateColumns: '1fr auto', gap: 8,
          }}>
            <div>
              <div style={{ fontSize: 12, fontFamily: 'monospace', color: '#888' }}>{s.id}</div>
              <div style={{ fontSize: 11, color: '#555', marginTop: 4 }}>
                {new Date(s.started_at).toLocaleString()}
                {s.ended_at && ` → ${new Date(s.ended_at).toLocaleString()}`}
              </div>
            </div>
            <div style={{ textAlign: 'right', fontSize: 11, color: '#666' }}>
              <div>{s.total_readings.toLocaleString()} readings</div>
              <div style={{ color: s.total_faults ? '#f59e0b' : '#444' }}>
                {s.total_faults} faults
              </div>
              {s.mock_mode && <div style={{ color: '#3b82f6' }}>MOCK</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
