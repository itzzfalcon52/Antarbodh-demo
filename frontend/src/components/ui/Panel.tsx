
interface PanelProps {
  children: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
}

export function Panel({ children, style, className }: PanelProps) {
  return (
    <div
      style={{
        backgroundColor: 'var(--color-panel)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--space-4)',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        ...style
      }}
      className={className}
    >
      {children}
    </div>
  );
}
