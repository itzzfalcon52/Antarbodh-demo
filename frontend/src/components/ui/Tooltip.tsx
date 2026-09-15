import { useState } from 'react';

interface TooltipProps {
  children: React.ReactNode;
  content: string;
}

export function Tooltip({ children, content }: TooltipProps) {
  const [show, setShow] = useState(false);

  return (
    <div 
      style={{ position: 'relative', display: 'inline-flex' }}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <div style={{
          position: 'absolute',
          bottom: '100%',
          left: '50%',
          transform: 'translateX(-50%)',
          marginBottom: 'var(--space-2)',
          padding: 'var(--space-1) var(--space-2)',
          backgroundColor: 'var(--color-ink)',
          color: 'var(--color-text)',
          fontSize: '0.75rem',
          borderRadius: 'var(--radius-sm)',
          whiteSpace: 'nowrap',
          zIndex: 10,
          border: '1px solid var(--color-border)',
          pointerEvents: 'none'
        }}>
          {content}
        </div>
      )}
    </div>
  );
}
