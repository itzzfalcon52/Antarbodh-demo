import { useEffect, useState } from 'react';
import { AntarbodhMark } from '../branding/AntarbodhMark';
import { PrimaryNavigation } from '../navigation/PrimaryNavigation';
import { api } from '../../api/endpoints';

type ApiStatus =
  | 'pending'
  | 'connected'
  | 'offline';

export function Header() {
  const [apiStatus, setApiStatus] =
    useState<ApiStatus>('pending');

  useEffect(() => {
    let active = true;

    const checkApiHealth = async () => {
      try {
        const health = await api.getHealth();

        if (!active) return;

        // API availability is determined by whether
        // the health endpoint successfully responds.
        // It is intentionally independent of model_loaded.
        setApiStatus(
          health.api_online === true
            ? 'connected'
            : 'offline',
        );
      } catch (error) {
        console.error(
          'Health check failed:',
          error,
        );

        if (active) {
          setApiStatus('offline');
        }
      }
    };

    // Initial health check.
    checkApiHealth();

    // Re-check periodically so the indicator stays
    // synchronized with the backend.
    const intervalId = window.setInterval(
      checkApiHealth,
      15000,
    );

    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, []);

  const statusLabel =
    apiStatus === 'connected'
      ? 'ONLINE'
      : apiStatus === 'offline'
        ? 'OFFLINE'
        : 'CHECKING';

  const statusColor =
    apiStatus === 'connected'
      ? 'var(--color-teal)'
      : apiStatus === 'offline'
        ? 'var(--color-danger)'
        : 'var(--color-warning)';

  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: '72px',
        padding: '0 var(--space-6)',
        backgroundColor: 'var(--color-deep)',
        borderBottom:
          '1px solid var(--color-border)',
      }}
    >
      {/* Brand + Navigation */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-6)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-3)',
          }}
        >
          <AntarbodhMark />

          <div>
            <div
              style={{
                fontWeight: 600,
                letterSpacing: '0.05em',
              }}
            >
              ANTARBODH
            </div>

            <div
              style={{
                fontSize: '0.65rem',
                color:
                  'var(--color-text-subtle)',
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
              }}
            >
              Subsurface Ocean Intelligence
            </div>
          </div>
        </div>

        <div
          style={{
            width: '1px',
            height: '24px',
            backgroundColor:
              'var(--color-border)',
          }}
        />

        <PrimaryNavigation />
      </div>

      {/* System Status */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-4)',
        }}
      >
        {/* Model information */}
        <div style={{ textAlign: 'right' }}>
          <div
            className="label-scientific"
            style={{
              fontSize: '0.65rem',
            }}
          >
            CNN v1
          </div>

          <div
            className="label-scientific"
            style={{
              color: 'var(--color-text)',
            }}
          >
            2025
          </div>
        </div>

        {/* API status */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            fontSize: '0.75rem',
            color: 'var(--color-text-subtle)',
          }}
        >
          <span>API</span>

          <div
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: statusColor,
              boxShadow:
                apiStatus === 'connected'
                  ? '0 0 6px rgba(0, 200, 180, 0.45)'
                  : 'none',
            }}
          />

          <span
            style={{
              textTransform: 'uppercase',
              fontSize: '0.65rem',
              letterSpacing: '0.05em',
            }}
          >
            {statusLabel}
          </span>
        </div>
      </div>
    </header>
  );
}