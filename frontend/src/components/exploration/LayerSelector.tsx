import { Layers } from 'lucide-react';

interface LayerSelectorProps {
  depths: number[];
  selectedDepth: number;
  onDepthChange: (depth: number) => void;
  variableNames: string[];
}

export function LayerSelector({ depths, selectedDepth, onDepthChange, variableNames }: LayerSelectorProps) {
  return (
    <div className="panel" style={{ 
      position: 'absolute', top: '80px', left: '24px', 
      padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px', width: '260px' 
    }}>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
        <Layers size={18} className="text-secondary" />
        <h3 style={{ fontSize: '14px', fontWeight: 600 }}>Data Context</h3>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <label style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Variable
        </label>
        <select className="select" disabled>
          <option>{variableNames[0] || 'Temperature (°C)'}</option>
        </select>
        <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
          Other variables currently unmapped
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <label style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Depth Layer
        </label>
        <select 
          className="select" 
          value={selectedDepth}
          onChange={(e) => onDepthChange(Number(e.target.value))}
        >
          {depths.map((d) => (
            <option key={d} value={d}>
              {d === 0 ? 'Surface (0m)' : `${d}m`}
            </option>
          ))}
        </select>
      </div>

    </div>
  );
}
