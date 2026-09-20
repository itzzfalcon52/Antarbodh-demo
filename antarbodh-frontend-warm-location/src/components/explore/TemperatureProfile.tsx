import { useId, useMemo } from 'react';
import type { ProfileResponse } from '../../types/api';

interface TemperatureProfileProps {
  profile: ProfileResponse;
  selectedDepth: number;
  theme?: 'default' | 'warm';
}

export function TemperatureProfile({ profile, selectedDepth, theme = 'default' }: TemperatureProfileProps) {
  const width = 280;
  const height = 320;
  const padding = { top: 20, right: 20, bottom: 30, left: 40 };

  const gradientId = useId();
  const isWarm = theme === 'warm';

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
    return (
      <div
        style={{
          color: 'var(--color-text-subtle)',
          textAlign: 'center',
          padding: 'var(--space-4)',
          fontSize: '0.8rem',
        }}
      >
        Profile Data Unavailable
      </div>
    );
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

  // Closed area between the profile and the left axis.
  // Purely a visual fill of the same path — no new values.
  const areaPath =
    `${linePath} L ${padding.left} ${scaleY(data[data.length - 1].depth)}` +
    ` L ${padding.left} ${scaleY(data[0].depth)} Z`;

  const selectedPoint = data.find(d => d.depth === selectedDepth);

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        minHeight: 0,
        display: 'flex',
        justifyContent: 'center',
      }}
    >
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        width="100%"
        height="100%"
        style={{ maxHeight: `${height}px`, overflow: 'visible' }}
        role="img"
        aria-label="Reconstructed temperature against depth"
      >
        {!isWarm && (
          <defs>
            <linearGradient id={`${gradientId}-fill`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--depth-upper)" stopOpacity="0.20" />
              <stop offset="55%" stopColor="var(--depth-thermocline)" stopOpacity="0.10" />
              <stop offset="100%" stopColor="var(--depth-deep)" stopOpacity="0.02" />
            </linearGradient>

            <linearGradient id={`${gradientId}-line`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--depth-upper)" />
              <stop offset="60%" stopColor="var(--depth-thermocline)" />
              <stop offset="100%" stopColor="var(--depth-line-deep)" />
            </linearGradient>
          </defs>
        )}

        {/* Plot frame — left and bottom only, like an instrument */}
        <line
          x1={padding.left} y1={padding.top - 6}
          x2={padding.left} y2={height - padding.bottom}
          stroke="var(--color-border-strong)" strokeWidth="1"
        />
        <line
          x1={padding.left} y1={height - padding.bottom}
          x2={width - padding.right} y2={height - padding.bottom}
          stroke="var(--color-border-strong)" strokeWidth="1"
        />

        {/* Horizontal grid lines for major depths */}
        {[0, 100, 500, 1000].map(d => (
          <g key={d}>
            <line
              x1={padding.left} y1={scaleY(d)}
              x2={width - padding.right} y2={scaleY(d)}
              stroke="var(--color-border-faint)" strokeWidth="1" strokeDasharray="2 5"
            />
            <text
              x={padding.left - 8} y={scaleY(d) + 3.5}
              fill="var(--color-text-faint)" fontSize="9" textAnchor="end"
              fontFamily="var(--font-mono)" letterSpacing="0.04em"
            >
              {d}
            </text>
          </g>
        ))}

        {/* X axis labels */}
        {[minTemp, Math.round((minTemp + maxTemp) / 2), maxTemp].map((t, idx) => (
          <g key={`${t}-${idx}`}>
            <text
              x={scaleX(t)} y={height - 11}
              fill="var(--color-text-faint)" fontSize="9" textAnchor="middle"
              fontFamily="var(--font-mono)" letterSpacing="0.04em"
            >
              {t}°
            </text>
          </g>
        ))}

        {/* Area beneath the profile */}
        <path d={areaPath} fill={isWarm ? 'var(--location-accent-soft)' : `url(#${gradientId}-fill)`} stroke="none" />

        {/* Selected-depth crosshair */}
        {selectedPoint && (
          <g style={{ transition: 'all var(--transition-normal)' }}>
            <line
              x1={padding.left} y1={scaleY(selectedPoint.depth)}
              x2={scaleX(selectedPoint.temp)} y2={scaleY(selectedPoint.depth)}
              stroke="var(--location-accent-bright)" strokeWidth="1" strokeOpacity="0.55"
            />
            <line
              x1={scaleX(selectedPoint.temp)} y1={scaleY(selectedPoint.depth)}
              x2={scaleX(selectedPoint.temp)} y2={height - padding.bottom}
              stroke="var(--location-accent-bright)" strokeWidth="1" strokeOpacity="0.32"
              strokeDasharray="2 3"
            />
          </g>
        )}

        {/* The profile line */}
        <path
          d={linePath} fill="none" stroke={isWarm ? 'var(--location-accent)' : `url(#${gradientId}-line)`}
          strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"
        />

        {/* Points */}
        {data.map(d => {
          const isSelected = d.depth === selectedDepth;
          return (
            <circle
              key={d.depth}
              cx={scaleX(d.temp)}
              cy={scaleY(d.depth)}
              r={isSelected ? 4.5 : 2}
              fill={isSelected ? 'var(--location-accent-bright)' : 'var(--color-panel)'}
              stroke={isSelected ? (isWarm ? 'var(--location-ink)' : 'var(--color-ink)') : (isWarm ? 'var(--location-accent)' : 'var(--color-ocean)')}
              strokeWidth={isSelected ? 2 : 1.25}
              style={{ transition: 'r var(--transition-normal), fill var(--transition-normal)' }}
            />
          );
        })}

        {/* Axis captions */}
        <text
          x={width - padding.right} y={padding.top - 8}
          fill="var(--color-text-faint)" fontSize="8.5" textAnchor="end"
          letterSpacing="0.14em"
        >
          DEPTH (m)
        </text>
      </svg>
    </div>
  );
}
