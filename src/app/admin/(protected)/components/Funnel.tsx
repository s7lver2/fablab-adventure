export function Funnel({ rows }: { rows: { path: string; count: number }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.count))
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {rows.map((r, i) => (
        <div key={r.path} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontFamily: 'var(--adm-font-mono)', fontSize: 10, color: 'var(--adm-label)', width: 14 }}>{i + 1}</span>
          <div style={{ flex: 1, position: 'relative', background: 'var(--adm-track)', borderRadius: 6, height: 26, overflow: 'hidden' }}>
            <div style={{ position: 'absolute', inset: 0, width: `${Math.max(8, (r.count / max) * 100)}%`, background: 'var(--adm-soft)', borderRight: '2px solid var(--adm-accent)' }} />
            <span style={{ position: 'absolute', left: 10, top: 0, lineHeight: '26px', fontFamily: 'var(--adm-font-mono)', fontSize: 11, color: 'var(--adm-text)' }}>{r.path}</span>
          </div>
          <span style={{ fontFamily: 'var(--adm-font-mono)', fontSize: 11, color: 'var(--adm-muted)', width: 34, textAlign: 'right' }}>{r.count}</span>
        </div>
      ))}
    </div>
  )
}
