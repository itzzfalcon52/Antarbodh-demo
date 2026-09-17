import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import { Panel } from '../components/ui/Panel';
import { Badge } from '../components/ui/Badge';
import { MetricCard } from '../components/ui/MetricCard';
import { SectionHeading } from '../components/ui/SectionHeading';
import { LoadingState } from '../components/ui/LoadingState';
import { ErrorState } from '../components/ui/ErrorState';
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
        padding: '10px 0',
        borderBottom:
          '1px solid var(--color-border-faint)',
      }}
    >
      <span
        className="label-scientific"
        style={{ fontSize: '0.5875rem' }}
      >
        {label}
      </span>

      <span
        className="data-numeric"
        style={{
          color:
            'var(--color-text)',
          fontSize: '0.9rem',
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
      className="label-scientific label-scientific--bright"
      style={{
        marginBottom: 'var(--space-4)',
        paddingBottom: 'var(--space-3)',
        borderBottom: '1px solid var(--color-border-faint)',
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
      <div className="validate-page">
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '60vh',
          }}
        >
          <LoadingState
            message="Loading validation report"
            detail="Matching ANTARBODH and GLORYS against independent ARGO observations."
          />
        </div>
      </div>
    );
  }


  // ================================================================
  // ERROR STATE
  // ================================================================

  if (error || !report) {

    return (
      <div className="validate-page">
        <div className="validate-shell">
          <Panel
            style={{
              borderColor: 'rgba(226, 91, 91, 0.3)',
              borderLeftWidth: '2px',
              borderLeftColor: 'var(--color-danger)',
              padding: 'var(--space-6)',
            }}
          >
            <ErrorState
              title="Validation report unavailable"
              message={
                error ||
                'The validation report could not be loaded.'
              }
            />

            <div
              style={{
                marginTop: 'var(--space-5)',
                padding: 'var(--space-3) var(--space-4)',
                background: 'var(--surface-sunken)',
                border: '1px solid var(--color-border-faint)',
                borderRadius: 'var(--radius-md)',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.7rem',
                lineHeight: 1.7,
                color: 'var(--color-text-faint)',
                textAlign: 'center',
              }}
            >
              API endpoint
              <br />
              GET /api/validation/report
            </div>
          </Panel>
        </div>
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
    <div className="validate-page">

      <div className="validate-shell">

        {/* ========================================================
            HEADER
        ======================================================== */}

        <header className="validate-header ab-rise">

          <div className="label-scientific">
            Validation
          </div>

          <h1 className="display display--sm">
            Independent subsurface <em>validation</em>
          </h1>

          <p className="lede" style={{ marginTop: 'var(--space-4)' }}>
            ANTARBODH is evaluated against independent ARGO
            temperature observations at matched locations and
            depths. GLORYS is shown as a same-observation
            reference benchmark.
          </p>

          <div
            style={{
              display: 'flex',
              gap: 'var(--space-2)',
              marginTop: 'var(--space-5)',
              flexWrap: 'wrap',
            }}
          >
            <Badge dot>Independent observation · ARGO</Badge>
            <Badge dot>Reference · GLORYS</Badge>
            <Badge variant="ocean" dot>Same matched sample</Badge>
          </div>

        </header>


        {/* ========================================================
            MATCHED SAMPLE
        ======================================================== */}

        <Panel
          className="ab-rise"
          style={{
            marginBottom: 'var(--space-6)',
            padding: 'var(--space-5) var(--space-6)',
          }}
        >
          <SectionHeading
            index="01"
            title="Matched sample"
            rule
            style={{ marginBottom: 'var(--space-5)' }}
          />

          <div className="metric-strip">
            <MetricCard
              label="Matched observations"
              value={report.sample
                .common_matched_observations
                .toLocaleString()}
              note="Common matched temperature observations"
            />

            <MetricCard
              label="Matched profiles"
              value={report.sample
                .matched_profiles
                .toLocaleString()}
              note="Independent ARGO profiles"
            />

            <MetricCard
              label="Matched floats"
              value={report.sample
                .matched_floats
                .toLocaleString()}
              note="Distinct ARGO platforms"
            />
          </div>
        </Panel>


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
            className="ab-rise"
            style={{
              borderColor: 'rgba(43, 174, 158, 0.32)',
              borderLeftWidth: '2px',
              borderLeftColor: 'var(--color-teal)',
              padding: 'var(--space-5) var(--space-6)',
            }}
          >

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                gap: 'var(--space-3)',
                marginBottom: 'var(--space-4)',
                paddingBottom: 'var(--space-3)',
                borderBottom: '1px solid var(--color-border-faint)',
              }}
            >

              <div
                className="label-scientific"
                style={{ color: 'var(--color-teal)' }}
              >
                ANTARBODH vs ARGO
              </div>

              <Badge variant="default">Model</Badge>

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

          <Panel
            className="ab-rise"
            style={{ padding: 'var(--space-5) var(--space-6)' }}
          >

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                gap: 'var(--space-3)',
                marginBottom: 'var(--space-4)',
                paddingBottom: 'var(--space-3)',
                borderBottom: '1px solid var(--color-border-faint)',
              }}
            >

              <div className="label-scientific">
                GLORYS vs ARGO
              </div>

              <Badge variant="default">Reference</Badge>

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
          className="ab-rise"
          style={{
            marginBottom: 'var(--space-6)',
            padding: 'var(--space-5) var(--space-6)',
          }}
        >

          <SectionHeading
            index="04"
            title="Metrics by depth"
            description="A· = ANTARBODH, G· = GLORYS, evaluated on the same matched ARGO sample."
            rule
            style={{ marginBottom: 'var(--space-5)' }}
          />

          <div className="table-scroll">
            <table className="data-table data-table--metrics">

              <thead>
                <tr>
                  <th scope="col" className="is-left">Depth</th>
                  <th scope="col">N</th>
                  <th scope="col" className="is-model">A-RMSE</th>
                  <th scope="col">G-RMSE</th>
                  <th scope="col" className="is-model">A-MAE</th>
                  <th scope="col">G-MAE</th>
                  <th scope="col" className="is-model">A-BIAS</th>
                  <th scope="col">G-BIAS</th>
                  <th scope="col" className="is-model">A-R</th>
                  <th scope="col">G-R</th>
                </tr>
              </thead>

              <tbody>
                {depthMetrics.map(
                  (metric) => (

                    <tr key={metric.depth}>

                      <th scope="row" className="is-left is-depth">
                        {metric.depth}
                        <span className="unit"> m</span>
                      </th>

                      <td className="is-count">
                        {metric.n_obs.toLocaleString()}
                      </td>

                      <td className="is-model">
                        {formatNumber(
                          metric.antarbodh_rmse,
                          3,
                        )}
                      </td>

                      <td>
                        {formatNumber(
                          metric.glorys_rmse,
                          3,
                        )}
                      </td>

                      <td className="is-model">
                        {formatNumber(
                          metric.antarbodh_mae,
                          3,
                        )}
                      </td>

                      <td>
                        {formatNumber(
                          metric.glorys_mae,
                          3,
                        )}
                      </td>

                      <td className="is-model">
                        {formatSigned(
                          metric.antarbodh_bias,
                          3,
                        )}
                      </td>

                      <td>
                        {formatSigned(
                          metric.glorys_bias,
                          3,
                        )}
                      </td>

                      <td className="is-model">
                        {formatNumber(
                          metric.antarbodh_corr,
                          3,
                        )}
                      </td>

                      <td>
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
          </div>

        </Panel>


        {/* ========================================================
            METHODOLOGY
        ======================================================== */}

        <Panel
          className="ab-rise"
          style={{
            marginBottom: 'var(--space-6)',
            padding: 'var(--space-5) var(--space-6)',
          }}
        >

          <SectionHeading
            index="05"
            title="Validation methodology"
            rule
            style={{ marginBottom: 'var(--space-5)' }}
          />

          <div className="method-steps">

            {[
              {
                step: '01',
                title: 'ARGO',
                body:
                  'Independent in-situ temperature observations from ARGO profiles provide the observational reference.',
              },
              {
                step: '02',
                title: 'Matching',
                body:
                  'ANTARBODH and GLORYS are evaluated against the same matched ARGO observations.',
              },
              {
                step: '03',
                title: 'Depth',
                body:
                  'ANTARBODH predictions are compared at the observation depths represented in the validation procedure.',
              },
            ].map(({ step, title, body }) => (

              <div key={step} className="method-step">

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'baseline',
                    gap: 'var(--space-3)',
                    marginBottom: 'var(--space-2)',
                  }}
                >
                  <span className="label-index">{step}</span>

                  <span className="label-scientific label-scientific--bright">
                    {title}
                  </span>
                </div>

                <div
                  style={{
                    color: 'var(--color-text-subtle)',
                    fontSize: '0.8rem',
                    lineHeight: 1.65,
                  }}
                >
                  {body}
                </div>

              </div>

            ))}

          </div>

        </Panel>


        {/* ========================================================
            PROVENANCE
        ======================================================== */}

        <Panel
          className="ab-rise"
          style={{ padding: 'var(--space-5) var(--space-6)' }}
        >

          <SectionHeading
            index="06"
            title="Data provenance"
            rule
            style={{ marginBottom: 'var(--space-5)' }}
          />

          <div
            style={{
              padding: 'var(--space-5)',
              background: 'var(--surface-sunken)',
              border: '1px solid var(--color-border-faint)',
              borderLeft: '2px solid var(--color-ocean)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--color-text-muted)',
              fontSize: '0.8rem',
              lineHeight: 1.7,
              maxWidth: '78ch',
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