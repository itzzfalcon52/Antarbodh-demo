import type { ProfileResponse } from '../../types/api';
import { TemperatureProfile } from '../explore/TemperatureProfile';
import { formatTemperature } from '../../lib/formatting';

export function PredictionProfilePanel({ profile }: { profile: ProfileResponse }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="label-scientific" style={{ marginBottom: 'var(--space-4)' }}>VERTICAL PROFILE</div>
      
      <div style={{ display: 'flex', gap: 'var(--space-6)', flex: 1, minHeight: 0 }}>
        {/* SVG Profile - reuse explore component */}
        <div style={{ flex: 1.5, position: 'relative' }}>
          <TemperatureProfile profile={profile} selectedDepth={-1} />
        </div>

        {/* Tabular Readout */}
        <div style={{ flex: 1, overflowY: 'auto', borderLeft: '1px solid var(--color-border)', paddingLeft: 'var(--space-4)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 'var(--space-2)', borderBottom: '1px solid var(--color-border)', marginBottom: 'var(--space-2)' }}>
            <span className="label-scientific">Depth</span>
            <span className="label-scientific">Temp (°C)</span>
          </div>
          
          {profile.depths_m.map((d, i) => (
            <div key={d} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontFamily: 'var(--font-mono)', fontSize: '0.875rem', color: 'var(--color-text)' }}>
              <span>{d} m</span>
              <span style={{ color: 'var(--color-ocean-bright)' }}>{formatTemperature(profile.temperature_degC[i])}</span>
            </div>
          ))}
        </div>
      </div>
      
      {/* Provenance */}
      <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-4)', marginTop: 'var(--space-4)', fontSize: '0.75rem', color: 'var(--color-text-subtle)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
          <span>MODEL</span>
          <span style={{ color: 'var(--color-text)' }}>ANTARBODH CNN v1</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
          <span>MODE</span>
          <span style={{ color: 'var(--color-text)' }}>
            {profile.mode === 'historical' ? 'Historical / Cached' : 'On-demand model reconstruction'}
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>OUTPUT</span>
          <span style={{ color: 'var(--color-text)' }}>15 depth levels · 0–1000 m</span>
        </div>
      </div>
    </div>
  );
}
