import { NavLink } from 'react-router-dom';

const ROUTES = [
  { to: '/explore', label: 'Explore' },
  { to: '/predict', label: 'Predict' },
  { to: '/validate', label: 'Validate' },
  { to: '/methodology', label: 'Methodology' },
] as const;

interface PrimaryNavigationProps {
  /** 'rail' is the desktop horizontal bar, 'stack' the mobile sheet. */
  layout?: 'rail' | 'stack';

  /** Invoked after a link is chosen so a mobile sheet can close. */
  onNavigate?: () => void;
}

export function PrimaryNavigation({
  layout = 'rail',
  onNavigate,
}: PrimaryNavigationProps) {
  if (layout === 'stack') {
    return (
      <nav
        aria-label="Primary"
        style={{ display: 'flex', flexDirection: 'column' }}
      >
        {ROUTES.map(({ to, label }, i) => (
          <NavLink
            key={to}
            to={to}
            onClick={onNavigate}
            className="ab-rise"
            style={({ isActive }) => ({
              ['--stagger' as string]: i,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: 'var(--space-4) var(--space-5)',
              borderBottom: '1px solid var(--color-border-faint)',
              color: isActive
                ? 'var(--color-text)'
                : 'var(--color-text-subtle)',
              fontSize: '1rem',
              fontWeight: isActive ? 560 : 440,
              letterSpacing: 'var(--tracking-tight)',
              transition: 'color var(--transition-fast)',
            })}
          >
            {({ isActive }) => (
              <>
                <span>{label}</span>

                <span
                  aria-hidden="true"
                  style={{
                    width: '18px',
                    height: '1px',
                    backgroundColor: isActive
                      ? 'var(--color-ocean-bright)'
                      : 'transparent',
                  }}
                />
              </>
            )}
          </NavLink>
        ))}
      </nav>
    );
  }

  return (
    <nav aria-label="Primary" className="nav-rail">
      {ROUTES.map(({ to, label }) => (
        <NavLink key={to} to={to} onClick={onNavigate}>
          {({ isActive }) => (
            <span className="nav-link" data-active={isActive}>
              {label}
            </span>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
