export function ProgressBar({ done, total }: { done: number; total: number }) {
  const pct = total === 0 ? 0 : Math.round((done / total) * 100)
  return (
    <div className="progress-bar">
      <div className="progress-bar__fill" style={{ width: `${pct}%` }} />
    </div>
  )
}
