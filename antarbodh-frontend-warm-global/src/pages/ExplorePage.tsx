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

import { api } from '../api/endpoints';
import { formatDay, seasonFor } from '../lib/seasons';

import '../styles/explore.css';

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
          <header className="ex-depth-head">
            <p className="kicker" lang="hi">
              गहराई
            </p>
            <h2 className="ex-depth-head__title">Depth</h2>
          </header>

          <div className="ex-depth-scroll">
            <DepthSelector
              selectedDepth={
                selectedDepth
              }
              onDepthChange={
                setSelectedDepth
              }
            />
          </div>

          <p className="ex-depth-note">
            Fifteen standard depths, from the surface through the
            thermocline to 1,000 m.
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
          <div className="ex-map-title">
            <p className="kicker" lang="hi">
              बंगाल की खाड़ी
            </p>

            <h1 className="ex-map-title__name">
              Bay of Bengal
            </h1>

            <div className="ex-map-title__chips">
              <span className="ex-chip ex-chip--accent">
                {selectedDepth} m
              </span>
              <span className="ex-chip">
                {formatDay(selectedDate)}
              </span>
              <span className="ex-chip">
                {seasonFor(selectedDate).name}
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


          {/* Legend */}
          <div className="ex-map-legend">
            <TemperatureLegend />
          </div>


          {/* Loading */}
          {fieldLoading && (
            <div className="ex-map-scrim" role="status">
              <div className="map-overlay ex-loading">
                <span className="spinner" aria-hidden="true" />
                Loading the 2025 field at {selectedDepth} m
              </div>
            </div>
          )}


          {/* Error */}
          {fieldError &&
            !fieldLoading && (
              <div className="ex-map-scrim ex-map-scrim--strong" role="alert">
                <div className="ex-error">
                  <p className="ex-error__title">
                    The {selectedDepth} m field could not be loaded
                  </p>
                  <p className="ex-error__detail">{fieldError}</p>
                  <p className="ex-error__hint">
                    Check that the backend is running, or choose a
                    different depth.
                  </p>
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
            onDepthChange={setSelectedDepth}
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
