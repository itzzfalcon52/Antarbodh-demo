import { useEffect, useState } from 'react';
import { Menu, X } from 'lucide-react';

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

  // Presentation-only: controls the small-screen nav sheet.
  const [menuOpen, setMenuOpen] = useState(false);

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

  // Close the sheet when the viewport grows past the
  // breakpoint so state cannot be left stranded.
  useEffect(() => {
    if (!menuOpen) return;

    const query = window.matchMedia('(min-width: 861px)');

    const handleChange = () => {
      if (query.matches) setMenuOpen(false);
    };

    query.addEventListener('change', handleChange);

    return () => {
      query.removeEventListener('change', handleChange);
    };
  }, [menuOpen]);

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
    <>
      <header className="app-header">
        {/* ---------------------------------------------- */}
        {/* Brand                                          */}
        {/* ---------------------------------------------- */}

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-6)',
            minWidth: 0,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-3)',
              minWidth: 0,
            }}
          >
            <AntarbodhMark />

            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontSize: '0.9375rem',
                  fontWeight: 600,
                  letterSpacing: '0.08em',
                  lineHeight: 1.1,
                  color: 'var(--color-text)',
                }}
              >
                ANTARBODH
              </div>

              <div
                style={{
                  marginTop: '2px',
                  fontSize: '0.5875rem',
                  fontWeight: 560,
                  color: 'var(--color-text-faint)',
                  letterSpacing: 'var(--tracking-label)',
                  textTransform: 'uppercase',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                Subsurface Ocean Intelligence
              </div>
            </div>
          </div>

          <div
            aria-hidden="true"
            className="nav-rail"
            style={{
              width: '1px',
              height: '22px',
              backgroundColor: 'var(--color-border)',
            }}
          />

          <PrimaryNavigation />
        </div>

        {/* ---------------------------------------------- */}
        {/* System status                                  */}
        {/* ---------------------------------------------- */}

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-4)',
          }}
        >
          {/* Model identity */}
          <div
            className="nav-rail"
            style={{
              flexDirection: 'column',
              alignItems: 'flex-end',
              gap: '1px',
            }}
          >
            <span
              className="label-scientific"
              style={{ fontSize: '0.5875rem' }}
            >
              Model
            </span>

            <span
              className="data-numeric"
              style={{
                fontSize: '0.6875rem',
                color: 'var(--color-text-muted)',
              }}
            >
              CNN v1 · 2025
            </span>
          </div>

          <div
            aria-hidden="true"
            className="nav-rail"
            style={{
              width: '1px',
              height: '22px',
              backgroundColor: 'var(--color-border)',
            }}
          />

          {/* API status */}
          <div
            title={`API ${statusLabel}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-2)',
              padding: '5px 10px 5px 9px',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-full)',
              backgroundColor: 'var(--surface-raised)',
            }}
          >
            <span
              aria-hidden="true"
              style={{
                position: 'relative',
                display: 'inline-flex',
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: statusColor,
                animation:
                  apiStatus === 'pending'
                    ? 'ab-pulse-soft 1.4s ease-in-out infinite'
                    : 'none',
              }}
            />

            <span
              className="label-scientific"
              style={{
                fontSize: '0.5875rem',
                color:
                  apiStatus === 'connected'
                    ? 'var(--color-text-muted)'
                    : statusColor,
              }}
            >
              API {statusLabel}
            </span>
          </div>

          {/* Mobile menu trigger */}
          <button
            type="button"
            className="icon-btn nav-toggle"
            aria-label={
              menuOpen
                ? 'Close navigation'
                : 'Open navigation'
            }
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
            style={{ width: '34px', height: '34px' }}
          >
            {menuOpen ? <X size={17} /> : <Menu size={17} />}
          </button>
        </div>
      </header>

      {/* ------------------------------------------------ */}
      {/* Mobile navigation sheet                          */}
      {/* ------------------------------------------------ */}

      {menuOpen && (
        <div
          className="nav-sheet ab-fade"
          style={{
            position: 'fixed',
            top: 'var(--shell-header)',
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 39,
            backgroundColor: 'rgba(3, 11, 18, 0.94)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            borderTop: '1px solid var(--color-border-faint)',
          }}
        >
          <PrimaryNavigation
            layout="stack"
            onNavigate={() => setMenuOpen(false)}
          />

          <div
            style={{
              padding: 'var(--space-5)',
              color: 'var(--color-text-faint)',
              fontSize: '0.6875rem',
              lineHeight: 1.6,
            }}
          >
            Satellite embedding-based reconstruction of
            subsurface ocean temperature.
          </div>
        </div>
      )}
    </>
  );
}
