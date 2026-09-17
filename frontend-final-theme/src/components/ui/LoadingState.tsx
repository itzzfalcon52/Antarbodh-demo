interface LoadingStateProps {
  message?: string;

  /** Optional secondary line for longer-running work. */
  detail?: string;
}

export function LoadingState({
  message = 'Loading...',
  detail,
}: LoadingStateProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 'var(--space-4)',
        padding: 'var(--space-8)',
        color: 'var(--color-text-subtle)',
        textAlign: 'center',
      }}
    >
      <div
        className="spinner"
        aria-hidden="true"
        style={{
          width: '26px',
          height: '26px',
          borderWidth: '1.5px',
        }}
      />

      <div>
        <div
          className="label-scientific label-scientific--bright"
          style={{ letterSpacing: 'var(--tracking-label)' }}
        >
          {message}
        </div>

        {detail && (
          <div
            style={{
              marginTop: 'var(--space-2)',
              fontSize: '0.8rem',
              lineHeight: 1.6,
              maxWidth: '38ch',
            }}
          >
            {detail}
          </div>
        )}
      </div>
    </div>
  );
}
