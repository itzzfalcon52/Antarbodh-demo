import { Panel } from '../components/ui/Panel';
import { ArrowDown } from 'lucide-react';

export function MethodologyPage() {
  const Step = ({ title, desc }: { title: string, desc: string }) => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ padding: 'var(--space-3) var(--space-6)', backgroundColor: 'rgba(6, 20, 29, 0.4)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', minWidth: '320px', textAlign: 'center' }}>
        <div className="label-scientific" style={{ color: 'var(--color-text)', marginBottom: 'var(--space-1)' }}>{title}</div>
        <div style={{ fontSize: '0.875rem', color: 'var(--color-text-subtle)' }}>{desc}</div>
      </div>
    </div>
  );

  return (
    <div style={{ padding: 'var(--space-6)', overflowY: 'auto', height: '100%' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        <h1 style={{ margin: 0, fontSize: '1.5rem', letterSpacing: '0.05em', color: 'var(--color-text)', marginBottom: 'var(--space-2)' }}>METHODOLOGY</h1>
        <div style={{ color: 'var(--color-text-subtle)', fontSize: '0.875rem', marginBottom: 'var(--space-8)' }}>
          The scientific architecture of the ANTARBODH CNN v1.
        </div>

        <Panel style={{ marginBottom: 'var(--space-6)' }}>
          <h2 className="label-scientific" style={{ fontSize: '1.25rem', marginBottom: 'var(--space-6)' }}>RECONSTRUCTION PIPELINE</h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-3)', margin: 'var(--space-6) 0' }}>
            <Step title="SURFACE OBSERVATIONS" desc="Raw satellite and in-situ surface data" />
            <ArrowDown size={20} color="var(--color-ocean-bright)" />
            <Step title="QC & ALIGNMENT" desc="Temporal and spatial synchronization" />
            <ArrowDown size={20} color="var(--color-ocean-bright)" />
            <Step title="MISSINGNESS-AWARE REPRESENTATION" desc="14-channel physical + mask tensor" />
            <ArrowDown size={20} color="var(--color-ocean-bright)" />
            <Step title="ANTARBODH CNN v1" desc="Frozen PyTorch Inference" />
            <ArrowDown size={20} color="var(--color-ocean-bright)" />
            <Step title="SUBSURFACE RECONSTRUCTION" desc="15-depth temperature profile" />
            <ArrowDown size={20} color="var(--color-teal)" />
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ padding: 'var(--space-3) var(--space-6)', backgroundColor: 'var(--color-deep)', border: '1px solid var(--color-teal)', borderRadius: 'var(--radius-sm)', minWidth: '320px', textAlign: 'center' }}>
                <div className="label-scientific" style={{ color: 'var(--color-teal)', marginBottom: 'var(--space-1)' }}>INDEPENDENT VALIDATION</div>
                <div style={{ fontSize: '0.875rem', color: 'var(--color-text-subtle)' }}>Evaluation against ARGO observations</div>
              </div>
            </div>
          </div>

          <div style={{ fontSize: '0.875rem', color: 'var(--color-text-subtle)', textAlign: 'center', marginTop: 'var(--space-6)', maxWidth: '600px', margin: '0 auto', lineHeight: 1.5 }}>
            <strong style={{ color: 'var(--color-text)' }}>Note:</strong> GLORYS is used as the supervised training target. ARGO and INCOIS are used strictly for independent validation. Neither ARGO nor GLORYS is used as an operational prediction input.
          </div>
        </Panel>

        <div style={{ display: 'flex', gap: 'var(--space-6)', marginBottom: 'var(--space-6)' }}>
          <Panel style={{ flex: 1 }}>
            <h2 className="label-scientific" style={{ fontSize: '1.25rem', marginBottom: 'var(--space-4)' }}>INPUT CHANNELS</h2>
            <div style={{ display: 'flex', gap: 'var(--space-6)' }}>
              <div style={{ flex: 1 }}>
                <div className="label-scientific" style={{ marginBottom: 'var(--space-2)', color: 'var(--color-ocean-bright)' }}>PHYSICAL (7)</div>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, color: 'var(--color-text)', fontSize: '0.875rem', lineHeight: 1.8, fontFamily: 'var(--font-mono)' }}>
                  <li>SST (Sea Surface Temperature)</li>
                  <li>SSS (Sea Surface Salinity)</li>
                  <li>SSH (Sea Surface Height)</li>
                  <li>Current U</li>
                  <li>Current V</li>
                  <li>Wind U</li>
                  <li>Wind V</li>
                </ul>
              </div>
              <div style={{ flex: 1 }}>
                <div className="label-scientific" style={{ marginBottom: 'var(--space-2)', color: 'var(--color-ocean-bright)' }}>MASKS (7)</div>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, color: 'var(--color-text-subtle)', fontSize: '0.875rem', lineHeight: 1.8, fontFamily: 'var(--font-mono)' }}>
                  <li>SST Mask</li>
                  <li>SSS Mask</li>
                  <li>SSH Mask</li>
                  <li>Current U Mask</li>
                  <li>Current V Mask</li>
                  <li>Wind U Mask</li>
                  <li>Wind V Mask</li>
                </ul>
              </div>
            </div>
            
            <div style={{ marginTop: 'var(--space-6)', padding: 'var(--space-4)', backgroundColor: 'rgba(6, 20, 29, 0.4)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', fontSize: '0.875rem', color: 'var(--color-text-subtle)', lineHeight: 1.5 }}>
              <strong style={{ color: 'var(--color-text)' }}>Handling Missingness:</strong> ANTARBODH explicitly represents missing surface observations through masks. The model can operate with missing inputs within the demonstrated missingness regime; this does not mean arbitrary missingness is scientifically guaranteed.
            </div>
          </Panel>

          <Panel style={{ width: '300px', flexShrink: 0 }}>
            <h2 className="label-scientific" style={{ fontSize: '1.25rem', marginBottom: 'var(--space-4)' }}>MODEL IDENTITY</h2>
            
            <div style={{ marginBottom: 'var(--space-4)' }}>
              <div className="label-scientific" style={{ color: 'var(--color-text-subtle)', fontSize: '0.75rem', marginBottom: '2px' }}>VERSION</div>
              <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text)', fontSize: '0.875rem' }}>antarbodh_cnn_v1_sih2026</div>
            </div>
            
            <div style={{ marginBottom: 'var(--space-4)' }}>
              <div className="label-scientific" style={{ color: 'var(--color-text-subtle)', fontSize: '0.75rem', marginBottom: '2px' }}>DOMAIN</div>
              <div style={{ color: 'var(--color-text)', fontSize: '0.875rem' }}>5–20°N, 80–100°E</div>
            </div>

            <div style={{ marginBottom: 'var(--space-4)' }}>
              <div className="label-scientific" style={{ color: 'var(--color-text-subtle)', fontSize: '0.75rem', marginBottom: '2px' }}>RESOLUTION</div>
              <div style={{ color: 'var(--color-text)', fontSize: '0.875rem' }}>0.25° × 0.25°</div>
            </div>

            <div>
              <div className="label-scientific" style={{ color: 'var(--color-text-subtle)', fontSize: '0.75rem', marginBottom: '2px' }}>TARGET DEPTHS (15)</div>
              <div style={{ color: 'var(--color-text)', fontFamily: 'var(--font-mono)', fontSize: '0.875rem', lineHeight: 1.6 }}>
                0, 5, 10, 20, 30, 50, 75, 100, 125, 150, 200, 300, 500, 700, 1000 m
              </div>
            </div>
          </Panel>
        </div>

      </div>
    </div>
  );
}
