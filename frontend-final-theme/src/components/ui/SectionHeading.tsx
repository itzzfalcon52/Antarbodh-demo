import type { ReactNode } from 'react';

interface SectionHeadingProps {
  /** Short uppercase title. */
  title: string;

  /** Optional editorial index, e.g. "01". */
  index?: string;

  /** Optional supporting line rendered beneath the title. */
  description?: ReactNode;

  /** Optional controls aligned to the trailing edge. */
  trailing?: ReactNode;

  /** Extends the hairline rule across the remaining width. */
  rule?: boolean;

  style?: React.CSSProperties;
}

/**
 * The single heading treatment used across every section so
 * the interface reads with one consistent voice.
 */
export function SectionHeading({
  title,
  index,
  description,
  trailing,
  rule = false,
  style,
}: SectionHeadingProps) {
  return (
    <header style={{ ...style }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: 'var(--space-3)',
        }}
      >
        {index && <span className="label-index">{index}</span>}

        <h2
          className="label-scientific label-scientific--bright"
          style={{ margin: 0, fontSize: '0.6875rem' }}
        >
          {title}
        </h2>

        {rule && <span className="section-head__rule" />}

        {trailing && (
          <div
            style={{
              marginLeft: rule ? 0 : 'auto',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-2)',
            }}
          >
            {trailing}
          </div>
        )}
      </div>

      {description && (
        <p
          style={{
            margin: 'var(--space-2) 0 0',
            maxWidth: '62ch',
            color: 'var(--color-text-subtle)',
            fontSize: '0.8rem',
            lineHeight: 1.65,
          }}
        >
          {description}
        </p>
      )}
    </header>
  );
}
