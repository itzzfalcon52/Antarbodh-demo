import { Panel } from '../components/ui/Panel';
import { Badge } from '../components/ui/Badge';
import { SectionHeading } from '../components/ui/SectionHeading';
import { AnimatedSection } from '../components/ui/AnimatedSection';

const PIPELINE = [
  {
    step: '01',
    title: 'Surface observations',
    desc: 'Raw satellite and in-situ surface data',
  },
  {
    step: '02',
    title: 'QC & alignment',
    desc: 'Temporal and spatial synchronization',
  },
  {
    step: '03',
    title: 'Missingness-aware representation',
    desc: '14-channel physical + mask tensor',
  },
  {
    step: '04',
    title: 'ANTARBODH CNN v1',
    desc: 'Frozen PyTorch inference',
  },
  {
    step: '05',
    title: 'Subsurface reconstruction',
    desc: '15-depth temperature profile',
  },
];

const PHYSICAL_CHANNELS = [
  'SST — Sea Surface Temperature',
  'SSS — Sea Surface Salinity',
  'SSH — Sea Surface Height',
  'Current U',
  'Current V',
  'Wind U',
  'Wind V',
];

const MASK_CHANNELS = [
  'SST mask',
  'SSS mask',
  'SSH mask',
  'Current U mask',
  'Current V mask',
  'Wind U mask',
  'Wind V mask',
];

const IDENTITY = [
  { label: 'Version', value: 'antarbodh_cnn_v1_sih2026', mono: true },
  { label: 'Domain', value: '5–20°N, 80–100°E', mono: true },
  { label: 'Resolution', value: '0.25° × 0.25°', mono: true },
];

