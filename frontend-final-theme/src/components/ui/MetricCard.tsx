import type { ReactNode } from 'react';

interface MetricCardProps {
  /** Uppercase metric name, e.g. "RMSE". */
  label: string;

  /** Pre-formatted value. Formatting stays with the caller. */
  value: ReactNode;

  /** Unit or qualifier rendered next to the value. */
  unit?: string;

  /** Short clarifying line beneath the value. */
  note?: ReactNode;

  /** Colour emphasis only — carries no computation. */
  tone?: 'default' | 'ocean' | 'teal' | 'warning' | 'danger';

  /** Layout density. */
  size?: 'sm' | 'md';

  style?: React.CSSProperties;
}

const TONE_COLOR: Record<string, string> = {
  default: 'var(--color-text)',
  ocean: 'var(--color-ocean-bright)',
  teal: 'var(--color-teal)',
  warning: 'var(--color-warning)',
  danger: 'var(--color-danger)',
};

/**
 * A measurement readout. Deliberately borderless on three sides
 * so a row of metrics reads as one instrument panel rather than
 * as a strip of identical cards.
 */
export function MetricCard({
  label,
  value,
  unit,
  note,
  tone = 'default',
  size = 'md',
  style,
}: MetricCardProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: size === 'sm' ? '5px' : 'var(--space-2)',
        paddingLeft: 'var(--space-4)',
        borderLeft: '1px solid var(--color-border)',
        minWidth: 0,
        ...style,
      }}
    >
      <span className="label-scientific">{label}</span>

      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: '5px',
          minWidth: 0,
        }}
      >
        <span
          className="data-readout"
          style={{
            color: TONE_COLOR[tone],
            fontSize: size === 'sm' ? '1.15rem' : '1.6rem',
          }}
        >
          {value}
        </span>

        {unit && (
          <span
            className="data-numeric"
            style={{
              color: 'var(--color-text-subtle)',
              fontSize: '0.72rem',
            }}
          >
            {unit}
          </span>
        )}
      </div>

      {note && (
        <span
          style={{
            color: 'var(--color-text-faint)',
            fontSize: '0.6875rem',
            lineHeight: 1.5,
          }}
        >
          {note}
        </span>
      )}
    </div>
  );
}
