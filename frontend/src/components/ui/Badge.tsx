
interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'ocean' | 'warning' | 'danger';
}

export function Badge({ children, variant = 'default' }: BadgeProps) {
  const variants: Record<string, React.CSSProperties> = {
    default: { backgroundColor: 'var(--color-panel-light)', color: 'var(--color-text)' },
    ocean: { backgroundColor: 'var(--color-ocean)', color: 'var(--color-ink)' },
    warning: { backgroundColor: 'var(--color-warning)', color: 'var(--color-ink)' },
    danger: { backgroundColor: 'var(--color-danger)', color: '#fff' }
  };

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      padding: '2px var(--space-2)',
      borderRadius: 'var(--radius-sm)',
      fontSize: '0.75rem',
      fontWeight: 600,
      letterSpacing: '0.05em',
      textTransform: 'uppercase',
      ...variants[variant]
    }}>
      {children}
    </span>
  );
}
