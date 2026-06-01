import { useEffect, useState } from 'react'
import { api, ThresholdRule } from '../api/client'

const DEFAULT_RULES: ThresholdRule[] = [
  { pid: '05', op: 'gt',            value: 110,  severity: 'warning',  cooldown_s: 30,  range_min: null, range_max: null },
  { pid: '05', op: 'gt',            value: 120,  severity: 'critical', cooldown_s: 10,  range_min: null, range_max: null },
  { pid: '0C', op: 'gt',            value: 6000, severity: 'warning',  cooldown_s: 5,   range_min: null, range_max: null },
  { pid: '14', op: 'range_outside', value: 0,    severity: 'warning',  cooldown_s: 15,  range_min: 0.1,  range_max: 0.9 },
  { pid: '15', op: 'range_outside', value: 0,    severity: 'warning',  cooldown_s: 15,  range_min: 0.1,  range_max: 0.9 },
  { pid: '10', op: 'gt',            value: 20,   severity: 'warning',  cooldown_s: 10,  range_min: null, range_max: null },
  { pid: '04', op: 'gt',            value: 95,   severity: 'warning',  cooldown_s: 10,  range_min: null, range_max: null },
]

interface Props {
  onBack: () => void
}

export default function ThresholdEditor({ onBack }: Props) {
  const [rules, setRules] = useState<ThresholdRule[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    api.getThresholds()
      .then(setRules)
      .catch(() => setRules(DEFAULT_RULES))
      .finally(() => setLoading(false))
  }, [])

  async function save() {
    setSaving(true)
    try {
      await api.setThresholds(rules)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  function update(idx: number, field: keyof ThresholdRule, val: string | number) {
    setRules((prev) => prev.map((r, i) => i === idx ? { ...r, [field]: val } : r))
  }

  return (
    <div style={{ padding: 24, maxWidth: 700, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button onClick={onBack} style={{
          background: '#2a2a2a', border: '1px solid #333', color: '#e0e0e0',
          borderRadius: 6, padding: '6px 12px', cursor: 'pointer', fontSize: 12,
        }}>← Back</button>
        <h2 style={{ fontSize: 16, fontWeight: 700, flex: 1 }}>Threshold Rules</h2>
        <button onClick={save} disabled={saving} style={{
          background: saving ? '#1a3a1a' : '#166534', border: 'none', color: '#4ade80',
          borderRadius: 6, padding: '6px 16px', cursor: 'pointer', fontSize: 12,
        }}>
          {saving ? 'Saving...' : saved ? 'Saved!' : 'Save'}
        </button>
      </div>

      {loading && <div style={{ color: '#555' }}>Loading...</div>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {rules.map((rule, i) => (
          <div key={i} style={{
            background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 8,
            padding: '12px 14px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, alignItems: 'center',
          }}>
            <Field label="PID" value={rule.pid} onChange={(v) => update(i, 'pid', v)} />
            <Field label="Op" value={rule.op} onChange={(v) => update(i, 'op', v)} />
            <Field label="Value" value={String(rule.value)} onChange={(v) => update(i, 'value', Number(v))} type="number" />
            <Field label="Severity" value={rule.severity} onChange={(v) => update(i, 'severity', v)} />
          </div>
        ))}
      </div>
    </div>
  )
}

function Field({ label, value, onChange, type = 'text' }: {
  label: string; value: string; onChange: (v: string) => void; type?: string
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <label style={{ fontSize: 10, color: '#555', textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          background: '#111', border: '1px solid #2a2a2a', borderRadius: 4,
          color: '#e0e0e0', padding: '4px 8px', fontSize: 12, width: '100%',
        }}
      />
    </div>
  )
}
