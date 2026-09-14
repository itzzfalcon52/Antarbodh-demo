interface DataLegendProps {
  min: number;
  max: number;
  unit: string;
  variableName: string;
}

export function DataLegend({ min, max, unit, variableName }: DataLegendProps) {
  // We use the same gradient logic as thermalColormap in CSS
  // Deep blue -> Cyan -> Green -> Yellow -> Red
  const gradient = `linear-gradient(to right, 
    rgb(13, 71, 161) 0%, 
    rgb(6, 182, 212) 25%, 
    rgb(16, 185, 129) 50%, 
    rgb(234, 179, 8) 75%, 
    rgb(239, 68, 68) 100%
  )`;

  return (
    <div className="panel" style={{
      position: 'absolute', bottom: '100px', right: '24px',
      padding: '12px 16px', width: '280px', display: 'flex', flexDirection: 'column', gap: '8px'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-secondary)' }}>
          {variableName}
        </div>
        <div className="mono" style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
          {unit}
        </div>
      </div>
      
      <div style={{ height: '8px', background: gradient, borderRadius: '4px' }} />
      
      <div className="mono" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-primary)' }}>
        <span>{min.toFixed(1)}</span>
        <span>{max.toFixed(1)}</span>
      </div>
    </div>
  );
}
