import { useEffect, useRef } from 'react'
import { usePIDStore } from '../store/pidStore'
import { startDemo, stopDemo } from '../demo/demoSimulator'

const WS_SCHEME = window.location.protocol === 'https:' ? 'wss' : 'ws'
const WS_URL = import.meta.env.VITE_WS_URL ?? `${WS_SCHEME}://${window.location.hostname}:8000/ws`
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

    // First connection attempt — with a hard 3s open timeout so a TCP hang
    // (e.g. Vercel port 8000 unreachable) doesn't block the demo indefinitely.
    setConnectionStatus('connecting')

    function tryConnect() {
      if (unmounted) return
      let ws: WebSocket
      try {
        ws = new WebSocket(WS_URL)
      } catch {
        launchDemo()
        return
      }
      wsRef.current = ws

      const openTimeout = setTimeout(() => {
        if (ws.readyState !== WebSocket.OPEN) ws.close()
      }, 3000)

      ws.onopen = () => {
        clearTimeout(openTimeout)
        if (demoTimer.current) { clearTimeout(demoTimer.current); demoTimer.current = null }
        if (demoRunning.current) { demoRunning.current = false; stopDemo() }
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
        clearTimeout(openTimeout)
        if (unmounted) return
        if (!demoRunning.current) {
          setConnectionStatus('reconnecting')
          launchDemo()
        }
      }

      ws.onerror = () => ws.close()
    }

    tryConnect()

    return () => {
      unmounted = true
      wsRef.current?.close()
      if (demoTimer.current) clearTimeout(demoTimer.current)
      if (retryTimer.current) clearTimeout(retryTimer.current)
      if (demoRunning.current) stopDemo()
    }
  }, [])
}
