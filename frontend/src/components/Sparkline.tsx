import { PIDReading } from '../store/pidStore'

interface Props {
  history: PIDReading[]
  min: number
  max: number
  width?: number
  height?: number
  color?: string
}

export default function Sparkline({ history, min, max, width = 120, height = 30, color = '#4ade80' }: Props) {
  if (history.length < 2) return <svg width={width} height={height} />

  const range = max - min || 1
  const pts = history.slice(-60).map((r, i, arr) => {
    const x = (i / (arr.length - 1)) * width
    const y = height - ((( r.value ?? min) - min) / range) * height
    return `${x},${y}`
  })

  return (
    <svg width={width} height={height} style={{ display: 'block' }}>
      <polyline
        points={pts.join(' ')}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  )
}
