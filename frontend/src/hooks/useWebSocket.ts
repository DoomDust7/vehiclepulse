import { useEffect, useRef } from 'react'
import { usePIDStore } from '../store/pidStore'
import { startDemo, stopDemo } from '../demo/demoSimulator'

const WS_SCHEME = window.location.protocol === 'https:' ? 'wss' : 'ws'
const WS_URL = import.meta.env.VITE_WS_URL ?? `${WS_SCHEME}://${window.location.hostname}:8000/ws`
const DEMO_START_AFTER_MS = 2500
// While demo runs, retry backend every 30s in the background
const DEMO_RETRY_INTERVAL_MS = 30_000

export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null)
  const demoRunning = useRef(false)
  const demoTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { onPIDReading, onFaultEvent, onSessionStart, onSessionEnd, setConnectionStatus } = usePIDStore()

  useEffect(() => {
    let unmounted = false

    function launchDemo() {
      if (unmounted || demoRunning.current) return
      demoRunning.current = true
      startDemo()
      // Silently retry backend every 30s — if it comes up, take over seamlessly
      scheduleBackgroundRetry()
    }

    function scheduleBackgroundRetry() {
      retryTimer.current = setTimeout(() => {
        if (!unmounted && demoRunning.current) attemptConnect()
      }, DEMO_RETRY_INTERVAL_MS)
    }

    function attemptConnect() {
      if (unmounted) return
      let ws: WebSocket
      try {
        ws = new WebSocket(WS_URL)
      } catch {
        if (demoRunning.current) scheduleBackgroundRetry()
        return
      }
      wsRef.current = ws

      ws.onopen = () => {
        if (demoRunning.current) {
          demoRunning.current = false
          stopDemo()
        }
        setConnectionStatus('connected')
      }

      ws.onmessage = (ev) => {
        try {
          const envelope = JSON.parse(ev.data)
          const messages = envelope.type === 'batch' ? envelope.messages : [envelope]
          for (const msg of messages) dispatch(msg)
        } catch { /* ignore malformed frames */ }
      }

      ws.onclose = () => {
        if (unmounted) return
        if (demoRunning.current) {
          // Real backend dropped — demo already running, just retry quietly
          scheduleBackgroundRetry()
        } else {
          // Demo not yet running; use fast backoff until demo kicks in
          setConnectionStatus('reconnecting')
        }
      }

      ws.onerror = () => ws.close()
    }

    function dispatch(msg: { type: string; payload: unknown }) {
      if (msg.type === 'pid_reading') onPIDReading(msg.payload as Parameters<typeof onPIDReading>[0])
      else if (msg.type === 'fault_event') onFaultEvent(msg.payload as Parameters<typeof onFaultEvent>[0])
      else if (msg.type === 'session_start') onSessionStart(msg.payload as Parameters<typeof onSessionStart>[0])
      else if (msg.type === 'session_end') onSessionEnd()
    }

    // First connection attempt
    setConnectionStatus('connecting')
    let ws: WebSocket
    try {
      ws = new WebSocket(WS_URL)
    } catch {
      // HTTPS → ws:// blocked immediately; go straight to demo
      demoTimer.current = setTimeout(launchDemo, DEMO_START_AFTER_MS)
      return () => {
        unmounted = true
        if (demoTimer.current) clearTimeout(demoTimer.current)
        if (retryTimer.current) clearTimeout(retryTimer.current)
        if (demoRunning.current) stopDemo()
      }
    }
    wsRef.current = ws

    ws.onopen = () => {
      if (demoTimer.current) { clearTimeout(demoTimer.current); demoTimer.current = null }
      setConnectionStatus('connected')
    }

    ws.onmessage = (ev) => {
      try {
        const envelope = JSON.parse(ev.data)
        const messages = envelope.type === 'batch' ? envelope.messages : [envelope]
        for (const msg of messages) dispatch(msg)
      } catch { /* ignore */ }
    }

    ws.onclose = () => {
      if (unmounted) return
      setConnectionStatus('reconnecting')
      // Start demo after the first failed connection
      demoTimer.current = setTimeout(launchDemo, DEMO_START_AFTER_MS)
    }

    ws.onerror = () => ws.close()

    return () => {
      unmounted = true
      wsRef.current?.close()
      if (demoTimer.current) clearTimeout(demoTimer.current)
      if (retryTimer.current) clearTimeout(retryTimer.current)
      if (demoRunning.current) stopDemo()
    }
  }, [])
}
