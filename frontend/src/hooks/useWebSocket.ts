import { useEffect, useRef } from 'react'
import { usePIDStore } from '../store/pidStore'
import { startDemo, stopDemo } from '../demo/demoSimulator'

const WS_SCHEME = window.location.protocol === 'https:' ? 'wss' : 'ws'
const WS_URL = import.meta.env.VITE_WS_URL ?? `${WS_SCHEME}://${window.location.hostname}:8000/ws`
const MAX_BACKOFF_MS = 30_000
// Start demo after this many failed ms (first backoff = 1 s, so demo kicks in after ~2 s)
const DEMO_START_AFTER_MS = 2500

export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null)
  const backoffRef = useRef(1000)
  const demoRunning = useRef(false)
  const demoTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { onPIDReading, onFaultEvent, onSessionStart, onSessionEnd, setConnectionStatus } = usePIDStore()

  useEffect(() => {
    let unmounted = false

    // Schedule demo if real backend doesn't connect within DEMO_START_AFTER_MS
    demoTimer.current = setTimeout(() => {
      if (!unmounted && backoffRef.current > 1000) {
        demoRunning.current = true
        startDemo()
      }
    }, DEMO_START_AFTER_MS)

    function connect() {
      if (unmounted) return
      setConnectionStatus('connecting')
      let ws: WebSocket
      try {
        ws = new WebSocket(WS_URL)
      } catch {
        // e.g. SecurityError on https → ws:// mismatch; treat as immediate close
        setConnectionStatus('reconnecting')
        const delay = Math.min(backoffRef.current, MAX_BACKOFF_MS)
        backoffRef.current = Math.min(backoffRef.current * 2, MAX_BACKOFF_MS)
        setTimeout(connect, delay)
        return
      }
      wsRef.current = ws

      ws.onopen = () => {
        backoffRef.current = 1000
        setConnectionStatus('connected')
        // Real backend connected — tear down demo
        if (demoRunning.current) {
          demoRunning.current = false
          stopDemo()
        }
        if (demoTimer.current) {
          clearTimeout(demoTimer.current)
          demoTimer.current = null
        }
      }

      ws.onmessage = (ev) => {
        try {
          const envelope = JSON.parse(ev.data)
          const messages = envelope.type === 'batch' ? envelope.messages : [envelope]
          for (const msg of messages) dispatch(msg)
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
      if (demoTimer.current) clearTimeout(demoTimer.current)
      if (demoRunning.current) stopDemo()
    }
  }, [])
}
