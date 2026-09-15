import type { ButtonHTMLAttributes, CSSProperties } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

export function Button({ variant = 'primary', size = 'md', style, children, ...props }: ButtonProps) {
  const baseStyles: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 500,
    borderRadius: 'var(--radius-md)',
    border: '1px solid transparent',
    cursor: 'pointer',
    transition: 'var(--transition-fast)',
    outline: 'none',
  };

  const variants: Record<string, CSSProperties> = {
    primary: {
      backgroundColor: 'var(--color-ocean)',
      color: 'var(--color-ink)',
    },
    secondary: {
      backgroundColor: 'var(--color-panel-light)',
      color: 'var(--color-text)',
      borderColor: 'var(--color-border)',
    },
    ghost: {
      backgroundColor: 'transparent',
      color: 'var(--color-text-subtle)',
    }
  };

  const sizes: Record<string, CSSProperties> = {
    sm: { padding: 'var(--space-1) var(--space-2)', fontSize: '0.875rem' },
    md: { padding: 'var(--space-2) var(--space-4)', fontSize: '1rem' },
    lg: { padding: 'var(--space-3) var(--space-6)', fontSize: '1.125rem' },
  };

  return (
    <button
      style={{ ...baseStyles, ...variants[variant], ...sizes[size], ...style }}
      {...props}
    >
      {children}
    </button>
  );
}
