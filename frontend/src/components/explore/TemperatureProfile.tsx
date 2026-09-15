import { useMemo } from 'react';
import type { ProfileResponse } from '../../types/api';

interface TemperatureProfileProps {
  profile: ProfileResponse;
  selectedDepth: number;
}

export function TemperatureProfile({ profile, selectedDepth }: TemperatureProfileProps) {
  const width = 280;
  const height = 320;
  const padding = { top: 20, right: 20, bottom: 30, left: 40 };

  const { depths_m, temperature_degC } = profile;

  // Filter out nulls
  const data = useMemo(() => {
    const valid: { depth: number; temp: number }[] = [];
    for (let i = 0; i < depths_m.length; i++) {
      if (temperature_degC[i] !== null) {
        valid.push({ depth: depths_m[i], temp: temperature_degC[i] as number });
      }
    }
    return valid;
  }, [depths_m, temperature_degC]);

  if (data.length === 0) {
    return <div style={{ color: 'var(--color-text-subtle)', textAlign: 'center', padding: 'var(--space-4)', fontSize: '0.875rem' }}>Profile Data Unavailable</div>;
  }

  // Scales
  const minTemp = Math.floor(Math.min(...data.map(d => d.temp)) - 1);
  const maxTemp = Math.ceil(Math.max(...data.map(d => d.temp)) + 1);
  const maxDepth = Math.max(...depths_m);

  // Safe divisions
  const xRange = Math.max(1, maxTemp - minTemp);
  const yRange = Math.max(1, maxDepth);

  const scaleX = (temp: number) => padding.left + ((temp - minTemp) / xRange) * (width - padding.left - padding.right);
  const scaleY = (depth: number) => padding.top + (depth / yRange) * (height - padding.top - padding.bottom);

  // Line path generator
  const linePath = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(d.temp)} ${scaleY(d.depth)}`).join(' ');

  return (
    <div style={{ width: '100%', overflow: 'hidden', display: 'flex', justifyContent: 'center' }}>
      <svg width={width} height={height}>
        {/* Horizontal grid lines for major depths */}
        {[0, 100, 500, 1000].map(d => (
          <g key={d}>
            <line 
              x1={padding.left} y1={scaleY(d)} 
              x2={width - padding.right} y2={scaleY(d)} 
              stroke="var(--color-border)" strokeWidth="1" strokeDasharray="4 4" 
            />
            <text x={padding.left - 8} y={scaleY(d) + 4} fill="var(--color-text-subtle)" fontSize="10" textAnchor="end" fontFamily="var(--font-mono)">
              {d}m
            </text>
          </g>
        ))}

        {/* X axis grid/labels */}
        {[minTemp, Math.round((minTemp + maxTemp) / 2), maxTemp].map((t, idx) => (
          <g key={`${t}-${idx}`}>
            <text x={scaleX(t)} y={height - 10} fill="var(--color-text-subtle)" fontSize="10" textAnchor="middle" fontFamily="var(--font-mono)">
              {t}°
            </text>
          </g>
        ))}

        {/* The profile line */}
        <path d={linePath} fill="none" stroke="var(--color-ocean)" strokeWidth="2" />

        {/* Points */}
        {data.map(d => {
          const isSelected = d.depth === selectedDepth;
          return (
            <circle
              key={d.depth}
              cx={scaleX(d.temp)}
              cy={scaleY(d.depth)}
              r={isSelected ? 5 : 3}
              fill={isSelected ? 'var(--color-teal)' : 'var(--color-deep)'}
              stroke={isSelected ? '#fff' : 'var(--color-ocean)'}
              strokeWidth={2}
              style={{ transition: 'all 0.2s ease' }}
            />
          );
        })}
      </svg>
    </div>
  );
}
