import { Crosshair } from 'lucide-react';

import type { ProfileResponse, ArgoProfileResponse } from '../../types/api';
import { TemperatureProfile } from './TemperatureProfile';
import { SectionHeading } from '../ui/SectionHeading';
import {
  formatCoordinate,
  formatTemperature,
} from '../../lib/formatting';

interface LocationPanelProps {
  location: { lat: number; lon: number } | null;
  date: string;
  depth: number;
  temperature: number | null;
  profile: ProfileResponse | null;
  argoProfile: ArgoProfileResponse | null;
  argoLoading: boolean;
  loading: boolean;
}

/** Small key/value line used throughout the panel. */
function MetaRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        gap: 'var(--space-3)',
        padding: '4px 0',
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
          fontSize: '0.6875rem',
          color: 'var(--color-text-muted)',
          textAlign: 'right',
        }}
      >
        {value}
      </span>
    </div>
  );
}

export function LocationPanel({
  location,
  date,
  depth,
  temperature,
  profile,
  argoProfile,
  argoLoading,
  loading,
}: LocationPanelProps) {
  if (!location) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          justifyContent: 'center',
          alignItems: 'center',
          textAlign: 'center',
          gap: 'var(--space-4)',
          padding: 'var(--space-6) var(--space-4)',
          color: 'var(--color-text-subtle)',
        }}
      >
        <div
          aria-hidden="true"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '44px',
            height: '44px',
            borderRadius: '50%',
            border: '1px solid var(--color-border)',
            backgroundColor: 'var(--surface-raised)',
            color: 'var(--color-ocean)',
          }}
        >
          <Crosshair size={18} />
        </div>

        <div>
          <div
            className="label-scientific label-scientific--bright"
            style={{ marginBottom: 'var(--space-2)' }}
          >
            Select a location
          </div>

          <div
            style={{
              fontSize: '0.8rem',
              lineHeight: 1.65,
              maxWidth: '26ch',
              margin: '0 auto',
            }}
          >
            Click anywhere in the Bay of Bengal to inspect
            the subsurface ocean.
          </div>
        </div>
      </div>
    );
  }

  const formattedDate = new Date(
    `${date}T00:00:00Z`,
  )
    .toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC',
    })
    .toUpperCase();

  /*
   * The first profile value corresponds to the model's
   * shallowest target depth (normally 0 m).
   *
   * IMPORTANT:
   * This is NOT the raw SST observation.
   * It is ANTARBODH's reconstructed temperature at 0 m.
   */
  const reconstructedSurfaceTemperature =
    profile?.temperature_degC?.[0] ?? null;

  return (
    <div
      className="location-panel"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: 0,
        overflowY: 'auto',
        gap: 'var(--space-5)',
        paddingRight: '2px',
      }}
    >
      {/* -------------------------------------------------- */}
      {/* Location Details */}
      {/* -------------------------------------------------- */}

      <div>
        <SectionHeading
          index="01"
          title="Inspection point"
          style={{ marginBottom: 'var(--space-3)' }}
        />

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: 'var(--space-3)',
          }}
        >
          <div className="data-numeric" style={{ fontSize: '0.8125rem', lineHeight: 1.6 }}>
            <div>{formatCoordinate(location.lat, 'lat')}</div>
            <div>{formatCoordinate(location.lon, 'lon')}</div>
          </div>

          <div
            className="data-numeric"
            style={{
              textAlign: 'right',
              fontSize: '0.6875rem',
              color: 'var(--color-text-subtle)',
              lineHeight: 1.6,
            }}
          >
            {formattedDate}
          </div>
        </div>
      </div>

      {/* -------------------------------------------------- */}
      {/* Selected Temperature */}
      {/* -------------------------------------------------- */}

      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          gap: 'var(--space-4)',
          padding: 'var(--space-4)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--color-border-faint)',
          backgroundColor: 'var(--location-surface-inset)',
        }}
      >
        <div>
          <div
            className="label-scientific"
            style={{ marginBottom: '5px', fontSize: '0.5625rem' }}
          >
            Depth
          </div>

          <div
            className="data-numeric"
            style={{ fontSize: '0.95rem' }}
          >
            {depth}
            <span
              style={{
                marginLeft: '3px',
                fontSize: '0.7rem',
                color: 'var(--color-text-subtle)',
              }}
            >
              m
            </span>
          </div>
        </div>

        <div style={{ textAlign: 'right', minWidth: 0 }}>
          <div
            className="label-scientific"
            style={{ marginBottom: '5px', fontSize: '0.5625rem' }}
          >
            Antarbodh temperature
          </div>

          <div
            className="data-readout data-readout--accent"
            style={{ fontSize: '1.65rem' }}
          >
            {formatTemperature(temperature)}
          </div>
        </div>
      </div>

      {/* -------------------------------------------------- */}
      {/* Temperature Profile */}
      {/* -------------------------------------------------- */}

      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minHeight: '260px',
        }}
      >
        <SectionHeading
          index="02"
          title="Vertical profile"
          style={{ marginBottom: 'var(--space-3)' }}
        />

        <div
          style={{
            flex: 1,
            position: 'relative',
            minHeight: '220px',
          }}
        >
          {loading ? (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 'var(--space-3)',
                color: 'var(--color-text-subtle)',
              }}
            >
              <div
                className="spinner"
                aria-hidden="true"
                style={{ width: '20px', height: '20px', borderWidth: '1.5px' }}
              />

              <span
                className="label-scientific"
                style={{ fontSize: '0.5625rem' }}
              >
                Loading profile
              </span>
            </div>
          ) : profile ? (
            <TemperatureProfile
              profile={profile}
              selectedDepth={depth}
              theme="warm"
            />
          ) : (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--color-text-faint)',
                fontSize: '0.78rem',
              }}
            >
              Profile unavailable
            </div>
          )}
        </div>
      </div>

      {/* -------------------------------------------------- */}
      {/* Surface / Input Status */}
      {/* -------------------------------------------------- */}

      <div>
        <SectionHeading
          index="03"
          title="Reconstructed surface"
          style={{ marginBottom: 'var(--space-3)' }}
        />

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            gap: 'var(--space-3)',
            fontSize: '0.75rem',
            color: 'var(--color-text-subtle)',
          }}
        >
          <span>ANTARBODH @ 0 m</span>

          <span
            className="data-numeric"
            style={{ color: 'var(--color-text)', fontSize: '0.8125rem' }}
          >
            {reconstructedSurfaceTemperature !== null
              ? formatTemperature(
                reconstructedSurfaceTemperature,
              )
              : 'Unavailable'}
          </span>
        </div>

        <div
          style={{
            marginTop: 'var(--space-2)',
            fontSize: '0.6875rem',
            lineHeight: 1.55,
            color: 'var(--color-text-faint)',
          }}
        >
          This value is the model reconstruction at
          0 m. It is not the raw SST observation.
        </div>
      </div>

      {/* -------------------------------------------------- */}
      {/* Independent Validation */}
      {/* -------------------------------------------------- */}

      <div>
        <SectionHeading
          index="04"
          title="Independent observation"
          trailing={
            <span
              className="label-scientific"
              style={{ fontSize: '0.5625rem', color: 'var(--color-text-faint)' }}
            >
              ARGO
            </span>
          }
          style={{ marginBottom: 'var(--space-3)' }}
        />

        {argoLoading ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-2)',
              fontSize: '0.75rem',
              color: 'var(--color-text-subtle)',
            }}
          >
            <span
              className="spinner"
              aria-hidden="true"
              style={{
                display: 'inline-block',
                width: '11px',
                height: '11px',
                borderWidth: '1.5px',
              }}
            />
            Searching ARGO observations
          </div>
        ) : argoProfile?.available ? (
          <>
            {/* ------------------------------------------------ */}
            {/* Selected-depth comparison */}
            {/* ------------------------------------------------ */}

            {(() => {
              const observations =
                argoProfile.observations ?? [];

              if (observations.length === 0) {
                return (
                  <div
                    style={{
                      fontSize: '0.75rem',
                      color: 'var(--color-text-subtle)',
                    }}
                  >
                    ARGO profile has no valid temperatures
                  </div>
                );
              }

              const nearest = observations.reduce(
                (best, observation) => {
                  const bestDifference = Math.abs(
                    best.depth_m_approx - depth,
                  );

                  const currentDifference = Math.abs(
                    observation.depth_m_approx - depth,
                  );

                  return currentDifference < bestDifference
                    ? observation
                    : best;
                },
              );

              return (
                <>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: 'var(--space-3)',
                      padding: 'var(--space-3) 0',
                      borderTop: '1px solid var(--color-border-faint)',
                      borderBottom: '1px solid var(--color-border-faint)',
                    }}
                  >
                    <div>
                      <div
                        className="label-scientific"
                        style={{
                          marginBottom: '5px',
                          fontSize: '0.5625rem',
                        }}
                      >
                        Antarbodh
                      </div>

                      <div
                        className="data-numeric"
                        style={{
                          color: 'var(--color-ocean-bright)',
                          fontSize: '0.95rem',
                        }}
                      >
                        {formatTemperature(
                          temperature,
                        )}
                      </div>

                      <div
                        style={{
                          marginTop: '3px',
                          fontSize: '0.625rem',
                          color: 'var(--color-text-faint)',
                        }}
                      >
                        {depth} m
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div
                        className="label-scientific"
                        style={{
                          marginBottom: '5px',
                          fontSize: '0.5625rem',
                        }}
                      >
                        ARGO
                      </div>

                      <div
                        className="data-numeric"
                        style={{
                          color: 'var(--color-text)',
                          fontSize: '0.95rem',
                        }}
                      >
                        {formatTemperature(
                          nearest.temperature_degC,
                        )}
                      </div>

                      <div
                        style={{
                          marginTop: '3px',
                          fontSize: '0.625rem',
                          color: 'var(--color-text-faint)',
                        }}
                      >
                        ~{nearest.depth_m_approx.toFixed(1)} m
                      </div>
                    </div>
                  </div>

                  <div style={{ marginTop: 'var(--space-2)' }}>
                    <MetaRow
                      label="Separation"
                      value={
                        argoProfile.distance_km !== undefined
                          ? `${argoProfile.distance_km.toFixed(0)} km`
                          : 'Unavailable'
                      }
                    />

                    <MetaRow
                      label="Observed"
                      value={
                        argoProfile.date_observed ??
                        'Unavailable'
                      }
                    />
                  </div>

                  <div
                    style={{
                      marginTop: 'var(--space-2)',
                      fontSize: '0.6875rem',
                      lineHeight: 1.55,
                      color: 'var(--color-text-faint)',
                    }}
                  >
                    ARGO uses QC-1 temperature,
                    prioritizing adjusted observations.
                    ANTARBODH is independently compared
                    against the observation.
                  </div>
                </>
              );
            })()}
          </>
        ) : (
          <div
            style={{
              fontSize: '0.75rem',
              lineHeight: 1.55,
              color: 'var(--color-text-subtle)',
            }}
          >
            {argoProfile?.reason ??
              'No nearby ARGO observation'}
          </div>
        )}

        <div
          style={{
            marginTop: 'var(--space-2)',
            fontSize: '0.6875rem',
            lineHeight: 1.55,
            color: 'var(--color-text-faint)',
          }}
        >
          ARGO observations are used for independent
          validation, not as model input.
        </div>
      </div>

      {/* -------------------------------------------------- */}
      {/* Provenance */}
      {/* -------------------------------------------------- */}

      <div
        style={{
          marginTop: 'auto',
          paddingTop: 'var(--space-4)',
          borderTop: '1px solid var(--color-border-faint)',
        }}
      >
        <MetaRow label="Source" value="ANTARBODH CNN v1" />
        <MetaRow label="Mode" value="Historical / Cached" />
        <MetaRow label="Period" value="2025" />
        <MetaRow label="Validation" value="ARGO / Independent" />
      </div>
    </div>
  );
}
