
export function LoadingState({ message = 'Loading...' }: { message?: string }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 'var(--space-8)',
      color: 'var(--color-text-subtle)'
    }}>
      <div style={{
        width: '24px',
        height: '24px',
        border: '2px solid var(--color-border)',
        borderTopColor: 'var(--color-ocean)',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite'
      }} />
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
      <div style={{ marginTop: 'var(--space-4)', fontSize: '0.875rem' }}>{message}</div>
    </div>
  );
}
