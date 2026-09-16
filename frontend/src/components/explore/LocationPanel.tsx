import type { ProfileResponse, ArgoProfileResponse } from '../../types/api';
import { TemperatureProfile } from './TemperatureProfile';
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
          color: 'var(--color-text-subtle)',
        }}
      >
        <div
          className="label-scientific"
          style={{
            marginBottom: 'var(--space-4)',
            color: 'var(--color-text)',
          }}
        >
          SELECT A LOCATION
        </div>

        <div
          style={{
            fontSize: '0.875rem',
            lineHeight: 1.5,
            maxWidth: '200px',
          }}
        >
          Click anywhere in the Bay of Bengal to inspect
          the subsurface ocean.
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
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        gap: 'var(--space-6)',
      }}
    >
      {/* -------------------------------------------------- */}
      {/* Location Details */}
      {/* -------------------------------------------------- */}

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
        }}
      >
        <div>
          <div
            className="label-scientific"
            style={{
              marginBottom: 'var(--space-1)',
            }}
          >
            LOCATION
          </div>

          <div className="data-numeric">
            {formatCoordinate(location.lat, 'lat')}
          </div>

          <div className="data-numeric">
            {formatCoordinate(location.lon, 'lon')}
          </div>
        </div>

        <div style={{ textAlign: 'right' }}>
          <div
            className="label-scientific"
            style={{
              marginBottom: 'var(--space-1)',
            }}
          >
            DATE
          </div>

          <div className="data-numeric">
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
          justifyContent: 'space-between',
          paddingBottom: 'var(--space-4)',
          borderBottom:
            '1px solid var(--color-border)',
        }}
      >
        <div>
          <div
            className="label-scientific"
            style={{
              marginBottom: 'var(--space-1)',
            }}
          >
            DEPTH
          </div>

          <div className="data-numeric">
            {depth} m
          </div>
        </div>

        <div style={{ textAlign: 'right' }}>
          <div
            className="label-scientific"
            style={{
              marginBottom: 'var(--space-1)',
            }}
          >
            ANTARBODH TEMPERATURE
          </div>

          <div
            className="data-numeric"
            style={{
              color: 'var(--color-ocean-bright)',
              fontSize: '1.25rem',
            }}
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
          minHeight: 0,
        }}
      >
        <div
          className="label-scientific"
          style={{
            marginBottom: 'var(--space-4)',
          }}
        >
          ANTARBODH TEMPERATURE PROFILE
        </div>

        <div
          style={{
            flex: 1,
            position: 'relative',
          }}
        >
          {loading ? (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--color-text-subtle)',
                fontSize: '0.875rem',
              }}
            >
              LOADING PROFILE...
            </div>
          ) : profile ? (
            <TemperatureProfile
              profile={profile}
              selectedDepth={depth}
            />
          ) : (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--color-text-subtle)',
                fontSize: '0.875rem',
              }}
            >
              PROFILE UNAVAILABLE
            </div>
          )}
        </div>
      </div>

      {/* -------------------------------------------------- */}
      {/* Surface / Input Status */}
      {/* -------------------------------------------------- */}

      <div
        style={{
          borderTop:
            '1px solid var(--color-border)',
          paddingTop: 'var(--space-4)',
        }}
      >
        <div
          className="label-scientific"
          style={{
            marginBottom: 'var(--space-2)',
          }}
        >
          RECONSTRUCTED SURFACE
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '0.75rem',
            color: 'var(--color-text-subtle)',
          }}
        >
          <span>ANTARBODH @ 0 m</span>

          <span
            style={{
              color: 'var(--color-text)',
            }}
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
            fontSize: '0.65rem',
            lineHeight: 1.4,
            color: 'var(--color-text-subtle)',
          }}
        >
          This value is the model reconstruction at
          0 m. It is not the raw SST observation.
        </div>
      </div>

      {/* -------------------------------------------------- */}
      {/* Independent Validation */}
      {/* -------------------------------------------------- */}

      <div
        style={{
          borderTop:
            '1px solid var(--color-border)',
          paddingTop: 'var(--space-4)',
        }}
      >
        <div
          className="label-scientific"
          style={{
            marginBottom: 'var(--space-2)',
          }}
        >
          INDEPENDENT OBSERVATION
        </div>

        {argoLoading ? (
          <div
            style={{
              fontSize: '0.75rem',
              color: 'var(--color-text-subtle)',
            }}
          >
            SEARCHING ARGO OBSERVATIONS...
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
                    ARGO PROFILE HAS NO VALID TEMPERATURES
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
                      gridTemplateColumns:
                        '1fr 1fr',
                      gap: 'var(--space-3)',
                    }}
                  >
                    <div>
                      <div
                        className="label-scientific"
                        style={{
                          marginBottom:
                            'var(--space-1)',
                        }}
                      >
                        ANTARBODH
                      </div>

                      <div
                        className="data-numeric"
                        style={{
                          color:
                            'var(--color-ocean-bright)',
                        }}
                      >
                        {formatTemperature(
                          temperature,
                        )}
                      </div>

                      <div
                        style={{
                          marginTop: '2px',
                          fontSize: '0.65rem',
                          color:
                            'var(--color-text-subtle)',
                        }}
                      >
                        {depth} m
                      </div>
                    </div>

                    <div
                      style={{
                        textAlign: 'right',
                      }}
                    >
                      <div
                        className="label-scientific"
                        style={{
                          marginBottom:
                            'var(--space-1)',
                        }}
                      >
                        ARGO
                      </div>

                      <div
                        className="data-numeric"
                        style={{
                          color:
                            'var(--color-text)',
                        }}
                      >
                        {formatTemperature(
                          nearest.temperature_degC,
                        )}
                      </div>

                      <div
                        style={{
                          marginTop: '2px',
                          fontSize: '0.65rem',
                          color:
                            'var(--color-text-subtle)',
                        }}
                      >
                        ~{nearest.depth_m_approx.toFixed(1)} m
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      marginTop:
                        'var(--space-3)',
                      display: 'flex',
                      justifyContent:
                        'space-between',
                      fontSize: '0.65rem',
                      color:
                        'var(--color-text-subtle)',
                    }}
                  >
                    <span>
                      {argoProfile.distance_km !==
                        undefined
                        ? `${argoProfile.distance_km.toFixed(
                          0,
                        )} km away`
                        : 'Distance unavailable'}
                    </span>

                    <span>
                      {argoProfile.date_observed ??
                        'Observation date unavailable'}
                    </span>
                  </div>

                  <div
                    style={{
                      marginTop:
                        'var(--space-2)',
                      fontSize: '0.65rem',
                      lineHeight: 1.4,
                      color:
                        'var(--color-text-subtle)',
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
            fontSize: '0.65rem',
            lineHeight: 1.4,
            color: 'var(--color-text-subtle)',
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
          borderTop:
            '1px solid var(--color-border)',
          paddingTop: 'var(--space-4)',
          fontSize: '0.75rem',
          color: 'var(--color-text-subtle)',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: '2px',
          }}
        >
          <span>SOURCE</span>

          <span
            style={{
              color: 'var(--color-text)',
            }}
          >
            ANTARBODH CNN v1
          </span>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: '2px',
          }}
        >
          <span>MODE</span>

          <span
            style={{
              color: 'var(--color-text)',
            }}
          >
            Historical / Cached
          </span>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: '2px',
          }}
        >
          <span>PERIOD</span>

          <span
            style={{
              color: 'var(--color-text)',
            }}
          >
            2025
          </span>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
          }}
        >
          <span>VALIDATION</span>

          <span
            style={{
              color: 'var(--color-text)',
            }}
          >
            ARGO / INDEPENDENT
          </span>
        </div>
      </div>
    </div>
  );
}