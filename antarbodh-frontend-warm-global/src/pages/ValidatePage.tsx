import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import { LoadingState } from '../components/ui/LoadingState';
import { ErrorState } from '../components/ui/ErrorState';
import { ValidationCharts } from '../components/validate/ValidationCharts';

import { api } from '../api/endpoints';

import type {
  ValidationDepthMetrics,
  ValidationOverallMetrics,
  ValidationReportResponse,
} from '../types/api';

import '../styles/validate.css';


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

  return `${value >= 0 ? '+' : '−'}${Math.abs(value).toFixed(digits)}`;
}


/** The report calls it `correlation`; older reports used `corr`. */
function overallCorrelation(m: ValidationOverallMetrics): number {
  return m.correlation ?? m.corr ?? Number.NaN;
}


type MetricKey = 'rmse' | 'mae' | 'bias' | 'corr';
type Winner = 'a' | 'g' | 'tie';

/** Which of two scores is better for a metric (no new statistics). */
function better(metric: MetricKey, a: number, g: number): Winner {
  if (!Number.isFinite(a) || !Number.isFinite(g) || a === g) return 'tie';

  if (metric === 'corr') return a > g ? 'a' : 'g';
  if (metric === 'bias') return Math.abs(a) < Math.abs(g) ? 'a' : 'g';
  return a < g ? 'a' : 'g';
}


const METRICS: {
  key: MetricKey;
  name: string;
  rule: string;
  phrase: string;
  unit: string;
  signed?: boolean;
}[] = [
  { key: 'rmse', name: 'RMSE', rule: 'Lower is better', phrase: 'lower RMSE', unit: ' °C' },
  { key: 'mae', name: 'MAE', rule: 'Lower is better', phrase: 'lower MAE', unit: ' °C' },
  { key: 'bias', name: 'Bias', rule: 'Closer to zero is better', phrase: 'smaller bias', unit: ' °C', signed: true },
  { key: 'corr', name: 'Correlation', rule: 'Higher is better', phrase: 'higher correlation', unit: '' },
];


