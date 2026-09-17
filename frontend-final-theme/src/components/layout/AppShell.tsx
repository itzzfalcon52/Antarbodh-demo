import { Outlet, useLocation } from 'react-router-dom';
import { Header } from './Header';

export function AppShell() {
  // Used only as a remount key so each view gets a clean
  // entrance transition. Routing behaviour is unchanged.
  const { pathname } = useLocation();

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        background: 'var(--color-ink)',
      }}
    >
      {/* Ambient depth field. Decorative only. */}
      <div
        aria-hidden="true"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 0,
          pointerEvents: 'none',
          background:
            'var(--gradient-ambient)',
        }}
      />

      <Header />

      <main
        key={pathname}
        className="ab-fade"
        style={{
          position: 'relative',
          zIndex: 1,
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
        }}
      >
        <Outlet />
      </main>
    </div>
  );
}
