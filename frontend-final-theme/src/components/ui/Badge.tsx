import type { ReactNode } from 'react';

interface BadgeProps {
  children: ReactNode;
  variant?: 'default' | 'ocean' | 'warning' | 'danger';

  /** Renders a small status dot before the label. */
  dot?: boolean;
}

export function Badge({
  children,
  variant = 'default',
  dot = false,
}: BadgeProps) {
  return (
    <span className={`badge badge--${variant}`}>
      {dot && (
        <span
          aria-hidden="true"
          style={{
            width: '5px',
            height: '5px',
            borderRadius: '50%',
            backgroundColor: 'currentColor',
            flexShrink: 0,
          }}
        />
      )}
      {children}
    </span>
  );
}
