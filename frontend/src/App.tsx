import { useState } from 'react'
import Dashboard from './components/Dashboard'
import SessionList from './components/SessionList'
import ThresholdEditor from './components/ThresholdEditor'

type View = 'dashboard' | 'sessions' | 'thresholds'

export default function App() {
  const [view, setView] = useState<View>('dashboard')

  if (view === 'sessions') return <SessionList onBack={() => setView('dashboard')} />
  if (view === 'thresholds') return <ThresholdEditor onBack={() => setView('dashboard')} />

  return (
    <Dashboard
      onShowSessions={() => setView('sessions')}
      onShowThresholds={() => setView('thresholds')}
    />
  )
}
