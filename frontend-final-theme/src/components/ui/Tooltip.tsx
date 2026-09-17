import { useState } from 'react';
import type { ReactNode } from 'react';

interface TooltipProps {
  children: ReactNode;
  content: string;
}

export function Tooltip({ children, content }: TooltipProps) {
  const [show, setShow] = useState(false);

  return (
    <span
      style={{ position: 'relative', display: 'inline-flex' }}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      onFocus={() => setShow(true)}
      onBlur={() => setShow(false)}
    >
      {children}

      <span
        role="tooltip"
        style={{
          position: 'absolute',
          bottom: '100%',
          left: '50%',
          marginBottom: 'var(--space-2)',
          padding: '5px 9px',
          backgroundColor: 'var(--color-abyss)',
          color: 'var(--color-text)',
          fontSize: '0.6875rem',
          letterSpacing: '0.01em',
          lineHeight: 1.4,
          borderRadius: 'var(--radius-sm)',
          whiteSpace: 'nowrap',
          zIndex: 50,
          border: '1px solid var(--color-border)',
          boxShadow: 'var(--shadow-md)',
          pointerEvents: 'none',
          opacity: show ? 1 : 0,
          transform: show
            ? 'translateX(-50%) translateY(0)'
            : 'translateX(-50%) translateY(3px)',
          transition:
            'opacity var(--transition-fast), transform var(--transition-fast)',
        }}
      >
        {content}
      </span>
    </span>
  );
}
