import type { ArgoObservationResponse } from '../../types/api';
import {
  formatCoordinate,
  formatTemperature,
} from '../../lib/formatting';

interface MapHoverReadoutProps {
  lat: number;
  lon: number;
  temp: number | null;
  depth: number;
  argo: ArgoObservationResponse | null;
  argoLoading: boolean;
}

/**
 * Floating inspection readout shown while the pointer is over
 * the map. Presentation only — every value is passed in.
 */
export function MapHoverReadout({
  lat,
  lon,
  temp,
  depth,
  argo,
  argoLoading,
}: MapHoverReadoutProps) {
  return (
    <div
      className="map-overlay ab-fade"
      style={{
        top: 'var(--space-5)',
        right: 'var(--space-5)',
        width: '204px',
        padding: 'var(--space-3) var(--space-4)',
        pointerEvents: 'none',
      }}
    >
      {/* Coordinates */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          gap: 'var(--space-2)',
        }}
      >
        <span
          className="data-numeric"
          style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}
        >
          {formatCoordinate(lat, 'lat')}
        </span>

        <span
          className="data-numeric"
          style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}
        >
          {formatCoordinate(lon, 'lon')}
        </span>
      </div>

      <div
        aria-hidden="true"
        style={{
          height: '1px',
          backgroundColor: 'var(--color-border-faint)',
          margin: 'var(--space-3) 0',
        }}
      />

      {/* Depth */}
      <div
        className="label-scientific"
        style={{ fontSize: '0.5625rem', marginBottom: 'var(--space-2)' }}
      >
        {depth} m depth
      </div>

      {/* ANTARBODH */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          gap: 'var(--space-2)',
        }}
      >
        <span
          className="label-scientific"
          style={{ fontSize: '0.5625rem' }}
        >
          Antarbodh
        </span>

        <span
          className="data-numeric"
          style={{
            color: 'var(--color-ocean-bright)',
            fontSize: '0.95rem',
          }}
        >
          {formatTemperature(temp)}
        </span>
      </div>

      {/* ARGO */}
      <div
        style={{
          marginTop: 'var(--space-3)',
          paddingTop: 'var(--space-3)',
          borderTop: '1px solid var(--color-border-faint)',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            gap: 'var(--space-2)',
          }}
        >
          <span
            className="label-scientific"
            style={{ fontSize: '0.5625rem' }}
          >
            ARGO
          </span>

          {argoLoading ? (
            <span
              className="label-scientific"
              style={{
                fontSize: '0.5625rem',
                color: 'var(--color-text-faint)',
                animation: 'ab-pulse-soft 1.4s ease-in-out infinite',
              }}
            >
              Searching
            </span>
          ) : argo?.available &&
            argo.temperature_degC !== undefined ? (
            <span
              className="data-numeric"
              style={{ fontSize: '0.95rem' }}
            >
              {formatTemperature(argo.temperature_degC)}
            </span>
          ) : (
            <span
              className="label-scientific"
              style={{
                fontSize: '0.5625rem',
                color: 'var(--color-text-faint)',
              }}
            >
              No match
            </span>
          )}
        </div>

        {argo?.available && (
          <div
            style={{
              marginTop: 'var(--space-2)',
              display: 'grid',
              gap: '2px',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.5875rem',
              lineHeight: 1.5,
              color: 'var(--color-text-faint)',
            }}
          >
            <div>~{argo.depth_m_approx?.toFixed(1)} m</div>
            <div>{argo.distance_km?.toFixed(0)} km away</div>
            <div>{argo.date_observed}</div>
            <div>
              {argo.temperature_source === 'adjusted'
                ? 'ADJUSTED'
                : 'RAW'}{' '}
              · QC {argo.qc ?? 1}
            </div>
          </div>
        )}

        {!argoLoading && !argo?.available && (
          <div
            style={{
              marginTop: 'var(--space-2)',
              fontSize: '0.5875rem',
              lineHeight: 1.5,
              color: 'var(--color-text-faint)',
            }}
          >
            No suitable independent ARGO observation within
            the prototype matching window.
          </div>
        )}
      </div>
    </div>
  );
}
