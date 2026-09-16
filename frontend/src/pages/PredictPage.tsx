import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import { Panel } from '../components/ui/Panel';
import { Button } from '../components/ui/Button';

import { PredictionMap } from '../components/predict/PredictionMap';
import { PredictionProfilePanel } from '../components/predict/PredictionProfilePanel';

import { api } from '../api/endpoints';

import type {
  AvailabilityResponse,
  ProfileResponse,
} from '../types/api';

import { DOMAIN } from '../lib/constants';


type PredictionStage =
  | 'idle'
  | 'checking'
  | 'ready'
  | 'insufficient'
  | 'running'
  | 'complete'
  | 'error';


export function PredictPage() {

  const [date, setDate] =
    useState('2025-01-01');

  const [lat, setLat] =
    useState<number | null>(12.5);

  const [lon, setLon] =
    useState<number | null>(88.0);


  const [availability, setAvailability] =
    useState<AvailabilityResponse | null>(
      null,
    );

  const [profile, setProfile] =
    useState<ProfileResponse | null>(
      null,
    );


  const [stage, setStage] =
    useState<PredictionStage>('idle');

  const [error, setError] =
    useState<string | null>(null);


  // ---------------------------------------------------------
  // Reset downstream state whenever request inputs change
  // ---------------------------------------------------------

  useEffect(() => {

    setAvailability(null);
    setProfile(null);
    setError(null);

    setStage('idle');

  }, [date, lat, lon]);


  // ---------------------------------------------------------
  // Location validation
  // ---------------------------------------------------------

  const isValidLocation = useMemo(
    () => {

      if (
        lat === null ||
        lon === null
      ) {
        return false;
      }

      return (
        lat >= DOMAIN.LAT_MIN &&
        lat <= DOMAIN.LAT_MAX &&
        lon >= DOMAIN.LON_MIN &&
        lon <= DOMAIN.LON_MAX
      );

    },
    [lat, lon],
  );


  // ---------------------------------------------------------
  // Date validation
  // ---------------------------------------------------------

  const isValidDate =
    date >= '2025-01-01' &&
    date <= '2025-12-31';


  const canCheck =
    isValidLocation &&
    isValidDate &&
    stage !== 'checking' &&
    stage !== 'running';


  const canRun =
    isValidLocation &&
    isValidDate &&
    availability?.prediction_possible === true &&
    stage !== 'running';


  // ---------------------------------------------------------
  // Check surface observations
  // ---------------------------------------------------------

  const handleCheck =
    async () => {

      if (!canCheck) {
        return;
      }

      setStage('checking');

      setAvailability(null);
      setProfile(null);
      setError(null);

      try {

        const result =
          await api.getAvailability(
            date,
          );

        setAvailability(result);

        if (
          result.prediction_possible
        ) {

          setStage('ready');

        } else {

          setStage('insufficient');
        }

      } catch (err) {

        console.error(
          'Availability check failed:',
          err,
        );

        setStage('error');

        setError(
          'Unable to check surface observations. '
          + 'Please verify that the backend and '
          + '2025 surface datasets are available.',
        );
      }
    };


  // ---------------------------------------------------------
  // Run ANTARBODH reconstruction
  // ---------------------------------------------------------

  const handleRun =
    async () => {

      if (!canRun) {
        return;
      }

      setStage('running');

      setError(null);

      try {

        const result =
          await api.getPrediction(
            date,
            lat as number,
            lon as number,
          );

        setProfile(result);

        setStage('complete');

      } catch (err: any) {

        console.error(
          'ANTARBODH reconstruction failed:',
          err,
        );

        let message =
          'ANTARBODH reconstruction could not be completed.';

        const detail =
          err?.response?.data?.detail
          ?? err?.detail;

        if (
          typeof detail === 'string'
        ) {

          message = detail;

        } else if (
          detail?.reason
        ) {

          message = detail.reason;

        } else if (
          err?.message
        ) {

          message = err.message;
        }

        setError(message);

        setStage('error');
      }
    };


  // ---------------------------------------------------------
  // Date display
  // ---------------------------------------------------------

  const formattedDate =
    new Date(
      `${date}T00:00:00Z`,
    ).toLocaleDateString(
      'en-GB',
      {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        timeZone: 'UTC',
      },
    ).toUpperCase();


  // ---------------------------------------------------------
  // Render
  // ---------------------------------------------------------

  return (

    <div
      className="predict-page"
    >

      {/* ===================================================
          PAGE HEADER
          =================================================== */}

      <div className="predict-page-header">

        <h1>
          ON-DEMAND SUBSURFACE RECONSTRUCTION
        </h1>

        <div className="predict-page-subtitle">
          Generate a vertical temperature profile
          from surface observations
        </div>

      </div>


      <div
        className="predict-layout"
      >

        {/* =================================================
            LEFT REQUEST PANEL
            ================================================= */}

        <Panel
          className="predict-request-panel"
        >

          <div
            className="label-scientific"
            style={{
              marginBottom:
                'var(--space-4)',
            }}
          >
            OBSERVATION REQUEST
          </div>


          {/* -------------------------------------------------
              DATE
              ------------------------------------------------- */}

          <div className="predict-field">

            <label
              className="label-scientific"
            >
              DATE
            </label>

            <input
              type="date"
              min="2025-01-01"
              max="2025-12-31"
              value={date}
              onChange={(event) =>
                setDate(
                  event.target.value,
                )
              }
            />

          </div>


          {/* -------------------------------------------------
              LAT / LON
              ------------------------------------------------- */}

          <div
            className="predict-coordinate-row"
          >

            <div className="predict-field">

              <label
                className="label-scientific"
              >
                LATITUDE
              </label>

              <input
                type="number"
                step="0.01"
                min={DOMAIN.LAT_MIN}
                max={DOMAIN.LAT_MAX}
                value={
                  lat === null
                    ? ''
                    : lat
                }
                onChange={(event) =>
                  setLat(
                    event.target.value
                      ? Number(
                        event.target.value,
                      )
                      : null,
                  )
                }
              />

            </div>


            <div className="predict-field">

              <label
                className="label-scientific"
              >
                LONGITUDE
              </label>

              <input
                type="number"
                step="0.01"
                min={DOMAIN.LON_MIN}
                max={DOMAIN.LON_MAX}
                value={
                  lon === null
                    ? ''
                    : lon
                }
                onChange={(event) =>
                  setLon(
                    event.target.value
                      ? Number(
                        event.target.value,
                      )
                      : null,
                  )
                }
              />

            </div>

          </div>


          {!isValidLocation &&
            lat !== null &&
            lon !== null && (

              <div
                className="predict-validation-error"
              >
                Location outside ANTARBODH
                prototype domain.
              </div>

            )}


          {!isValidDate && (

            <div
              className="predict-validation-error"
            >
              ANTARBODH v1 inference is currently
              limited to 2025.
            </div>

          )}


          {/* -------------------------------------------------
              MAP
              ------------------------------------------------- */}

          <div
            className="predict-map-wrapper"
          >

            <PredictionMap
              lat={lat}
              lon={lon}
              onLocationChange={(
                newLat,
                newLon,
              ) => {

                setLat(newLat);
                setLon(newLon);

              }}
            />

          </div>


          {/* =================================================
              OBSERVATION STATUS
              ================================================= */}

          {availability && (

            <div
              className={
                `predict-observation-card ${availability.prediction_possible
                  ? 'is-ready'
                  : 'is-insufficient'
                }`
              }
            >

              <div
                className="label-scientific"
              >
                SURFACE OBSERVATION STATUS
              </div>


              <div
                className="predict-input-list"
              >

                {Object.entries(
                  availability.inputs,
                ).map(
                  ([
                    channel,
                    status,
                  ]) => (

                    <div
                      key={channel}
                      className="predict-input-row"
                    >

                      <span>
                        {channel
                          .replace(
                            '_',
                            ' ',
                          )
                          .toUpperCase()}
                      </span>

                      <span
                        className={
                          status.available
                            ? 'input-available'
                            : 'input-missing'
                        }
                      >
                        {status.available
                          ? '✓ AVAILABLE'
                          : '✕ UNAVAILABLE'}
                      </span>

                    </div>

                  ),
                )}

              </div>


              <div
                className="predict-observation-message"
              >
                {availability.reason}
              </div>


              {availability.input_completeness ===
                'partial' &&
                availability.prediction_possible && (

                  <div
                    className="predict-observation-note"
                  >
                    A permitted input is missing.
                    ANTARBODH will use its trained
                    missingness representation.
                  </div>

                )}

            </div>

          )}


          {/* =================================================
              ACTIONS
              ================================================= */}

          <div
            className="predict-actions"
          >

            <Button
              variant="secondary"
              onClick={
                handleCheck
              }
              disabled={!canCheck}
              style={{
                width: '100%',
              }}
            >
              {stage === 'checking'
                ? 'CHECKING...'
                : 'CHECK OBSERVATIONS'}
            </Button>


            <Button
              variant="primary"
              onClick={
                handleRun
              }
              disabled={!canRun}
              style={{
                width: '100%',
                opacity: canRun
                  ? 1
                  : 0.45,
              }}
            >
              {stage === 'running'
                ? 'RECONSTRUCTING...'
                : 'RUN RECONSTRUCTION'}
            </Button>

          </div>


          <div
            className="predict-policy-note"
          >
            <strong>
              V1 INFERENCE WINDOW
            </strong>

            <span>
              01 JAN — 31 DEC 2025
            </span>

            <span>
              No GLORYS, ARGO or climatology
              fallback is used during inference.
            </span>
          </div>

        </Panel>


        {/* =================================================
            RIGHT RESULT PANEL
            ================================================= */}

        <Panel
          className="predict-result-panel"
        >

          {/* -------------------------------------------------
              CHECKING
              ------------------------------------------------- */}

          {stage === 'checking' && (

            <div
              className="predict-empty-state"
            >

              <div
                className="label-scientific"
              >
                CHECKING SURFACE OBSERVATIONS
              </div>

              <div
                className="predict-state-title"
              >
                VERIFYING INPUT DATA
              </div>

              <div
                className="predict-state-description"
              >
                Checking SST, SSS, SSH,
                currents and winds for
                {` ${formattedDate}`}.
              </div>

            </div>

          )}


          {/* -------------------------------------------------
              READY
              ------------------------------------------------- */}

          {stage === 'ready' &&
            availability && (

              <div
                className="predict-empty-state"
              >

                <div
                  className="predict-ready-mark"
                >
                  ✓
                </div>

                <div
                  className="label-scientific"
                >
                  SURFACE OBSERVATIONS VERIFIED
                </div>

                <div
                  className="predict-state-title"
                >
                  READY FOR RECONSTRUCTION
                </div>

                <div
                  className="predict-state-description"
                >
                  The required surface input state
                  is available for ANTARBODH CNN v1.
                  Run reconstruction to generate
                  the 15-depth temperature profile.
                </div>

              </div>

            )}


          {/* -------------------------------------------------
              INSUFFICIENT
              ------------------------------------------------- */}

          {stage === 'insufficient' &&
            availability && (

              <div
                className="predict-empty-state"
              >

                <div
                  className="predict-warning-mark"
                >
                  !
                </div>

                <div
                  className="label-scientific"
                >
                  RECONSTRUCTION UNAVAILABLE
                </div>

                <div
                  className="predict-state-title"
                >
                  INSUFFICIENT SURFACE DATA
                </div>

                <div
                  className="predict-state-description"
                >
                  {availability.reason}
                </div>

                <div
                  className="predict-state-description"
                >
                  The CNN was not executed and
                  no fallback dataset was substituted.
                </div>

              </div>

            )}


          {/* -------------------------------------------------
              RUNNING
              ------------------------------------------------- */}

          {stage === 'running' && (

            <div
              className="predict-empty-state"
            >

              <div
                className="label-scientific"
              >
                ANTARBODH CNN V1
              </div>

              <div
                className="predict-state-title"
              >
                RECONSTRUCTING SUBSURFACE OCEAN
              </div>

              <div
                className="predict-progress-list"
              >

                <span>
                  ✓ Surface observations loaded
                </span>

                <span>
                  ✓ Applying preprocessing
                </span>

                <span>
                  ✓ Building 14-channel input
                </span>

                <span>
                  ● Running frozen CNN
                </span>

                <span>
                  ○ Generating 15-depth profile
                </span>

              </div>

            </div>

          )}


          {/* -------------------------------------------------
              ERROR
              ------------------------------------------------- */}

          {stage === 'error' && (

            <div
              className="predict-empty-state"
            >

              <div
                className="predict-error-mark"
              >
                ×
              </div>

              <div
                className="label-scientific"
              >
                REQUEST FAILED
              </div>

              <div
                className="predict-state-title"
              >
                RECONSTRUCTION COULD NOT COMPLETE
              </div>

              <div
                className="predict-error-message"
              >
                {error}
              </div>

              <div
                className="predict-state-description"
              >
                Check the backend terminal for the
                detailed adapter, preprocessing or
                model error.
              </div>

            </div>

          )}


          {/* -------------------------------------------------
              RESULT
              ------------------------------------------------- */}

          {stage === 'complete' &&
            profile && (

              <div
                className="predict-result"
              >

                <div
                  className="predict-result-header"
                >

                  <div>

                    <div
                      className="label-scientific"
                    >
                      ANTARBODH RECONSTRUCTION
                    </div>

                    <h2>
                      SUBSURFACE TEMPERATURE PROFILE
                    </h2>

                    <div
                      className="predict-result-location"
                    >
                      {profile.latitude.toFixed(2)}
                      °N
                      {' · '}
                      {profile.longitude.toFixed(2)}
                      °E
                    </div>

                  </div>


                  <div
                    className="predict-result-date"
                  >
                    {formattedDate}
                  </div>

                </div>


                <div
                  className="predict-result-meta"
                >

                  <div>
                    <span>
                      MODEL
                    </span>

                    <strong>
                      ANTARBODH CNN V1
                    </strong>
                  </div>


                  <div>
                    <span>
                      INPUT
                    </span>

                    <strong>
                      SURFACE OBSERVATIONS
                    </strong>
                  </div>


                  <div>
                    <span>
                      OUTPUT
                    </span>

                    <strong>
                      15 DEPTH LEVELS
                    </strong>
                  </div>

                </div>


                <div
                  className="predict-profile-container"
                >
                  <PredictionProfilePanel
                    profile={profile}
                  />
                </div>


                <div
                  className="predict-provenance"
                >

                  <div
                    className="label-scientific"
                  >
                    PROVENANCE
                  </div>

                  <div>
                    Surface observations
                    → ANTARBODH CNN v1
                    → subsurface reconstruction
                  </div>

                  <div>
                    GLORYS is used as the training/
                    reference target, not as an
                    inference fallback.
                  </div>

                  <div>
                    ARGO observations are independent
                    validation data, not model inputs.
                  </div>

                </div>

              </div>

            )}


          {/* -------------------------------------------------
              INITIAL STATE
              ------------------------------------------------- */}

          {stage === 'idle' && (

            <div
              className="predict-empty-state"
            >

              <div
                className="label-scientific"
              >
                ON-DEMAND RECONSTRUCTION
              </div>

              <div
                className="predict-state-title"
              >
                CHECK THE SURFACE STATE
              </div>

              <div
                className="predict-state-description"
              >
                Select a 2025 date and location
                within the Bay of Bengal, then
                check whether the required surface
                observations are available.
              </div>

            </div>

          )}

        </Panel>

      </div>

    </div>
  );
}