export function MethodologyPage() {
  return (
    <div className="methodology-page">
      <div className="methodology-shell">

        {/* ================================================== */}
        {/* Header                                             */}
        {/* ================================================== */}

        <AnimatedSection as="header" className="methodology-header">
          <div>
            <div className="label-scientific">Methodology</div>

            <h1
              className="display display--sm"
              style={{ marginTop: 'var(--space-3)' }}
            >
              Seeing beneath <em>the surface</em>
            </h1>
          </div>

          <p className="lede" style={{ margin: 0 }}>
            The scientific architecture of ANTARBODH CNN v1 —
            how surface satellite observations become a
            reconstructed temperature field at depth.
          </p>
        </AnimatedSection>

        {/* ================================================== */}
        {/* Pipeline                                           */}
        {/* ================================================== */}

        <AnimatedSection index={1} style={{ marginBottom: 'var(--space-10)' }}>
          <SectionHeading
            index="01"
            title="Reconstruction pipeline"
            rule
            style={{ marginBottom: 'var(--space-6)' }}
          />

          <div className="pipeline">
            {PIPELINE.map(({ step, title, desc }) => (
              <div key={step} className="pipeline-step">
                <span className="label-index">{step}</span>

                <div>
                  <div
                    className="label-scientific label-scientific--bright"
                    style={{ marginBottom: '5px' }}
                  >
                    {title}
                  </div>

                  <div
                    style={{
                      fontSize: '0.8rem',
                      lineHeight: 1.55,
                      color: 'var(--color-text-subtle)',
                    }}
                  >
                    {desc}
                  </div>
                </div>
              </div>
            ))}

            <div className="pipeline-step pipeline-step--terminal">
              <span className="label-index">06</span>

              <div>
                <div
                  className="label-scientific"
                  style={{
                    marginBottom: '5px',
                    color: 'var(--color-teal)',
                  }}
                >
                  Independent validation
                </div>

                <div
                  style={{
                    fontSize: '0.8rem',
                    lineHeight: 1.55,
                    color: 'var(--color-text-subtle)',
                  }}
                >
                  Evaluation against ARGO observations
                </div>
              </div>
            </div>
          </div>

          <p
            className="prose"
            style={{
              marginTop: 'var(--space-6)',
              paddingTop: 'var(--space-5)',
              borderTop: '1px solid var(--color-border-faint)',
              fontSize: '0.85rem',
            }}
          >
            <strong>Note:</strong> GLORYS is used as the supervised
            training target. ARGO and INCOIS are used strictly for
            independent validation. Neither ARGO nor GLORYS is used
            as an operational prediction input.
          </p>
        </AnimatedSection>

        {/* ================================================== */}
        {/* Inputs + identity                                  */}
        {/* ================================================== */}

        <AnimatedSection index={2} className="methodology-columns">
          <Panel style={{ padding: 'var(--space-6)' }}>
            <SectionHeading
              index="02"
              title="Input channels"
              trailing={<Badge variant="ocean">14</Badge>}
              rule
              style={{ marginBottom: 'var(--space-5)' }}
            />

            <div className="channel-columns">
              <div>
                <div
                  className="label-scientific label-scientific--accent"
                  style={{ marginBottom: 'var(--space-3)' }}
                >
                  Physical (7)
                </div>

                <ul className="channel-list">
                  {PHYSICAL_CHANNELS.map((channel, i) => (
                    <li key={channel}>
                      <span className="channel-index">
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <span style={{ color: 'var(--color-text)' }}>
                        {channel}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <div
                  className="label-scientific"
                  style={{ marginBottom: 'var(--space-3)' }}
                >
                  Masks (7)
                </div>

                <ul className="channel-list">
                  {MASK_CHANNELS.map((channel, i) => (
                    <li key={channel}>
                      <span className="channel-index">
                        {String(i + 8).padStart(2, '0')}
                      </span>
                      <span style={{ color: 'var(--color-text-subtle)' }}>
                        {channel}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div
              style={{
                marginTop: 'var(--space-6)',
                padding: 'var(--space-4) var(--space-5)',
                background: 'var(--surface-sunken)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border-faint)',
                borderLeft: '2px solid var(--color-ocean)',
                fontSize: '0.82rem',
                color: 'var(--color-text-muted)',
                lineHeight: 1.65,
              }}
            >
              <strong style={{ color: 'var(--color-text)' }}>
                Handling missingness:
              </strong>{' '}
              ANTARBODH explicitly represents missing surface
              observations through masks. The model can operate with
              missing inputs within the demonstrated missingness
              regime; this does not mean arbitrary missingness is
              scientifically guaranteed.
            </div>
          </Panel>

          <Panel style={{ padding: 'var(--space-6)', height: 'fit-content' }}>
            <SectionHeading
              index="03"
              title="Model identity"
              rule
              style={{ marginBottom: 'var(--space-5)' }}
            />

            {IDENTITY.map(({ label, value }) => (
              <div
                key={label}
                style={{
                  paddingBottom: 'var(--space-4)',
                  marginBottom: 'var(--space-4)',
                  borderBottom: '1px solid var(--color-border-faint)',
                }}
              >
                <div
                  className="label-scientific"
                  style={{ fontSize: '0.5625rem', marginBottom: '5px' }}
                >
                  {label}
                </div>

                <div
                  className="data-numeric"
                  style={{ fontSize: '0.82rem', wordBreak: 'break-word' }}
                >
                  {value}
                </div>
              </div>
            ))}

            <div>
              <div
                className="label-scientific"
                style={{ fontSize: '0.5625rem', marginBottom: 'var(--space-2)' }}
              >
                Target depths (15)
              </div>

              <div
                className="data-numeric"
                style={{ fontSize: '0.8rem', lineHeight: 1.75 }}
              >
                0, 5, 10, 20, 30, 50, 75, 100, 125, 150, 200, 300,
                500, 700, 1000 m
              </div>

              {/* Depth scale — decorative representation of the
                  target levels above. */}
              <div
                aria-hidden="true"
                style={{
                  marginTop: 'var(--space-4)',
                  height: '4px',
                  borderRadius: 'var(--radius-full)',
                  background: 'linear-gradient(90deg, var(--depth-upper), var(--depth-thermocline) 45%, var(--depth-deep))',
                  opacity: 0.7,
                }}
              />

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginTop: '5px',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.6rem',
                  color: 'var(--color-text-faint)',
                }}
              >
                <span>0 m</span>
                <span>1000 m</span>
              </div>
            </div>
          </Panel>
        </AnimatedSection>

      </div>
    </div>
  );
}
