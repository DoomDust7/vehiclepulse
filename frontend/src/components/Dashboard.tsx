import { usePIDStore } from '../store/pidStore'
import { useWebSocket } from '../hooks/useWebSocket'
import GaugeCard from './GaugeCard'
import FaultPanel from './FaultPanel'
import { PID_ORDER } from './pidMeta'

const STATUS_COLOR: Record<string, string> = {
  connected: '#4ade80',
  connecting: '#facc15',
  reconnecting: '#f97316',
  disconnected: '#ef4444',
}

interface Props {
  onShowSessions: () => void
  onShowThresholds: () => void
}

export default function Dashboard({ onShowSessions, onShowThresholds }: Props) {
  useWebSocket()

  const connectionStatus = usePIDStore((s) => s.connectionStatus)
  const activeSession = usePIDStore((s) => s.activeSession)
  const mockMode = usePIDStore((s) => s.mockMode)

  const statusColor = STATUS_COLOR[connectionStatus] ?? '#888'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      {/* Top bar */}
      <header style={{
        background: '#111', borderBottom: '1px solid #222', padding: '10px 20px',
        display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0,
      }}>
        <span style={{ fontSize: 16, fontWeight: 800, letterSpacing: -0.5, color: '#e0e0e0' }}>
          Vehicle<span style={{ color: '#4ade80' }}>Pulse</span>
        </span>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 8 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: statusColor, display: 'inline-block' }} />
          <span style={{ fontSize: 11, color: '#888', textTransform: 'capitalize' }}>{connectionStatus}</span>
        </div>

        {mockMode && (
          <span style={{
            fontSize: 10, background: '#1e3a5f', color: '#60a5fa',
            padding: '2px 7px', borderRadius: 4, letterSpacing: 0.5,
          }}>MOCK MODE</span>
        )}

        {activeSession && (
          <span style={{ fontSize: 10, color: '#444', fontFamily: 'monospace', marginLeft: 4 }}>
            {activeSession.session_id.slice(0, 8)}
          </span>
        )}

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <NavBtn onClick={onShowThresholds}>Thresholds</NavBtn>
          <NavBtn onClick={onShowSessions}>Sessions</NavBtn>
        </div>
      </header>

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Gauge grid */}
        <div style={{
          flex: 1, padding: 20, overflowY: 'auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: 14,
          alignContent: 'start',
        }}>
          {PID_ORDER.map((pid) => (
            <GaugeCard key={pid} pid={pid} />
          ))}
        </div>

        {/* Fault panel */}
        <aside style={{
          width: 260, borderLeft: '1px solid #1f1f1f', flexShrink: 0, overflowY: 'auto',
        }}>
          <FaultPanel />
        </aside>
      </div>
    </div>
  )
}

function NavBtn({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      background: '#1a1a1a', border: '1px solid #2a2a2a', color: '#aaa',
      borderRadius: 6, padding: '5px 12px', cursor: 'pointer', fontSize: 11,
    }}>
      {children}
    </button>
  )
}
