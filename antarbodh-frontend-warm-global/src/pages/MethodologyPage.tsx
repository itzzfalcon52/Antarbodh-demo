import { AnimatedSection } from '../components/ui/AnimatedSection';
import { TARGET_DEPTHS } from '../lib/constants';
import { depthFraction } from '../lib/depthScale';

import '../styles/methodology.css';

const PIPELINE = [
  {
    title: 'Surface observations',
    desc: 'Raw satellite and in-situ surface data for the chosen day.',
  },
  {
    title: 'Quality control and alignment',
    desc: 'Temporal and spatial synchronisation onto a common 0.25° grid.',
  },
  {
    title: 'Missingness-aware representation',
    desc: 'A 14-channel tensor: seven physical fields and a validity mask for each.',
  },
  {
    title: 'Antarbodh CNN v1',
    desc: 'Frozen PyTorch model, run for inference only.',
  },
  {
    title: 'Subsurface reconstruction',
    desc: 'Temperature at 15 standard depths, from the surface to 1,000 m.',
  },
];

// Each physical channel is paired with its validity mask.
const CHANNELS = [
  { field: 'Sea surface temperature', code: 'SST' },
  { field: 'Sea surface salinity', code: 'SSS' },
  { field: 'Sea surface height', code: 'SSH' },
  { field: 'Current, eastward', code: 'Current U' },
  { field: 'Current, northward', code: 'Current V' },
  { field: 'Wind, eastward', code: 'Wind U' },
  { field: 'Wind, northward', code: 'Wind V' },
];

const IDENTITY = [
  { label: 'Version', value: 'antarbodh_cnn_v1_sih2026' },
  { label: 'Domain', value: '5–20°N, 80–100°E' },
  { label: 'Resolution', value: '0.25° × 0.25°, daily' },
];

const GAUGE_LABELS = new Set([0, 10, 50, 100, 200, 500, 1000]);

/** The 15 target depths on the same stretched axis as the charts. */
function DepthGauge() {
  const height = 300;
  const top = 10;
  const plot = height - top * 2;

  return (
    <svg
      className="me-gauge"
      viewBox={`0 0 180 ${height}`}
      role="img"
      aria-label={`Fifteen target depths: ${TARGET_DEPTHS.join(', ')} metres.`}
    >
      <defs>
        <linearGradient id="me-gauge-spine" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#EE8A1E" />
          <stop offset="20%" stopColor="#F4B41A" />
          <stop offset="45%" stopColor="#D9602B" />
          <stop offset="70%" stopColor="#93406A" />
          <stop offset="100%" stopColor="#8C97E8" />
        </linearGradient>
      </defs>

      <rect x={40} y={top} width={4} height={plot} rx={2} fill="url(#me-gauge-spine)" />

      {TARGET_DEPTHS.map((d) => {
        const y = top + depthFraction(d) * plot;
        const labelled = GAUGE_LABELS.has(d);

        return (
          <g key={d}>
            <line x1={labelled ? 30 : 34} x2={50} y1={y} y2={y} className="me-gauge__tick" />
            <circle cx={42} cy={y} r={3.2} className="me-gauge__dot" />
            {labelled && (
              <text x={58} y={y + 4} className="me-gauge__label">
                {d.toLocaleString('en-IN')} m
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

export function MethodologyPage() {
  return (
    <div className="methodology-page neel-page">
      <div className="methodology-shell">

        {/* Header */}
        <AnimatedSection as="header" className="me-head">
          <p className="kicker" lang="hi">पद्धति</p>
          <h1 className="page-title">Seeing beneath the surface</h1>
          <p className="page-lede">
            How Antarbodh CNN v1 turns surface satellite observations
            into a reconstructed temperature field at depth.
          </p>
        </AnimatedSection>

        {/* Pipeline */}
        <AnimatedSection index={1} as="section" className="me-section">
          <h2 className="block-title">Reconstruction pipeline</h2>

          <ol className="me-pipeline">
            {PIPELINE.map(({ title, desc }, i) => (
              <li key={title} className="me-step">
                <span className="me-step__n">{i + 1}</span>
                <div>
                  <h3>{title}</h3>
                  <p>{desc}</p>
                </div>
              </li>
            ))}

            <li className="me-step me-step--check">
              <span className="me-step__n">✓</span>
              <div>
                <h3>Independent validation</h3>
                <p>Evaluated against Argo observations the model never saw.</p>
              </div>
            </li>
          </ol>

          <p className="me-note">
            <strong>GLORYS</strong> is the supervised training target.{' '}
            <strong>Argo</strong> and <strong>INCOIS</strong> are used
            strictly for independent validation. Neither Argo nor GLORYS
            is ever an input when a prediction is made.
          </p>
        </AnimatedSection>

        {/* Inputs and identity */}
        <AnimatedSection index={2} className="me-columns">
          <section className="surface me-card">
            <h2 className="block-title">
              Input channels
              <span className="badge badge--ocean">14</span>
            </h2>

            <table className="me-channels">
              <thead>
                <tr>
                  <th scope="col">Physical field</th>
                  <th scope="col">Validity mask</th>
                </tr>
              </thead>
              <tbody>
                {CHANNELS.map(({ field, code }, i) => (
                  <tr key={code}>
                    <td>
                      <span className="me-channels__n">{i + 1}</span>
                      {field}
                      <span className="me-channels__code">{code}</span>
                    </td>
                    <td>
                      <span className="me-channels__n">{i + 8}</span>
                      {code} mask
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <p className="me-callout">
              <strong>Handling missing data.</strong> Missing surface
              observations are represented explicitly through the masks.
              The model can work with missing inputs within the
              missingness it was shown in training; that does not mean
              any amount of missing data is scientifically safe.
            </p>
          </section>

          <section className="surface me-card">
            <h2 className="block-title">Model identity</h2>

            <dl className="me-identity">
              {IDENTITY.map(({ label, value }) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>

            <h3 className="me-subtitle">Target depths (15)</h3>
            <DepthGauge />
            <p className="me-gauge-note">
              Drawn on a stretched axis so the five upper-ocean levels
              stay visible.
            </p>
          </section>
        </AnimatedSection>

      </div>
    </div>
  );
}
