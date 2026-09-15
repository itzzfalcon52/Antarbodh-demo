import { AlertCircle } from 'lucide-react';

export function ErrorState({ title = 'Error', message }: { title?: string, message: string }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 'var(--space-8)',
      color: 'var(--color-danger)',
      textAlign: 'center'
    }}>
      <AlertCircle size={32} style={{ marginBottom: 'var(--space-4)' }} />
      <h3 style={{ margin: 0, color: 'var(--color-text)', marginBottom: 'var(--space-2)' }}>{title}</h3>
      <div style={{ color: 'var(--color-text-subtle)', fontSize: '0.875rem' }}>{message}</div>
    </div>
  );
}
