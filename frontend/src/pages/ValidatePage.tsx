import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import { Panel } from '../components/ui/Panel';
import { ValidationCharts } from '../components/validate/ValidationCharts';

import { api } from '../api/endpoints';

import type {
  ValidationDepthMetrics,
  ValidationReportResponse,
} from '../types/api';


function formatNumber(
  value: number | null | undefined,
  digits = 4,
): string {
  if (
    value === null ||
    value === undefined ||
    !Number.isFinite(value)
  ) {
    return '—';
  }

  return value.toFixed(digits);
}


function formatSigned(
  value: number | null | undefined,
  digits = 4,
): string {
  if (
    value === null ||
    value === undefined ||
    !Number.isFinite(value)
  ) {
    return '—';
  }

  return `${value >= 0 ? '+' : ''}${value.toFixed(digits)}`;
}


function MetricRow({
  label,
  value,
  unit = '',
  signed = false,
}: {
  label: string;
  value: number | null | undefined;
  unit?: string;
  signed?: boolean;
}) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        gap: 'var(--space-4)',
        padding: '8px 0',
        borderBottom:
          '1px solid rgba(255,255,255,0.05)',
      }}
    >
      <span
        style={{
          color:
            'var(--color-text-subtle)',
          fontSize: '0.8rem',
        }}
      >
        {label}
      </span>

      <span
        style={{
          color:
            'var(--color-text)',
          fontFamily:
            'var(--font-mono)',
          fontSize: '0.8rem',
          whiteSpace: 'nowrap',
        }}
      >
        {signed
          ? formatSigned(value)
          : formatNumber(value)}
        {unit}
      </span>
    </div>
  );
}


function SectionTitle({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className="label-scientific"
      style={{
        marginBottom:
          'var(--space-4)',
      }}
    >
      {children}
    </div>
  );
}


