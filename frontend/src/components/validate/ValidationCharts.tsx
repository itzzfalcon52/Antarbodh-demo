import type { ValidationDepthMetrics } from '../../types/api';

interface ValidationChartsProps {
  metrics: ValidationDepthMetrics[];
}

export function ValidationCharts({ metrics }: ValidationChartsProps) {
  const depths = [0, 5, 10, 20, 30, 50, 75, 100, 125, 150, 200, 300, 500, 700, 1000];
  
  const getY = (d: number) => {
    if (d <= 200) return (d / 200) * 0.4 * 100;
    return 40 + ((d - 200) / 800) * 60;
  };

  const getRmseX = (v: number) => Math.min((v / 1.5) * 100, 100);
  const getBiasX = (v: number) => ((v + 0.8) / 1.6) * 100;

  const antarbodhRmsePoints = metrics.map(m => `${getRmseX(m.antarbodh_rmse)}%,${getY(m.depth)}%`).join(' ');
  const glorysRmsePoints = metrics.map(m => `${getRmseX(m.glorys_rmse)}%,${getY(m.depth)}%`).join(' ');

  const antarbodhBiasPoints = metrics.map(m => `${getBiasX(m.antarbodh_bias)}%,${getY(m.depth)}%`).join(' ');
  const glorysBiasPoints = metrics.map(m => `${getBiasX(m.glorys_bias)}%,${getY(m.depth)}%`).join(' ');

  const Chart = ({ title, scaleDesc, pointsA, pointsG, zeroLineX, showZero = false }: any) => (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <div className="label-scientific" style={{ marginBottom: 'var(--space-1)' }}>{title}</div>
      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-subtle)', marginBottom: 'var(--space-4)' }}>{scaleDesc}</div>
      <div style={{ position: 'relative', height: '400px', backgroundColor: 'var(--color-deep)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', padding: '10px 0' }}>
        <svg width="100%" height="100%" style={{ overflow: 'visible' }}>
          {/* Grid lines */}
          {[0, 25, 50, 75, 100].map(p => (
            <line key={p} x1={`${p}%`} y1="0" x2={`${p}%`} y2="100%" stroke="rgba(255,255,255,0.05)" strokeWidth="1" strokeDasharray="2,4" />
          ))}
          {showZero && (
            <line x1={`${zeroLineX}%`} y1="0" x2={`${zeroLineX}%`} y2="100%" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
          )}

          {/* Depth lines */}
          {depths.map(d => (
            <line key={`d${d}`} x1="0" y1={`${getY(d)}%`} x2="100%" y2={`${getY(d)}%`} stroke="rgba(255,255,255,0.02)" strokeWidth="1" />
          ))}

          {/* GLORYS Line */}
          <polyline points={pointsG} fill="none" stroke="var(--color-text-subtle)" strokeWidth="2" strokeDasharray="4,4" />
          
          {/* ANTARBODH Line */}
          <polyline points={pointsA} fill="none" stroke="var(--color-teal)" strokeWidth="3" />

          {/* Points */}
          {metrics.map((m, i) => {
            const y = getY(m.depth);
            const xA = title.includes('RMSE') ? getRmseX(m.antarbodh_rmse) : getBiasX(m.antarbodh_bias);
            const xG = title.includes('RMSE') ? getRmseX(m.glorys_rmse) : getBiasX(m.glorys_bias);
            return (
              <g key={i}>
                <circle cx={`${xG}%`} cy={`${y}%`} r="3" fill="var(--color-deep)" stroke="var(--color-text-subtle)" strokeWidth="1.5" />
                <circle cx={`${xA}%`} cy={`${y}%`} r="4" fill="var(--color-deep)" stroke="var(--color-teal)" strokeWidth="2" />
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', gap: 'var(--space-6)' }}>
      <Chart 
        title="RMSE BY DEPTH (°C)" 
        scaleDesc="0.0 to 1.5 (Lower is better)"
        pointsA={antarbodhRmsePoints} 
        pointsG={glorysRmsePoints} 
      />
      <Chart 
        title="BIAS BY DEPTH (°C)" 
        scaleDesc="-0.8 to +0.8 (Closer to 0 is better)"
        pointsA={antarbodhBiasPoints} 
        pointsG={glorysBiasPoints}
        showZero={true}
        zeroLineX={50}
      />
    </div>
  );
}
