import { AlertTriangle } from 'lucide-react';

interface ErrorStateProps {
  title?: string;
  message: string;
}

export function ErrorState({ title = 'Error', message }: ErrorStateProps) {
  return (
    <div
      role="alert"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 'var(--space-4)',
        padding: 'var(--space-8)',
        textAlign: 'center',
      }}
    >
      <div
        aria-hidden="true"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '44px',
          height: '44px',
          borderRadius: '50%',
          color: 'var(--color-danger)',
          backgroundColor: 'var(--wash-danger)',
          border: '1px solid rgba(255, 107, 107, 0.32)',
        }}
      >
        <AlertTriangle size={19} />
      </div>

      <div>
        <h3
          style={{
            margin: 0,
            marginBottom: 'var(--space-2)',
            color: 'var(--color-text)',
            fontSize: '1rem',
          }}
        >
          {title}
        </h3>

        <div
          style={{
            maxWidth: '44ch',
            color: 'var(--color-text-subtle)',
            fontSize: '0.85rem',
            lineHeight: 1.65,
          }}
        >
          {message}
        </div>
      </div>
    </div>
  );
}