function joinPhrases(parts: string[]): string {
  if (parts.length <= 1) return parts.join('');
  return `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
}


function joinDepths(depths: number[]): string {
  const labels = depths.map((d) => d.toLocaleString('en-IN'));
  return `${joinPhrases(labels)} m`;
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

  const [activeDepth, setActiveDepth] =
    useState<number | null>(null);


  // ================================================================
  // LOAD VALIDATION REPORT
  // ================================================================

  useEffect(() => {

    let cancelled = false;

    async function fetchReport() {

      try {

        setLoading(true);
        setError(null);

        const response =
          await api.getValidationReport();

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
  // LOADING / ERROR
  // ================================================================

  if (loading) {
    return (
      <div className="validate-page neel-page">
        <div className="va-centre">
          <LoadingState
            message="Loading the validation report"
            detail="Matching Antarbodh and GLORYS against independent Argo observations."
          />
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="validate-page neel-page">
        <div className="validate-shell">
          <div className="surface va-error">
            <ErrorState
              title="Validation report unavailable"
              message={
                error ||
                'The validation report could not be loaded.'
              }
            />
            <p className="va-error__endpoint">
              Requested from <code>GET /api/validation/report</code>.
              Check that the backend is running.
            </p>
          </div>
        </div>
      </div>
    );
  }


  const antarbodh = report.antarbodh_vs_argo;
  const glorys = report.glorys_vs_argo;

  const overall: Record<MetricKey, { a: number; g: number }> = {
    rmse: { a: antarbodh.rmse, g: glorys.rmse },
    mae: { a: antarbodh.mae, g: glorys.mae },
    bias: { a: antarbodh.bias, g: glorys.bias },
    corr: { a: overallCorrelation(antarbodh), g: overallCorrelation(glorys) },
  };

  const winners = METRICS.map((m) => ({
    ...m,
    ...overall[m.key],
    winner: better(m.key, overall[m.key].a, overall[m.key].g),
  }));

  const gloryBetter = winners.filter((m) => m.winner === 'g').map((m) => m.phrase);
  const antarbodhBetter = winners.filter((m) => m.winner === 'a').map((m) => m.phrase);

  const lowerRmseDepths = depthMetrics
    .filter((m) => better('rmse', m.antarbodh_rmse, m.glorys_rmse) === 'a')
    .map((m) => m.depth);

  const sample = report.sample;


  // ================================================================
  // MAIN PAGE
  // ================================================================

  return (
    <div className="validate-page neel-page">
      <div className="validate-shell">

        {/* HEADER */}
        <header className="va-head ab-rise">
          <p className="kicker" lang="hi">सत्यापन</p>
          <h1 className="page-title">Independent validation</h1>
          <p className="page-lede">
            Antarbodh is compared with independent Argo float
            measurements at matched places, dates and depths. GLORYS,
            the reanalysis Antarbodh learned from, is scored on exactly
            the same observations as a reference.
          </p>
          {(report.period || report.argo_source) && (
            <p className="va-head__source">
              {[report.period, report.argo_source].filter(Boolean).join(' · ')}
            </p>
          )}
        </header>


        {/* MATCHED SAMPLE */}
        <section className="va-sample ab-rise" aria-label="Matched sample">
          <div>
            <p className="va-sample__value">
              {sample.common_matched_observations.toLocaleString('en-IN')}
            </p>
            <p className="va-sample__label">
              matched temperature observations
            </p>
          </div>
          <div>
            <p className="va-sample__value">
              {sample.matched_profiles.toLocaleString('en-IN')}
            </p>
            <p className="va-sample__label">independent Argo profiles</p>
          </div>
          <div>
            <p className="va-sample__value">
              {sample.matched_floats.toLocaleString('en-IN')}
            </p>
            <p className="va-sample__label">distinct Argo floats</p>
          </div>
        </section>


        {/* OVERALL SCORES */}
        <section className="surface va-block ab-rise">
          <h2 className="block-title">
            Overall scores
            <small>Same matched sample for both</small>
          </h2>

          <table className="va-scores">
            <thead>
              <tr>
                <th scope="col">Metric</th>
                <th scope="col" className="is-a">Antarbodh</th>
                <th scope="col" className="is-g">GLORYS</th>
              </tr>
            </thead>
            <tbody>
              {winners.map(({ key, name, rule, unit, signed, a, g, winner }) => (
                <tr key={key}>
                  <th scope="row">
                    {name}
                    <span>{rule}</span>
                  </th>
                  <td className="is-a" data-better={winner === 'a'}>
                    {signed ? formatSigned(a, 3) : formatNumber(a, key === 'corr' ? 4 : 3)}
                    <span className="va-scores__unit">{unit}</span>
                  </td>
                  <td className="is-g" data-better={winner === 'g'}>
                    {signed ? formatSigned(g, 3) : formatNumber(g, key === 'corr' ? 4 : 3)}
                    <span className="va-scores__unit">{unit}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <p className="va-summary">
            {gloryBetter.length > 0 && (
              <>On this sample, GLORYS has the {joinPhrases(gloryBetter)}</>
            )}
            {gloryBetter.length > 0 && antarbodhBetter.length > 0 && '; '}
            {antarbodhBetter.length > 0 && (
              <>
                {gloryBetter.length === 0 ? 'On this sample, ' : ''}
                Antarbodh has the {joinPhrases(antarbodhBetter)}
              </>
            )}
            {(gloryBetter.length > 0 || antarbodhBetter.length > 0) && '. '}
            The marked value in each row is the better of the two.
          </p>
        </section>


        {/* BY DEPTH */}
        <section className="surface va-block ab-rise">
          <h2 className="block-title">
            By depth
            <small>Hover a chart to compare one depth</small>
          </h2>

          <div className="va-legend">
            <span className="va-legend__item">
              <span aria-hidden="true" className="va-legend__swatch va-legend__swatch--a" />
              Antarbodh (A)
            </span>
            <span className="va-legend__item">
              <span aria-hidden="true" className="va-legend__swatch va-legend__swatch--g" />
              GLORYS reference (G)
            </span>
            {lowerRmseDepths.length > 0 && (
              <span className="va-legend__note">
                Antarbodh&rsquo;s RMSE is lower than GLORYS&rsquo;s at{' '}
                {lowerRmseDepths.length === depthMetrics.length
                  ? 'every depth'
                  : joinDepths(lowerRmseDepths)}
                .
              </span>
            )}
          </div>

          <ValidationCharts
            metrics={depthMetrics}
            activeDepth={activeDepth}
            onActiveDepthChange={setActiveDepth}
          />
        </section>


        {/* DEPTH TABLE */}
        <section className="surface va-block ab-rise">
          <h2 className="block-title">
            Metrics by depth
            <small>A = Antarbodh, G = GLORYS</small>
          </h2>

          <div className="table-scroll">
            <table className="data-table data-table--metrics va-table">
              <thead>
                <tr>
                  <th scope="col" className="is-left">Depth</th>
                  <th scope="col">Observations</th>
                  <th scope="col" className="is-model">A RMSE</th>
                  <th scope="col">G RMSE</th>
                  <th scope="col" className="is-model">A MAE</th>
                  <th scope="col">G MAE</th>
                  <th scope="col" className="is-model">A bias</th>
                  <th scope="col">G bias</th>
                  <th scope="col" className="is-model">A r</th>
                  <th scope="col">G r</th>
                </tr>
              </thead>

              <tbody>
                {depthMetrics.map((metric) => {
                  const rmse = better('rmse', metric.antarbodh_rmse, metric.glorys_rmse);
                  const mae = better('mae', metric.antarbodh_mae, metric.glorys_mae);
                  const bias = better('bias', metric.antarbodh_bias, metric.glorys_bias);
                  const corr = better('corr', metric.antarbodh_corr, metric.glorys_corr);

                  return (
                    <tr
                      key={metric.depth}
                      data-active={metric.depth === activeDepth}
                      onMouseEnter={() => setActiveDepth(metric.depth)}
                      onMouseLeave={() => setActiveDepth(null)}
                    >
                      <th scope="row" className="is-left is-depth">
                        {metric.depth.toLocaleString('en-IN')}
                        <span className="unit"> m</span>
                      </th>
                      <td className="is-count">{metric.n_obs.toLocaleString('en-IN')}</td>
                      <td className="is-model" data-better={rmse === 'a'}>{formatNumber(metric.antarbodh_rmse, 3)}</td>
                      <td data-better={rmse === 'g'}>{formatNumber(metric.glorys_rmse, 3)}</td>
                      <td className="is-model" data-better={mae === 'a'}>{formatNumber(metric.antarbodh_mae, 3)}</td>
                      <td data-better={mae === 'g'}>{formatNumber(metric.glorys_mae, 3)}</td>
                      <td className="is-model" data-better={bias === 'a'}>{formatSigned(metric.antarbodh_bias, 3)}</td>
                      <td data-better={bias === 'g'}>{formatSigned(metric.glorys_bias, 3)}</td>
                      <td className="is-model" data-better={corr === 'a'}>{formatNumber(metric.antarbodh_corr, 3)}</td>
                      <td data-better={corr === 'g'}>{formatNumber(metric.glorys_corr, 3)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <p className="va-footnote">
            In each pair, the better value is shown brighter with a dot.
          </p>
        </section>


        {/* METHOD */}
        <section className="va-method ab-rise">
          <h2 className="block-title">How the check works</h2>

          <ol className="va-steps">
            <li>
              <span className="va-steps__n">1</span>
              <h3>Argo as ground truth</h3>
              <p>
                Independent temperature profiles from Argo floats provide
                the observed reference. Argo is never a model input.
              </p>
            </li>
            <li>
              <span className="va-steps__n">2</span>
              <h3>Same observations for both</h3>
              <p>
                Antarbodh and GLORYS are scored against exactly the same
                matched Argo observations, so the comparison is fair.
              </p>
            </li>
            <li>
              <span className="va-steps__n">3</span>
              <h3>Depth by depth</h3>
              <p>
                Reconstructions are compared at the observation depths
                used in the validation procedure, then summarised per
                standard depth.
              </p>
            </li>
          </ol>
        </section>


        {/* PROVENANCE */}
        <section className="surface va-block ab-rise">
          <h2 className="block-title">Where the data comes from</h2>

          <dl className="va-sources">
            <div>
              <dt>Antarbodh</dt>
              <dd>
                Reconstructs subsurface temperature from surface
                observations using the trained CNN model.
              </dd>
            </div>
            <div>
              <dt>GLORYS</dt>
              <dd>
                The supervised training and reference field, included
                here as a same-observation benchmark.
              </dd>
            </div>
            <div>
              <dt>Argo</dt>
              <dd>
                The independent observational validation reference.
              </dd>
            </div>
          </dl>
        </section>

      </div>
    </div>
  );
}
