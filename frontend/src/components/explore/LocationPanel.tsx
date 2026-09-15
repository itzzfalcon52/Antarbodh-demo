import type { ProfileResponse } from '../../types/api';
import { TemperatureProfile } from './TemperatureProfile';
import { formatCoordinate, formatTemperature } from '../../lib/formatting';

interface LocationPanelProps {
  location: { lat: number; lon: number } | null;
  date: string;
  depth: number;
  temperature: number | null;
  profile: ProfileResponse | null;
  loading: boolean;
}

export function LocationPanel({ location, date, depth, temperature, profile, loading }: LocationPanelProps) {
  if (!location) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'center', alignItems: 'center', textAlign: 'center', color: 'var(--color-text-subtle)' }}>
        <div className="label-scientific" style={{ marginBottom: 'var(--space-4)', color: 'var(--color-text)' }}>SELECT A LOCATION</div>
        <div style={{ fontSize: '0.875rem', lineHeight: 1.5, maxWidth: '200px' }}>
          Click anywhere in the Bay of Bengal to inspect the subsurface ocean.
        </div>
      </div>
    );
  }

  const formattedDate = new Date(`${date}T00:00:00Z`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }).toUpperCase();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 'var(--space-6)' }}>
      {/* Location Details */}
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <div>
          <div className="label-scientific" style={{ marginBottom: 'var(--space-1)' }}>LOCATION</div>
          <div className="data-numeric">{formatCoordinate(location.lat, 'lat')}</div>
          <div className="data-numeric">{formatCoordinate(location.lon, 'lon')}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="label-scientific" style={{ marginBottom: 'var(--space-1)' }}>DATE</div>
          <div className="data-numeric">{formattedDate}</div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 'var(--space-4)', borderBottom: '1px solid var(--color-border)' }}>
        <div>
          <div className="label-scientific" style={{ marginBottom: 'var(--space-1)' }}>DEPTH</div>
          <div className="data-numeric">{depth} m</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="label-scientific" style={{ marginBottom: 'var(--space-1)' }}>TEMPERATURE</div>
          <div className="data-numeric" style={{ color: 'var(--color-ocean-bright)', fontSize: '1.25rem' }}>
            {formatTemperature(temperature)}
          </div>
        </div>
      </div>

      {/* Profile */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <div className="label-scientific" style={{ marginBottom: 'var(--space-4)' }}>PROFILE</div>
        <div style={{ flex: 1, position: 'relative' }}>
          {loading ? (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-subtle)', fontSize: '0.875rem' }}>
              LOADING PROFILE...
            </div>
          ) : profile ? (
            <TemperatureProfile profile={profile} selectedDepth={depth} />
          ) : (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-subtle)', fontSize: '0.875rem' }}>
              PROFILE UNAVAILABLE
            </div>
          )}
        </div>
      </div>

      {/* Surface Conditions Note */}
      <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-4)' }}>
        <div className="label-scientific" style={{ marginBottom: 'var(--space-2)' }}>SURFACE CONDITIONS</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--color-text-subtle)' }}>
          <span>SST</span>
          <span>{profile?.temperature_degC[0] ? formatTemperature(profile.temperature_degC[0]) : 'Unavailable'}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--color-text-subtle)' }}>
          <span>SSS</span>
          <span>Unavailable</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--color-text-subtle)' }}>
          <span>SSH</span>
          <span>Unavailable</span>
        </div>
      </div>

      {/* Provenance */}
      <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-4)', fontSize: '0.75rem', color: 'var(--color-text-subtle)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
          <span>SOURCE</span>
          <span style={{ color: 'var(--color-text)' }}>ANTARBODH CNN v1</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
          <span>MODE</span>
          <span style={{ color: 'var(--color-text)' }}>Historical / Cached</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>PERIOD</span>
          <span style={{ color: 'var(--color-text)' }}>2025</span>
        </div>
      </div>
    </div>
  );
}