export function ValidatePage() {

  const [
    report,
    setReport,
  ] = useState<ValidationReportResponse | null>(
    null,
  );

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState<string | null>(null);


  // ================================================================
  // LOAD VALIDATION REPORT
  // ================================================================

  useEffect(() => {

    let cancelled = false;

    async function fetchReport() {

      try {

        setLoading(true);
        setError(null);

        console.log(
          '[VALIDATION] Loading validation report...'
        );

        const response =
          await api.getValidationReport();

        console.log(
          '[VALIDATION] Report response:',
          response,
        );

        if (cancelled) {
          return;
        }

        setReport(response);

      } catch (err) {

        console.error(
          '[VALIDATION] Failed to load report:',
          err,
        );

        if (!cancelled) {

          const message =
            err instanceof Error
              ? err.message
              : 'Unknown API error';

          setError(
            `Failed to load validation report. ${message}`,
          );
        }

      } finally {

        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchReport();

    return () => {
      cancelled = true;
    };

  }, []);


  // ================================================================
  // SORT DEPTHS
  // ================================================================

  const depthMetrics =
    useMemo<ValidationDepthMetrics[]>(
      () => {

        if (!report?.per_depth) {
          return [];
        }

        return [
          ...report.per_depth,
        ].sort(
          (a, b) =>
            a.depth - b.depth,
        );

      },
      [report],
    );


  // ================================================================
  // LOADING STATE
  // ================================================================

  if (loading) {

    return (
      <div
        style={{
          padding:
            'var(--space-6)',
          color:
            'var(--color-text-subtle)',
        }}
      >
        Loading independent validation report...
      </div>
    );
  }


  // ================================================================
  // ERROR STATE
  // ================================================================

  if (error || !report) {

    return (
      <div
        style={{
          padding:
            'var(--space-6)',
        }}
      >

        <Panel
          style={{
            border:
              '1px solid var(--color-danger)',
          }}
        >

          <div
            className="label-scientific"
            style={{
              color:
                'var(--color-danger)',
              marginBottom:
                'var(--space-3)',
            }}
          >
            VALIDATION REPORT UNAVAILABLE
          </div>

          <div
            style={{
              color:
                'var(--color-text-subtle)',
              fontSize:
                '0.875rem',
              lineHeight: 1.6,
            }}
          >
            {error ||
              'The validation report could not be loaded.'}
          </div>

          <div
            style={{
              marginTop:
                'var(--space-4)',
              padding:
                'var(--space-3)',
              background:
                'rgba(255,255,255,0.025)',
              border:
                '1px solid var(--color-border)',
              borderRadius:
                'var(--radius-sm)',
              fontFamily:
                'var(--font-mono)',
              fontSize:
                '0.72rem',
              color:
                'var(--color-text-subtle)',
            }}
          >
            API endpoint:
            <br />
            GET /api/validation/report
          </div>

        </Panel>

      </div>
    );
  }


  const antarbodh =
    report.antarbodh_vs_argo;

  const glorys =
    report.glorys_vs_argo;


  // ================================================================
  // MAIN PAGE
  // ================================================================

  return (
    <div
      style={{
        padding:
          'var(--space-6)',
        overflowY:
          'auto',
        height:
          '100%',
      }}
    >

      <div
        style={{
          maxWidth:
            '1400px',
          margin:
            '0 auto',
        }}
      >

        {/* ========================================================
            HEADER
        ======================================================== */}

        <div
          style={{
            marginBottom:
              'var(--space-8)',
          }}
        >

          <h1
            style={{
              margin: 0,
              fontSize: '1.5rem',
              letterSpacing: '0.05em',
              color:
                'var(--color-text)',
              marginBottom:
                'var(--space-2)',
            }}
          >
            INDEPENDENT SUBSURFACE VALIDATION
          </h1>

          <div
            style={{
              color:
                'var(--color-text-subtle)',
              fontSize:
                '0.875rem',
              maxWidth:
                '900px',
              lineHeight:
                1.6,
            }}
          >
            ANTARBODH is evaluated against
            independent ARGO temperature
            observations at matched locations
            and depths. GLORYS is shown as a
            same-observation reference benchmark.
          </div>

          <div
            style={{
              display:
                'flex',
              gap:
                'var(--space-3)',
              marginTop:
                'var(--space-4)',
              flexWrap:
                'wrap',
            }}
          >

            <div
              style={{
                padding:
                  '6px 10px',
                border:
                  '1px solid var(--color-border)',
                borderRadius:
                  'var(--radius-sm)',
                fontFamily:
                  'var(--font-mono)',
                fontSize:
                  '0.68rem',
                color:
                  'var(--color-text-subtle)',
              }}
            >
              INDEPENDENT OBSERVATION · ARGO
            </div>

            <div
              style={{
                padding:
                  '6px 10px',
                border:
                  '1px solid var(--color-border)',
                borderRadius:
                  'var(--radius-sm)',
                fontFamily:
                  'var(--font-mono)',
                fontSize:
                  '0.68rem',
                color:
                  'var(--color-text-subtle)',
              }}
            >
              REFERENCE · GLORYS
            </div>

            <div
              style={{
                padding:
                  '6px 10px',
                border:
                  '1px solid var(--color-teal)',
                borderRadius:
                  'var(--radius-sm)',
                fontFamily:
                  'var(--font-mono)',
                fontSize:
                  '0.68rem',
                color:
                  'var(--color-teal)',
              }}
            >
              SAME MATCHED SAMPLE
            </div>

          </div>

        </div>


        {/* ========================================================
            MATCHED SAMPLE
        ======================================================== */}

        <div
          style={{
            display:
              'grid',
            gridTemplateColumns:
              'repeat(3, minmax(0, 1fr))',
            gap:
              'var(--space-4)',
            marginBottom:
              'var(--space-6)',
          }}
        >

          <Panel>

            <SectionTitle>
              MATCHED OBSERVATIONS
            </SectionTitle>

            <div
              style={{
                fontFamily:
                  'var(--font-mono)',
                fontSize:
                  '1.5rem',
                color:
                  'var(--color-text)',
              }}
            >
              {report.sample
                .common_matched_observations
                .toLocaleString()}
            </div>

            <div
              style={{
                marginTop:
                  'var(--space-2)',
                color:
                  'var(--color-text-subtle)',
                fontSize:
                  '0.72rem',
              }}
            >
              Common matched temperature
              observations
            </div>

          </Panel>


          <Panel>

            <SectionTitle>
              MATCHED PROFILES
            </SectionTitle>

            <div
              style={{
                fontFamily:
                  'var(--font-mono)',
                fontSize:
                  '1.5rem',
                color:
                  'var(--color-text)',
              }}
            >
              {report.sample
                .matched_profiles
                .toLocaleString()}
            </div>

            <div
              style={{
                marginTop:
                  'var(--space-2)',
                color:
                  'var(--color-text-subtle)',
                fontSize:
                  '0.72rem',
              }}
            >
              Independent ARGO profiles
            </div>

          </Panel>


          <Panel>

            <SectionTitle>
              MATCHED FLOATS
            </SectionTitle>

            <div
              style={{
                fontFamily:
                  'var(--font-mono)',
                fontSize:
                  '1.5rem',
                color:
                  'var(--color-text)',
              }}
            >
              {report.sample
                .matched_floats
                .toLocaleString()}
            </div>

            <div
              style={{
                marginTop:
                  'var(--space-2)',
                color:
                  'var(--color-text-subtle)',
                fontSize:
                  '0.72rem',
              }}
            >
              Distinct ARGO platforms
            </div>

          </Panel>

        </div>


        {/* ========================================================
            OVERALL METRICS
        ======================================================== */}

        <div
          style={{
            display:
              'grid',
            gridTemplateColumns:
              'repeat(2, minmax(0, 1fr))',
            gap:
              'var(--space-6)',
            marginBottom:
              'var(--space-6)',
          }}
        >

          {/* ANTARBODH */}

          <Panel
            style={{
              border:
                '1px solid var(--color-teal)',
            }}
          >

            <div
              style={{
                display:
                  'flex',
                justifyContent:
                  'space-between',
                alignItems:
                  'center',
                marginBottom:
                  'var(--space-4)',
              }}
            >

              <div
                className="label-scientific"
                style={{
                  color:
                    'var(--color-teal)',
                }}
              >
                ANTARBODH vs ARGO
              </div>

              <div
                style={{
                  fontFamily:
                    'var(--font-mono)',
                  fontSize:
                    '0.65rem',
                  color:
                    'var(--color-text-subtle)',
                }}
              >
                MODEL
              </div>

            </div>

            <MetricRow
              label="RMSE"
              value={antarbodh.rmse}
              unit=" °C"
            />

            <MetricRow
              label="MAE"
              value={antarbodh.mae}
              unit=" °C"
            />

            <MetricRow
              label="BIAS"
              value={antarbodh.bias}
              unit=" °C"
              signed
            />

            <MetricRow
              label="CORRELATION"
              value={antarbodh.corr}
            />

          </Panel>


          {/* GLORYS */}

          <Panel>

            <div
              style={{
                display:
                  'flex',
                justifyContent:
                  'space-between',
                alignItems:
                  'center',
                marginBottom:
                  'var(--space-4)',
              }}
            >

              <div
                className="label-scientific"
              >
                GLORYS vs ARGO
              </div>

              <div
                style={{
                  fontFamily:
                    'var(--font-mono)',
                  fontSize:
                    '0.65rem',
                  color:
                    'var(--color-text-subtle)',
                }}
              >
                REFERENCE
              </div>

            </div>

            <MetricRow
              label="RMSE"
              value={glorys.rmse}
              unit=" °C"
            />

            <MetricRow
              label="MAE"
              value={glorys.mae}
              unit=" °C"
            />

            <MetricRow
              label="BIAS"
              value={glorys.bias}
              unit=" °C"
              signed
            />

            <MetricRow
              label="CORRELATION"
              value={glorys.corr}
            />

          </Panel>

        </div>


        {/* ========================================================
            QUICK METRIC INTERPRETATION
        ======================================================== */}

        <Panel
          style={{
            marginBottom:
              'var(--space-6)',
          }}
        >

          <SectionTitle>
            OVERALL VALIDATION METRICS
          </SectionTitle>

          <div
            style={{
              color:
                'var(--color-text-subtle)',
              fontSize:
                '0.8rem',
              lineHeight:
                1.65,
            }}
          >
            On the common matched observation
            sample, ANTARBODH records an overall
            RMSE of{' '}
            <strong
              style={{
                color:
                  'var(--color-text)',
              }}
            >
              {formatNumber(
                antarbodh.rmse,
                4,
              )} °C
            </strong>
            , MAE of{' '}
            <strong
              style={{
                color:
                  'var(--color-text)',
              }}
            >
              {formatNumber(
                antarbodh.mae,
                4,
              )} °C
            </strong>
            , bias of{' '}
            <strong
              style={{
                color:
                  'var(--color-text)',
              }}
            >
              {formatSigned(
                antarbodh.bias,
                4,
              )} °C
            </strong>
            , and Pearson correlation of{' '}
            <strong
              style={{
                color:
                  'var(--color-text)',
              }}
            >
              {formatNumber(
                antarbodh.corr,
                4,
              )}
            </strong>
            .
          </div>

          <div
            style={{
              marginTop:
                'var(--space-3)',
              color:
                'var(--color-text-subtle)',
              fontSize:
                '0.8rem',
              lineHeight:
                1.65,
            }}
          >
            For the same matched sample, the
            corresponding GLORYS reference metrics
            are RMSE{' '}
            <strong
              style={{
                color:
                  'var(--color-text)',
              }}
            >
              {formatNumber(
                glorys.rmse,
                4,
              )} °C
            </strong>
            , MAE{' '}
            <strong
              style={{
                color:
                  'var(--color-text)',
              }}
            >
              {formatNumber(
                glorys.mae,
                4,
              )} °C
            </strong>
            , bias{' '}
            <strong
              style={{
                color:
                  'var(--color-text)',
              }}
            >
              {formatSigned(
                glorys.bias,
                4,
              )} °C
            </strong>
            , and correlation{' '}
            <strong
              style={{
                color:
                  'var(--color-text)',
              }}
            >
              {formatNumber(
                glorys.corr,
                4,
              )}
            </strong>
            .
          </div>

        </Panel>


        {/* ========================================================
            DEPTH-RESOLVED CHARTS
        ======================================================== */}

        <Panel
          style={{
            marginBottom:
              'var(--space-6)',
          }}
        >

          <div
            style={{
              display:
                'flex',
              justifyContent:
                'space-between',
              alignItems:
                'flex-end',
              gap:
                'var(--space-4)',
              marginBottom:
                'var(--space-6)',
            }}
          >

            <div>

              <SectionTitle>
                DEPTH-RESOLVED VALIDATION
              </SectionTitle>

              <div
                style={{
                  color:
                    'var(--color-text-subtle)',
                  fontSize:
                    '0.78rem',
                  lineHeight:
                    1.5,
                }}
              >
                Error and correlation statistics
                across the 15 ANTARBODH target
                depths.
              </div>

            </div>

            <div
              style={{
                display:
                  'flex',
                gap:
                  'var(--space-5)',
                flexShrink:
                  0,
              }}
            >

              <div
                style={{
                  display:
                    'flex',
                  alignItems:
                    'center',
                  gap:
                    '8px',
                }}
              >

                <span
                  style={{
                    width:
                      '18px',
                    height:
                      '3px',
                    background:
                      'var(--color-teal)',
                    display:
                      'inline-block',
                  }}
                />

                <span
                  className="label-scientific"
                  style={{
                    fontSize:
                      '0.68rem',
                  }}
                >
                  ANTARBODH
                </span>

              </div>


              <div
                style={{
                  display:
                    'flex',
                  alignItems:
                    'center',
                  gap:
                    '8px',
                }}
              >

                <span
                  style={{
                    width:
                      '18px',
                    borderTop:
                      '2px dashed var(--color-text-subtle)',
                    display:
                      'inline-block',
                  }}
                />

                <span
                  className="label-scientific"
                  style={{
                    fontSize:
                      '0.68rem',
                    color:
                      'var(--color-text-subtle)',
                  }}
                >
                  GLORYS
                </span>

              </div>

            </div>

          </div>

          <ValidationCharts
            metrics={depthMetrics}
          />

        </Panel>


        {/* ========================================================
            DEPTH TABLE
        ======================================================== */}

        <Panel
          style={{
            marginBottom:
              'var(--space-6)',
            overflowX:
              'auto',
          }}
        >

          <SectionTitle>
            METRICS BY DEPTH
          </SectionTitle>

          <table
            style={{
              width:
                '100%',
              borderCollapse:
                'collapse',
              fontFamily:
                'var(--font-mono)',
              fontSize:
                '0.7rem',
            }}
          >

            <thead>

              <tr
                style={{
                  color:
                    'var(--color-text-subtle)',
                  borderBottom:
                    '1px solid var(--color-border)',
                  textAlign:
                    'right',
                }}
              >

                <th
                  style={{
                    padding:
                      '10px 8px',
                    textAlign:
                      'left',
                  }}
                >
                  DEPTH
                </th>

                <th
                  style={{
                    padding:
                      '10px 8px',
                  }}
                >
                  N
                </th>

                <th
                  style={{
                    padding:
                      '10px 8px',
                    color:
                      'var(--color-teal)',
                  }}
                >
                  A-RMSE
                </th>

                <th
                  style={{
                    padding:
                      '10px 8px',
                  }}
                >
                  G-RMSE
                </th>

                <th
                  style={{
                    padding:
                      '10px 8px',
                    color:
                      'var(--color-teal)',
                  }}
                >
                  A-MAE
                </th>

                <th
                  style={{
                    padding:
                      '10px 8px',
                  }}
                >
                  G-MAE
                </th>

                <th
                  style={{
                    padding:
                      '10px 8px',
                    color:
                      'var(--color-teal)',
                  }}
                >
                  A-BIAS
                </th>

                <th
                  style={{
                    padding:
                      '10px 8px',
                  }}
                >
                  G-BIAS
                </th>

                <th
                  style={{
                    padding:
                      '10px 8px',
                    color:
                      'var(--color-teal)',
                  }}
                >
                  A-R
                </th>

                <th
                  style={{
                    padding:
                      '10px 8px',
                  }}
                >
                  G-R
                </th>

              </tr>

            </thead>


            <tbody>

              {depthMetrics.map(
                (metric) => (

                  <tr
                    key={
                      metric.depth
                    }
                    style={{
                      borderBottom:
                        '1px solid rgba(255,255,255,0.04)',
                    }}
                  >

                    <td
                      style={{
                        padding:
                          '9px 8px',
                        textAlign:
                          'left',
                        color:
                          'var(--color-text)',
                      }}
                    >
                      {metric.depth} m
                    </td>

                    <td
                      style={{
                        padding:
                          '9px 8px',
                        textAlign:
                          'right',
                        color:
                          'var(--color-text-subtle)',
                      }}
                    >
                      {metric.n_obs.toLocaleString()}
                    </td>

                    <td
                      style={{
                        padding:
                          '9px 8px',
                        textAlign:
                          'right',
                        color:
                          'var(--color-teal)',
                      }}
                    >
                      {formatNumber(
                        metric.antarbodh_rmse,
                        3,
                      )}
                    </td>

                    <td
                      style={{
                        padding:
                          '9px 8px',
                        textAlign:
                          'right',
                        color:
                          'var(--color-text)',
                      }}
                    >
                      {formatNumber(
                        metric.glorys_rmse,
                        3,
                      )}
                    </td>

                    <td
                      style={{
                        padding:
                          '9px 8px',
                        textAlign:
                          'right',
                        color:
                          'var(--color-teal)',
                      }}
                    >
                      {formatNumber(
                        metric.antarbodh_mae,
                        3,
                      )}
                    </td>

                    <td
                      style={{
                        padding:
                          '9px 8px',
                        textAlign:
                          'right',
                        color:
                          'var(--color-text)',
                      }}
                    >
                      {formatNumber(
                        metric.glorys_mae,
                        3,
                      )}
                    </td>

                    <td
                      style={{
                        padding:
                          '9px 8px',
                        textAlign:
                          'right',
                        color:
                          'var(--color-teal)',
                      }}
                    >
                      {formatSigned(
                        metric.antarbodh_bias,
                        3,
                      )}
                    </td>

                    <td
                      style={{
                        padding:
                          '9px 8px',
                        textAlign:
                          'right',
                        color:
                          'var(--color-text)',
                      }}
                    >
                      {formatSigned(
                        metric.glorys_bias,
                        3,
                      )}
                    </td>

                    <td
                      style={{
                        padding:
                          '9px 8px',
                        textAlign:
                          'right',
                        color:
                          'var(--color-teal)',
                      }}
                    >
                      {formatNumber(
                        metric.antarbodh_corr,
                        3,
                      )}
                    </td>

                    <td
                      style={{
                        padding:
                          '9px 8px',
                        textAlign:
                          'right',
                        color:
                          'var(--color-text)',
                      }}
                    >
                      {formatNumber(
                        metric.glorys_corr,
                        3,
                      )}
                    </td>

                  </tr>

                )
              )}

            </tbody>

          </table>

        </Panel>


        {/* ========================================================
            METHODOLOGY
        ======================================================== */}

        <Panel
          style={{
            marginBottom:
              'var(--space-6)',
          }}
        >

          <SectionTitle>
            VALIDATION METHODOLOGY
          </SectionTitle>

          <div
            style={{
              display:
                'grid',
              gridTemplateColumns:
                'repeat(3, minmax(0, 1fr))',
              gap:
                'var(--space-6)',
            }}
          >

            <div>

              <div
                style={{
                  fontFamily:
                    'var(--font-mono)',
                  fontSize:
                    '0.72rem',
                  color:
                    'var(--color-text)',
                  marginBottom:
                    '6px',
                }}
              >
                01 · ARGO
              </div>

              <div
                style={{
                  color:
                    'var(--color-text-subtle)',
                  fontSize:
                    '0.75rem',
                  lineHeight:
                    1.55,
                }}
              >
                Independent in-situ temperature
                observations from ARGO profiles
                provide the observational reference.
              </div>

            </div>


            <div>

              <div
                style={{
                  fontFamily:
                    'var(--font-mono)',
                  fontSize:
                    '0.72rem',
                  color:
                    'var(--color-text)',
                  marginBottom:
                    '6px',
                }}
              >
                02 · MATCHING
              </div>

              <div
                style={{
                  color:
                    'var(--color-text-subtle)',
                  fontSize:
                    '0.75rem',
                  lineHeight:
                    1.55,
                }}
              >
                ANTARBODH and GLORYS are evaluated
                against the same matched ARGO
                observations.
              </div>

            </div>


            <div>

              <div
                style={{
                  fontFamily:
                    'var(--font-mono)',
                  fontSize:
                    '0.72rem',
                  color:
                    'var(--color-text)',
                  marginBottom:
                    '6px',
                }}
              >
                03 · DEPTH
              </div>

              <div
                style={{
                  color:
                    'var(--color-text-subtle)',
                  fontSize:
                    '0.75rem',
                  lineHeight:
                    1.55,
                }}
              >
                ANTARBODH predictions are compared
                at the observation depths represented
                in the validation procedure.
              </div>

            </div>

          </div>

        </Panel>


        {/* ========================================================
            PROVENANCE
        ======================================================== */}

        <Panel>

          <SectionTitle>
            DATA PROVENANCE
          </SectionTitle>

          <div
            style={{
              padding:
                'var(--space-4)',
              background:
                'rgba(6, 20, 29, 0.4)',
              border:
                '1px solid var(--color-border)',
              borderRadius:
                'var(--radius-sm)',
              color:
                'var(--color-text-subtle)',
              fontSize:
                '0.75rem',
              lineHeight:
                1.65,
            }}
          >
            <strong
              style={{
                color:
                  'var(--color-text)',
              }}
            >
              ANTARBODH
            </strong>
            {' '}
            reconstructs subsurface temperature
            from surface observations using the
            trained CNN model.
            <br />
            <br />

            <strong
              style={{
                color:
                  'var(--color-text)',
              }}
            >
              GLORYS
            </strong>
            {' '}
            provides the supervised
            training/reference field and is included
            here as a same-observation benchmark.
            <br />
            <br />

            <strong
              style={{
                color:
                  'var(--color-text)',
              }}
            >
              ARGO
            </strong>
            {' '}
            provides the independent observational
            validation reference.
          </div>

        </Panel>

      </div>

    </div>
  );
}