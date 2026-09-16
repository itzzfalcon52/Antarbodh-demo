import {
  useEffect,
  useRef,
  useState,
} from 'react';

import { Panel } from '../components/ui/Panel';
import { OceanMap } from '../components/map/OceanMap';
import { DepthSelector } from '../components/explore/DepthSelector';
import { DateTimeline } from '../components/explore/DateTimeline';
import { TemperatureLegend } from '../components/explore/TemperatureLegend';
import { LocationPanel } from '../components/explore/LocationPanel';

import { api } from '../api/endpoints';

import type {
  TemperatureFieldResponse,
  ProfileResponse,
  HistoricalTemperatureSeriesResponse,
  ArgoProfileResponse,
  ArgoObservationResponse,
} from '../types/api';

import {
  formatCoordinate,
  formatTemperature,
} from '../lib/formatting';


const START_DATE = '2025-01-01';


function dateToIndex(
  date: string,
): number {
  const start = new Date(
    `${START_DATE}T00:00:00Z`,
  );

  const current = new Date(
    `${date}T00:00:00Z`,
  );

  return Math.round(
    (
      current.getTime() -
      start.getTime()
    ) /
    (1000 * 60 * 60 * 24),
  );
}


function decodeHistoricalFrame(
  series: HistoricalTemperatureSeriesResponse,
  index: number,
): TemperatureFieldResponse {
  const safeIndex = Math.max(
    0,
    Math.min(
      series.temperature_encoded.length - 1,
      index,
    ),
  );

  const encoded =
    series.temperature_encoded[
    safeIndex
    ];

  const valid =
    series.valid_mask[
    safeIndex
    ];

  const temperature =
    encoded.map(
      (row, latIndex) =>
        row.map(
          (value, lonIndex) => {
            if (
              !valid[latIndex][lonIndex]
            ) {
              return null;
            }

            return (
              value *
              series.scale_factor +
              series.add_offset
            );
          },
        ),
    );

  return {
    mode: 'historical',
    date: series.dates[safeIndex],
    depth_m: series.depth_m,
    units: series.units,
    latitude: series.latitude,
    longitude: series.longitude,
    temperature,
    model_id: series.model_id,
    cached: true,
    provenance:
      `${series.provenance.dataset} • ` +
      `${series.provenance.temporal_resolution} • ` +
      `${series.provenance.spatial_resolution} • ` +
      `${series.provenance.domain}`,
  };
}


