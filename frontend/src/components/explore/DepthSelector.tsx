import { UPPER_OCEAN, THERMOCLINE, DEEP_OCEAN } from '../../lib/constants';

interface DepthSelectorProps {
  selectedDepth: number;
  onDepthChange: (depth: number) => void;
}

export function DepthSelector({ selectedDepth, onDepthChange }: DepthSelectorProps) {
  const renderGroup = (title: string, depths: number[]) => (
    <div style={{ marginBottom: 'var(--space-4)' }}>
      <div className="label-scientific" style={{ marginBottom: 'var(--space-2)' }}>{title}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {depths.map(d => (
          <button
            key={d}
            onClick={() => onDepthChange(d)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-2)',
              background: 'none',
              border: 'none',
              color: selectedDepth === d ? 'var(--color-text)' : 'var(--color-text-subtle)',
              cursor: 'pointer',
              padding: '2px 0',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.875rem',
              textAlign: 'left'
            }}
          >
            <div style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              border: selectedDepth === d ? '3px solid var(--color-ocean)' : '1px solid var(--color-border)',
              backgroundColor: 'transparent',
              flexShrink: 0
            }} />
            {d}m
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div>
      {renderGroup('UPPER OCEAN', UPPER_OCEAN)}
      {renderGroup('THERMOCLINE', THERMOCLINE)}
      {renderGroup('DEEP OCEAN', DEEP_OCEAN)}
    </div>
  );
}
