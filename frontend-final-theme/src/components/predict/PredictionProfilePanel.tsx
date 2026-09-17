import type { ProfileResponse } from '../../types/api';
import { TemperatureProfile } from '../explore/TemperatureProfile';
import { SectionHeading } from '../ui/SectionHeading';
import { formatTemperature } from '../../lib/formatting';

export function PredictionProfilePanel({ profile }: { profile: ProfileResponse }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: 0,
      }}
    >
      <SectionHeading
        index="02"
        title="Vertical profile"
        trailing={
          <span
            className="label-scientific"
            style={{ fontSize: '0.5625rem', color: 'var(--color-text-faint)' }}
          >
            0 – 1000 m
          </span>
        }
        rule
        style={{ marginBottom: 'var(--space-5)' }}
      />

      <div
        className="predict-profile-split"
        style={{ flex: 1, minHeight: 0 }}
      >
        {/* SVG Profile - reuse explore component */}
        <div
          style={{
            flex: '1.6 1 0',
            position: 'relative',
            minWidth: 0,
            minHeight: '280px',
            padding: 'var(--space-2) 0',
          }}
        >
          <TemperatureProfile profile={profile} selectedDepth={-1} />
        </div>

        {/* Tabular Readout */}
        <div
          style={{
            flex: '1 1 0',
            minWidth: '180px',
            overflowY: 'auto',
            borderLeft: '1px solid var(--color-border-faint)',
            paddingLeft: 'var(--space-5)',
          }}
        >
          <div
            style={{
              position: 'sticky',
              top: 0,
              zIndex: 1,
              display: 'flex',
              justifyContent: 'space-between',
              paddingBottom: 'var(--space-2)',
              borderBottom: '1px solid var(--color-border)',
              marginBottom: 'var(--space-2)',
              backgroundColor: 'var(--color-panel)',
            }}
          >
            <span className="label-scientific">Depth</span>
            <span className="label-scientific">Temp (°C)</span>
          </div>

          {profile.depths_m.map((d, i) => (
            <div
              key={d}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                padding: '5px 0',
                borderBottom: '1px solid var(--color-border-faint)',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.78rem',
                fontVariantNumeric: 'tabular-nums',
                color: 'var(--color-text-muted)',
              }}
            >
              <span>
                {d}
                <span style={{ color: 'var(--color-text-faint)', marginLeft: '2px' }}>
                  m
                </span>
              </span>

              <span style={{ color: 'var(--color-ocean-bright)' }}>
                {formatTemperature(profile.temperature_degC[i])}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Provenance */}
      <div
        style={{
          borderTop: '1px solid var(--color-border-faint)',
          paddingTop: 'var(--space-4)',
          marginTop: 'var(--space-4)',
          fontSize: '0.6875rem',
          color: 'var(--color-text-subtle)',
        }}
      >
        {[
          ['Model', 'ANTARBODH CNN v1'],
          [
            'Mode',
            profile.mode === 'historical'
              ? 'Historical / Cached'
              : 'On-demand model reconstruction',
          ],
          ['Output', '15 depth levels · 0–1000 m'],
        ].map(([label, value]) => (
          <div
            key={label}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              gap: 'var(--space-3)',
              padding: '3px 0',
            }}
          >
            <span
              className="label-scientific"
              style={{ fontSize: '0.5625rem' }}
            >
              {label}
            </span>

            <span
              className="data-numeric"
              style={{
                color: 'var(--color-text-muted)',
                fontSize: '0.6875rem',
                textAlign: 'right',
              }}
            >
              {value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
