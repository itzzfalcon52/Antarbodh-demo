export function TemperatureLegend() {
  return (
    <div style={{
      padding: 'var(--space-3)',
      backgroundColor: 'rgba(6, 20, 29, 0.85)',
      backdropFilter: 'blur(8px)',
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-md)',
      width: '240px'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
        <span className="label-scientific">TEMPERATURE</span>
        <span className="label-scientific" style={{ color: 'var(--color-text-subtle)' }}>°C</span>
      </div>
      <div style={{
        height: '8px',
        width: '100%',
        borderRadius: '4px',
        background: 'linear-gradient(to right, #313695, #4575b4, #74add1, #abd9e9, #e0f3f8, #fee090, #fdae61, #f46d43, #d73027)'
      }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'var(--space-2)', fontSize: '0.65rem', color: 'var(--color-text-subtle)', fontFamily: 'var(--font-mono)' }}>
        <span>0</span>
        <span>8</span>
        <span>16</span>
        <span>24</span>
        <span>32</span>
      </div>
    </div>
  );
}
