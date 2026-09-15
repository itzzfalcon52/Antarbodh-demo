import { NavLink } from 'react-router-dom';

export function PrimaryNavigation() {
  const linkStyle = (isActive: boolean): React.CSSProperties => ({
    padding: 'var(--space-2) var(--space-4)',
    color: isActive ? 'var(--color-text)' : 'var(--color-text-subtle)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    fontSize: '0.875rem',
    fontWeight: 600,
    borderBottom: isActive ? '2px solid var(--color-ocean)' : '2px solid transparent',
    transition: 'var(--transition-fast)'
  });

  return (
    <nav style={{ display: 'flex', gap: 'var(--space-2)' }}>
      <NavLink to="/explore" style={({ isActive }) => linkStyle(isActive)}>
        Explore
      </NavLink>
      <NavLink to="/predict" style={({ isActive }) => linkStyle(isActive)}>
        Predict
      </NavLink>
      <NavLink to="/validate" style={({ isActive }) => linkStyle(isActive)}>
        Validate
      </NavLink>
      <NavLink to="/methodology" style={({ isActive }) => linkStyle(isActive)}>
        Methodology
      </NavLink>
    </nav>
  );
}
