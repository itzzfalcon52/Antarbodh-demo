import type { CSSProperties, ReactNode } from 'react';

type PanelVariant = 'default' | 'framed' | 'flush' | 'inset';

interface PanelProps {
  children: ReactNode;
  style?: CSSProperties;
  className?: string;

  /** Visual treatment only. Defaults to the standard surface. */
  variant?: PanelVariant;

  /** Adds a restrained hover response for clickable surfaces. */
  interactive?: boolean;
}

const VARIANT_CLASS: Record<PanelVariant, string> = {
  default: 'surface',
  framed: 'surface surface--framed',
  flush: 'surface surface--flush',
  inset: 'surface surface--inset',
};

export function Panel({
  children,
  style,
  className,
  variant = 'framed',
  interactive = false,
}: PanelProps) {
  const classes = [
    VARIANT_CLASS[variant],
    interactive ? 'surface--interactive' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classes} style={style}>
      {children}
    </div>
  );
}