export function ExplorePage() {
  const [
    selectedDate,
    setSelectedDate,
  ] = useState(
    '2025-01-01',
  );

  const [
    selectedDepth,
    setSelectedDepth,
  ] = useState(0);

  const [
    selectedLocation,
    setSelectedLocation,
  ] = useState<{
    lat: number;
    lon: number;
  } | null>(null);

  const [
    hoverData,
    setHoverData,
  ] = useState<{
    lat: number | null;
    lon: number | null;
    temp: number | null;
  }>({
    lat: null,
    lon: null,
    temp: null,
  });

  const [
    temperatureField,
    setTemperatureField,
  ] = useState<
    TemperatureFieldResponse | null
  >(null);

  const [
    fieldLoading,
    setFieldLoading,
  ] = useState(false);

  const [
    fieldError,
    setFieldError,
  ] = useState<string | null>(null);

  const [
    profile,
    setProfile,
  ] = useState<
    ProfileResponse | null
  >(null);

  const [
    profileLoading,
    setProfileLoading,
  ] = useState(false);

  const [argoProfile, setArgoProfile] =
    useState<ArgoProfileResponse | null>(null);

  const [argoLoading, setArgoLoading] =
    useState(false);

  const [hoverArgo, setHoverArgo] =
    useState<ArgoObservationResponse | null>(null);

  const [hoverArgoLoading, setHoverArgoLoading] =
    useState(false);




  // Annual historical series cache.
  //
  // One entry per depth.
  const historicalSeriesCache =
    useRef<
      Record<
        string,
        HistoricalTemperatureSeriesResponse
      >
    >({});


  const profileCache =
    useRef<
      Record<
        string,
        ProfileResponse
      >
    >({});


  /*
   * Load the complete 2025 historical
   * series for the selected depth.
   *
   * This happens once per depth.
   */
  useEffect(() => {
    const depthKey =
      String(selectedDepth);

    const cached =
      historicalSeriesCache.current[
      depthKey
      ];

    if (cached) {
      const index =
        dateToIndex(selectedDate);

      setTemperatureField(
        decodeHistoricalFrame(
          cached,
          index,
        ),
      );

      setFieldError(null);
      setFieldLoading(false);

      return;
    }


    let active = true;

    setFieldLoading(true);
    setFieldError(null);


    api
      .getHistoricalTemperatureSeries(
        selectedDepth,
      )
      .then((series) => {
        if (!active) return;

        historicalSeriesCache.current[
          depthKey
        ] = series;

        const index =
          dateToIndex(selectedDate);

        setTemperatureField(
          decodeHistoricalFrame(
            series,
            index,
          ),
        );
      })
      .catch((err) => {
        if (!active) return;

        console.error(
          'Historical temperature series failed:',
          err,
        );

        setTemperatureField(null);

        setFieldError(
          err instanceof Error
            ? err.message
            : 'HISTORICAL FIELD UNAVAILABLE',
        );
      })
      .finally(() => {
        if (active) {
          setFieldLoading(false);
        }
      });


    return () => {
      active = false;
    };
  }, [selectedDepth]);


  /*
   * Change the displayed frame locally
   * whenever the date changes.
   *
   * IMPORTANT:
   * No API request happens here.
   */
  useEffect(() => {
    const series =
      historicalSeriesCache.current[
      String(selectedDepth)
      ];

    if (!series) {
      return;
    }

    const index =
      dateToIndex(selectedDate);

    setTemperatureField(
      decodeHistoricalFrame(
        series,
        index,
      ),
    );
  }, [
    selectedDate,
    selectedDepth,
  ]);


  /*
   * Load profile for selected location.
   *
   * This remains a date-based API request because
   * the profile panel needs the point-specific data.
   */
  useEffect(() => {
    if (!selectedLocation) {
      setProfile(null);
      return;
    }

    const {
      lat,
      lon,
    } = selectedLocation;

    const cacheKey =
      `${selectedDate}_${lat}_${lon}`;


    const cached =
      profileCache.current[
      cacheKey
      ];

    if (cached) {
      setProfile(cached);
      setProfileLoading(false);
      return;
    }


    let active = true;

    setProfileLoading(true);


    api
      .getProfile(
        selectedDate,
        lat,
        lon,
        'historical',
      )
      .then((data) => {
        if (!active) return;

        profileCache.current[
          cacheKey
        ] = data;

        setProfile(data);
      })
      .catch((err) => {
        if (!active) return;

        console.error(
          'Profile request failed:',
          err,
        );

        setProfile(null);
      })
      .finally(() => {
        if (active) {
          setProfileLoading(false);
        }
      });


    return () => {
      active = false;
    };
  }, [
    selectedDate,
    selectedLocation,
  ]);

  useEffect(() => {
    if (!selectedLocation) {
      setArgoProfile(null);
      return;
    }

    let active = true;

    const loadArgoProfile = async () => {
      setArgoLoading(true);

      try {
        const result =
          await api.getArgoProfile(
            selectedDate,
            selectedLocation.lat,
            selectedLocation.lon,
          );

        if (!active) {
          return;
        }

        setArgoProfile(result);
      } catch (error) {
        console.error(
          'ARGO profile lookup failed:',
          error,
        );

        if (active) {
          setArgoProfile({
            available: false,
            date_requested: selectedDate,
            latitude: selectedLocation.lat,
            longitude: selectedLocation.lon,
            reason:
              'ARGO observation lookup failed.',
            source: 'IFREMER GDAC ARGO',
            usage: 'independent_validation',
          });
        }
      } finally {
        if (active) {
          setArgoLoading(false);
        }
      }
    };

    loadArgoProfile();

    return () => {
      active = false;
    };
  }, [
    selectedDate,
    selectedLocation,
  ]);

  /*
 * Look up an independent ARGO observation for the
 * current map hover position.
 *
 * Debounced so moving the mouse across the map does
 * not generate an API request for every mouse event.
 */
  useEffect(() => {
    if (
      hoverData.lat === null ||
      hoverData.lon === null
    ) {
      setHoverArgo(null);
      setHoverArgoLoading(false);
      return;
    }

    let active = true;

    const timer = window.setTimeout(async () => {
      if (!active) {
        return;
      }

      setHoverArgoLoading(true);

      try {
        const result =
          await api.getArgoObservation(
            selectedDate,
            hoverData.lat!,
            hoverData.lon!,
            selectedDepth,
          );

        if (!active) {
          return;
        }

        setHoverArgo(result);
      } catch (error) {
        console.error(
          'ARGO hover lookup failed:',
          error,
        );

        if (active) {
          setHoverArgo({
            available: false,
            reason:
              'ARGO lookup unavailable.',
            source:
              'IFREMER GDAC ARGO',
            usage:
              'independent_validation',
          });
        }
      } finally {
        if (active) {
          setHoverArgoLoading(false);
        }
      }
    }, 250);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [
    hoverData.lat,
    hoverData.lon,
    selectedDate,
    selectedDepth,
  ]);


  const handleLocationSelect = (
    lat: number,
    lon: number,
  ) => {
    setSelectedLocation({
      lat,
      lon,
    });
  };


  const handleHoverLocation = (
    lat: number | null,
    lon: number | null,
    temp: number | null,
  ) => {
    setHoverData({
      lat,
      lon,
      temp,
    });
  };


  let panelTemp:
    number | null = null;


  if (
    profile &&
    profile.depths_m
  ) {
    const depthIdx =
      profile.depths_m.indexOf(
        selectedDepth,
      );

    if (
      depthIdx !== -1
    ) {
      panelTemp =
        profile.temperature_degC[
        depthIdx
        ];
    }
  }


  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        flex: 1,
        padding: 'var(--space-4)',
        gap: 'var(--space-4)',
      }}
    >

      {/* Top row */}
      <div
        style={{
          display: 'flex',
          gap: 'var(--space-4)',
          flex: 1,
          minHeight: 0,
        }}
      >

        {/* Depth rail */}
        <div
          style={{
            width: '120px',
            padding:
              'var(--space-4) 0',
            overflowY: 'auto',
          }}
        >
          <DepthSelector
            selectedDepth={
              selectedDepth
            }
            onDepthChange={
              setSelectedDepth
            }
          />
        </div>


        {/* Map */}
        <Panel
          style={{
            flex: 3,
            position: 'relative',
            overflow: 'hidden',
            padding: 0,
          }}
        >
          <OceanMap
            temperatureData={
              temperatureField
            }
            selectedLocation={
              selectedLocation
            }
            onLocationSelect={
              handleLocationSelect
            }
            onHoverLocation={
              handleHoverLocation
            }
          />


          {/* Title */}
          <div
            style={{
              position: 'absolute',
              top: 'var(--space-6)',
              left: 'var(--space-6)',
              zIndex: 1,
              pointerEvents: 'none',
            }}
          >
            <h2
              style={{
                margin: 0,
                fontSize: '1.5rem',
                letterSpacing:
                  '0.05em',
                textShadow:
                  '0 2px 4px rgba(0,0,0,0.8)',
              }}
            >
              BAY OF BENGAL
            </h2>

            <div
              className="label-scientific"
              style={{
                color:
                  'var(--color-ocean-bright)',
                textShadow:
                  '0 1px 2px rgba(0,0,0,0.8)',
              }}
            >
              SUBSURFACE TEMPERATURE •{' '}
              {selectedDepth}m
            </div>
          </div>


          {/* Hover tooltip */}
          {/* -------------------------------------------------- */}
          {/* Map Hover Inspection */}
          {/* -------------------------------------------------- */}

          {hoverData.lat !== null &&
            hoverData.lon !== null && (
              <div
                style={{
                  position: 'absolute',
                  top: 'var(--space-6)',
                  right: 'var(--space-6)',
                  zIndex: 3,
                  width: '180px',
                  backgroundColor:
                    'rgba(6, 20, 29, 0.92)',
                  backdropFilter: 'blur(8px)',
                  padding: 'var(--space-3)',
                  borderRadius: 'var(--radius-sm)',
                  border:
                    '1px solid var(--color-border)',
                  pointerEvents: 'none',
                }}
              >
                {/* Coordinates */}
                <div
                  className="data-numeric"
                  style={{
                    fontSize: '0.8rem',
                  }}
                >
                  {formatCoordinate(
                    hoverData.lat,
                    'lat',
                  )}
                </div>

                <div
                  className="data-numeric"
                  style={{
                    fontSize: '0.8rem',
                  }}
                >
                  {formatCoordinate(
                    hoverData.lon,
                    'lon',
                  )}
                </div>

                <div
                  style={{
                    height: '1px',
                    backgroundColor:
                      'var(--color-border)',
                    margin:
                      'var(--space-2) 0',
                  }}
                />

                {/* Depth */}
                <div
                  className="label-scientific"
                  style={{
                    fontSize: '0.6rem',
                    marginBottom:
                      'var(--space-1)',
                  }}
                >
                  {selectedDepth} m
                </div>

                {/* ANTARBODH */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent:
                      'space-between',
                    alignItems: 'baseline',
                    gap: 'var(--space-2)',
                  }}
                >
                  <span
                    className="label-scientific"
                    style={{
                      fontSize: '0.58rem',
                    }}
                  >
                    ANTARBODH
                  </span>

                  <span
                    className="data-numeric"
                    style={{
                      color:
                        'var(--color-ocean-bright)',
                      fontSize: '0.95rem',
                    }}
                  >
                    {formatTemperature(
                      hoverData.temp,
                    )}
                  </span>
                </div>

                {/* ARGO */}
                <div
                  style={{
                    marginTop:
                      'var(--space-2)',
                    paddingTop:
                      'var(--space-2)',
                    borderTop:
                      '1px solid var(--color-border)',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent:
                        'space-between',
                      alignItems: 'baseline',
                    }}
                  >
                    <span
                      className="label-scientific"
                      style={{
                        fontSize: '0.58rem',
                      }}
                    >
                      ARGO
                    </span>

                    {hoverArgoLoading ? (
                      <span
                        className="label-scientific"
                        style={{
                          fontSize: '0.58rem',
                          color:
                            'var(--color-text-subtle)',
                        }}
                      >
                        SEARCHING...
                      </span>
                    ) : hoverArgo?.available &&
                      hoverArgo.temperature_degC !==
                      undefined ? (
                      <span
                        className="data-numeric"
                        style={{
                          fontSize: '0.95rem',
                        }}
                      >
                        {formatTemperature(
                          hoverArgo.temperature_degC,
                        )}
                      </span>
                    ) : (
                      <span
                        className="label-scientific"
                        style={{
                          fontSize: '0.58rem',
                          color:
                            'var(--color-text-subtle)',
                        }}
                      >
                        NO MATCH
                      </span>
                    )}
                  </div>

                  {hoverArgo?.available && (
                    <div
                      style={{
                        marginTop:
                          'var(--space-1)',
                        fontSize: '0.58rem',
                        lineHeight: 1.45,
                        color:
                          'var(--color-text-subtle)',
                      }}
                    >
                      <div>
                        ARGO ~
                        {hoverArgo.depth_m_approx?.toFixed(
                          1,
                        )}{' '}
                        m
                      </div>

                      <div>
                        {hoverArgo.distance_km?.toFixed(
                          0,
                        )}{' '}
                        km away
                      </div>

                      <div>
                        {hoverArgo.date_observed}
                      </div>

                      <div>
                        {hoverArgo.temperature_source ===
                          'adjusted'
                          ? 'ADJUSTED'
                          : 'RAW'}{' '}
                        · QC {hoverArgo.qc ?? 1}
                      </div>
                    </div>
                  )}

                  {!hoverArgoLoading &&
                    !hoverArgo?.available && (
                      <div
                        style={{
                          marginTop:
                            'var(--space-1)',
                          fontSize: '0.58rem',
                          lineHeight: 1.4,
                          color:
                            'var(--color-text-subtle)',
                        }}
                      >
                        No suitable independent
                        ARGO observation within the
                        prototype matching window.
                      </div>
                    )}
                </div>
              </div>
            )}


          {/* Legend */}
          <div
            style={{
              position: 'absolute',
              bottom: 'var(--space-6)',
              left: 'var(--space-6)',
              zIndex: 1,
            }}
          >
            {/* Observation legend */}
            <div
              style={{
                position: 'absolute',
                bottom: '92px',
                left: 'var(--space-6)',
                zIndex: 2,
                backgroundColor:
                  'rgba(6, 20, 29, 0.86)',
                border:
                  '1px solid var(--color-border)',
                borderRadius:
                  'var(--radius-sm)',
                padding:
                  'var(--space-2) var(--space-3)',
                pointerEvents: 'none',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '0.62rem',
                  color:
                    'var(--color-text-subtle)',
                  marginBottom: '5px',
                }}
              >
                <span
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor:
                      'var(--color-ocean-bright)',
                    display: 'inline-block',
                  }}
                />
                ANTARBODH
                <span>
                  reconstructed field
                </span>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '0.62rem',
                  color:
                    'var(--color-text-subtle)',
                }}
              >
                <span
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    border:
                      '2px solid var(--color-text)',
                    display: 'inline-block',
                  }}
                />
                ARGO
                <span>
                  independent observation
                </span>
              </div>
            </div>
            <TemperatureLegend />
          </div>


          {/* Loading */}
          {fieldLoading && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                zIndex: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent:
                  'center',
                backgroundColor:
                  'rgba(6, 20, 29, 0.4)',
                backdropFilter:
                  'blur(2px)',
                pointerEvents:
                  'none',
              }}
            >
              <div
                className="label-scientific"
                style={{
                  backgroundColor:
                    'var(--color-deep)',
                  padding:
                    'var(--space-3) var(--space-6)',
                  borderRadius:
                    'var(--radius-full)',
                  border:
                    '1px solid var(--color-border)',
                }}
              >
                LOADING 2025 FIELD...
              </div>
            </div>
          )}


          {/* Error */}
          {fieldError &&
            !fieldLoading && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  zIndex: 2,
                  display: 'flex',
                  alignItems:
                    'center',
                  justifyContent:
                    'center',
                  backgroundColor:
                    'rgba(6, 20, 29, 0.6)',
                  pointerEvents:
                    'none',
                }}
              >
                <div
                  style={{
                    backgroundColor:
                      'var(--color-deep)',
                    padding:
                      'var(--space-4) var(--space-6)',
                    borderRadius:
                      'var(--radius-md)',
                    border:
                      '1px solid var(--color-danger)',
                    textAlign:
                      'center',
                  }}
                >
                  <div
                    className="label-scientific"
                    style={{
                      color:
                        'var(--color-danger)',
                      marginBottom:
                        'var(--space-2)',
                    }}
                  >
                    {fieldError}
                  </div>

                  <div
                    style={{
                      fontSize:
                        '0.875rem',
                      color:
                        'var(--color-text-subtle)',
                    }}
                  >
                    Try selecting a
                    different depth.
                  </div>
                </div>
              </div>
            )}
        </Panel>


        {/* Inspection */}
        <Panel
          style={{
            width: '320px',
            display: 'flex',
            flexDirection: 'column',
            flexShrink: 0,
          }}
        >
          <LocationPanel
            location={selectedLocation}
            date={selectedDate}
            depth={selectedDepth}
            temperature={panelTemp}
            profile={profile}
            argoProfile={argoProfile}
            argoLoading={argoLoading}
            loading={profileLoading}
          />
        </Panel>
      </div>


      {/* Timeline */}
      <Panel
        style={{
          height: '80px',
          display: 'flex',
          alignItems: 'center',
          padding:
            '0 var(--space-6)',
          flexShrink: 0,
        }}
      >
        <DateTimeline
          selectedDate={
            selectedDate
          }
          onDateChange={
            setSelectedDate
          }
          disabled={
            fieldLoading
          }
        />
      </Panel>
    </div>
  );
}