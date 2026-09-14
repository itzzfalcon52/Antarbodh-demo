import { Waves } from 'lucide-react';

interface HeaderProps {
  currentView: 'explore' | 'validation' | 'methodology';
  onViewChange: (view: 'explore' | 'validation' | 'methodology') => void;
  status: 'online' | 'offline' | 'loading';
}

export function Header({ currentView, onViewChange, status }: HeaderProps) {
  return (
    <header style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 24px',
      height: '56px',
      background: 'var(--bg-panel-solid)',
      borderBottom: '1px solid var(--border-subtle)',
      zIndex: 100
    }}>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <Waves size={20} color="var(--accent-primary)" />
        <div>
          <div style={{ fontSize: '14px', fontWeight: 700, letterSpacing: '1px' }}>ANTARBODH</div>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Subsurface Ocean Intelligence</div>
        </div>
      </div>

      <nav style={{ display: 'flex', gap: '4px' }}>
        {(['explore', 'validation', 'methodology'] as const).map(view => (
          <button
            key={view}
            onClick={() => onViewChange(view)}
            style={{
              background: 'transparent',
              border: 'none',
              padding: '6px 16px',
              fontSize: '13px',
              fontWeight: 500,
              color: currentView === view ? 'var(--text-primary)' : 'var(--text-secondary)',
              cursor: 'pointer',
              borderRadius: '4px',
              transition: 'background 0.2s',
              backgroundColor: currentView === view ? 'var(--bg-control)' : 'transparent'
            }}
          >
            {view.charAt(0).toUpperCase() + view.slice(1)}
          </button>
        ))}
      </nav>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '12px' }}>
        <span className="text-secondary mono">CNN v1 · 2025</span>
        <div 
          title={`Backend API: ${status}`}
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: status === 'online' ? 'var(--accent-secondary)' : 
                       status === 'offline' ? 'var(--accent-error)' : 'var(--accent-warning)',
            boxShadow: status === 'online' ? '0 0 8px var(--accent-secondary)' : 'none'
          }}
        />
      </div>

    </header>
  );
}
