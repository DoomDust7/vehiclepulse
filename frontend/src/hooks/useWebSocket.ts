import { useEffect, useRef } from 'react'
import { usePIDStore } from '../store/pidStore'

const WS_URL = import.meta.env.VITE_WS_URL ?? `ws://${window.location.hostname}:8000/ws`
const MAX_BACKOFF_MS = 30_000

export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null)
  const backoffRef = useRef(1000)
  const { onPIDReading, onFaultEvent, onSessionStart, onSessionEnd, setConnectionStatus } = usePIDStore()

  useEffect(() => {
    let unmounted = false

    function connect() {
      if (unmounted) return
      setConnectionStatus('connecting')
      const ws = new WebSocket(WS_URL)
      wsRef.current = ws

      ws.onopen = () => {
        backoffRef.current = 1000
        setConnectionStatus('connected')
      }

      ws.onmessage = (ev) => {
        try {
          const envelope = JSON.parse(ev.data)
          // Backend sends batched frames
          const messages = envelope.type === 'batch' ? envelope.messages : [envelope]
          for (const msg of messages) {
            dispatch(msg)
          }
        } catch {
          // ignore malformed frames
        }
      }

      ws.onclose = () => {
        if (unmounted) return
        setConnectionStatus('reconnecting')
        const delay = Math.min(backoffRef.current, MAX_BACKOFF_MS)
        backoffRef.current = Math.min(backoffRef.current * 2, MAX_BACKOFF_MS)
        setTimeout(connect, delay)
      }

      ws.onerror = () => ws.close()
    }

    function dispatch(msg: { type: string; payload: unknown }) {
      if (msg.type === 'pid_reading') onPIDReading(msg.payload as Parameters<typeof onPIDReading>[0])
      else if (msg.type === 'fault_event') onFaultEvent(msg.payload as Parameters<typeof onFaultEvent>[0])
      else if (msg.type === 'session_start') onSessionStart(msg.payload as Parameters<typeof onSessionStart>[0])
      else if (msg.type === 'session_end') onSessionEnd()
    }

    connect()
    return () => {
      unmounted = true
      wsRef.current?.close()
    }
  }, [])
}
