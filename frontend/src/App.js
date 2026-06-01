import { jsx as _jsx } from "react/jsx-runtime";
import { useState } from 'react';
import Dashboard from './components/Dashboard';
import SessionList from './components/SessionList';
import ThresholdEditor from './components/ThresholdEditor';
export default function App() {
    const [view, setView] = useState('dashboard');
    if (view === 'sessions')
        return _jsx(SessionList, { onBack: () => setView('dashboard') });
    if (view === 'thresholds')
        return _jsx(ThresholdEditor, { onBack: () => setView('dashboard') });
    return (_jsx(Dashboard, { onShowSessions: () => setView('sessions'), onShowThresholds: () => setView('thresholds') }));
}
