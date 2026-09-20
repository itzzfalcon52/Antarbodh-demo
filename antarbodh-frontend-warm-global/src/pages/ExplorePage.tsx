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
import { MapHoverReadout } from '../components/explore/MapHoverReadout';
import { SectionHeading } from '../components/ui/SectionHeading';

import { api } from '../api/endpoints';

import type {
  TemperatureFieldResponse,
  ProfileResponse,
  HistoricalTemperatureSeriesResponse,
  ArgoProfileResponse,
  ArgoObservationResponse,
} from '../types/api';

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
    <div className="explore-page">

      {/* ============================================== */}
      {/* Top row                                        */}
      {/* ============================================== */}

      <div className="explore-grid">

        {/* -------------------------------------------- */}
        {/* Depth rail                                   */}
        {/* -------------------------------------------- */}

        <aside className="explore-depth">
          <SectionHeading
            index="01"
            title="Depth"
            style={{ marginBottom: 'var(--space-4)' }}
          />

          <div
            style={{
              flex: 1,
              minHeight: 0,
              overflowY: 'auto',
              paddingRight: '2px',
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

          <p
            style={{
              margin: 'var(--space-4) 0 0',
              fontSize: '0.625rem',
              lineHeight: 1.55,
              color: 'var(--color-text-faint)',
            }}
          >
            Fifteen target depths, from the mixed layer
            through the thermocline to 1000 m.
          </p>
        </aside>


        {/* -------------------------------------------- */}
        {/* Map — the centrepiece                        */}
        {/* -------------------------------------------- */}

        <div className="map-frame map-region">
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
              top: 'var(--space-5)',
              left: 'var(--space-5)',
              zIndex: 3,
              pointerEvents: 'none',
              maxWidth: '58%',
            }}
          >
            <div
              className="label-scientific"
              style={{
                fontSize: '0.5625rem',
                color: 'var(--color-text-muted)',
                textShadow: 'var(--shadow-text)',
              }}
            >
              Reconstructed subsurface field
            </div>

            <h2
              className="display display--sm"
              style={{
                margin: '4px 0 0',
                fontSize: 'clamp(1.5rem, 1.1rem + 1.1vw, 2.1rem)',
                textShadow: 'var(--shadow-text)',
              }}
            >
              Bay of Bengal
            </h2>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-2)',
                marginTop: '6px',
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  width: '16px',
                  height: '1px',
                  backgroundColor: 'var(--color-ocean-bright)',
                }}
              />

              <span
                className="data-numeric"
                style={{
                  fontSize: '0.72rem',
                  color: 'var(--color-ocean-bright)',
                  textShadow: 'var(--shadow-text)',
                }}
              >
                {selectedDepth} m
              </span>
            </div>
          </div>


          {/* -------------------------------------------------- */}
          {/* Map Hover Inspection */}
          {/* -------------------------------------------------- */}

          {hoverData.lat !== null &&
            hoverData.lon !== null && (
              <MapHoverReadout
                lat={hoverData.lat}
                lon={hoverData.lon}
                temp={hoverData.temp}
                depth={selectedDepth}
                argo={hoverArgo}
                argoLoading={hoverArgoLoading}
              />
            )}


          {/* Legend stack */}
          <div
            style={{
              position: 'absolute',
              bottom: 'var(--space-5)',
              left: 'var(--space-5)',
              zIndex: 3,
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-2)',
              alignItems: 'flex-start',
            }}
          >
            {/* Observation legend */}
            <div
              className="map-overlay"
              style={{
                position: 'relative',
                padding: 'var(--space-2) var(--space-3)',
                pointerEvents: 'none',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '0.625rem',
                  color: 'var(--color-text-muted)',
                  marginBottom: '5px',
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    width: '7px',
                    height: '7px',
                    borderRadius: '50%',
                    backgroundColor:
                      'var(--color-ocean-bright)',
                    display: 'inline-block',
                    flexShrink: 0,
                  }}
                />
                <strong style={{ fontWeight: 600 }}>ANTARBODH</strong>
                <span style={{ color: 'var(--color-text-faint)' }}>
                  reconstructed field
                </span>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '0.625rem',
                  color: 'var(--color-text-muted)',
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    width: '7px',
                    height: '7px',
                    borderRadius: '50%',
                    border: '1.5px solid var(--color-text)',
                    display: 'inline-block',
                    flexShrink: 0,
                  }}
                />
                <strong style={{ fontWeight: 600 }}>ARGO</strong>
                <span style={{ color: 'var(--color-text-faint)' }}>
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
                zIndex: 4,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'var(--scrim-soft)',
                backdropFilter: 'blur(3px)',
                WebkitBackdropFilter: 'blur(3px)',
                pointerEvents: 'none',
                animation: 'ab-fade var(--transition-fast) both',
              }}
            >
              <div
                className="map-overlay"
                style={{
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-3)',
                  padding: 'var(--space-3) var(--space-5)',
                  borderRadius: 'var(--radius-full)',
                }}
              >
                <span
                  className="spinner"
                  aria-hidden="true"
                  style={{
                    display: 'inline-block',
                    width: '13px',
                    height: '13px',
                    borderWidth: '1.5px',
                  }}
                />

                <span
                  className="label-scientific label-scientific--bright"
                  style={{ fontSize: '0.5875rem' }}
                >
                  Loading 2025 field
                </span>
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
                  zIndex: 4,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: 'var(--scrim-strong)',
                  pointerEvents: 'none',
                }}
              >
                <div
                  style={{
                    maxWidth: '42ch',
                    padding: 'var(--space-5) var(--space-6)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid rgba(255, 107, 107, 0.42)',
                    borderLeftWidth: '2px',
                    backgroundColor: 'var(--color-deep)',
                    boxShadow: 'var(--shadow-lg)',
                    textAlign: 'left',
                  }}
                >
                  <div
                    className="label-scientific"
                    style={{
                      color: 'var(--color-danger)',
                      marginBottom: 'var(--space-2)',
                    }}
                  >
                    {fieldError}
                  </div>

                  <div
                    style={{
                      fontSize: '0.8rem',
                      lineHeight: 1.6,
                      color: 'var(--color-text-subtle)',
                    }}
                  >
                    Try selecting a different depth.
                  </div>
                </div>
              </div>
            )}
        </div>


        {/* -------------------------------------------- */}
        {/* Inspection                                   */}
        {/* -------------------------------------------- */}

        <Panel className="explore-inspect location-shell">
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


      {/* ============================================== */}
      {/* Timeline                                       */}
      {/* ============================================== */}

      <Panel className="explore-timeline" variant="default">
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
