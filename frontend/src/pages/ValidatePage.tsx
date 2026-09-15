import { useState, useEffect } from 'react';
import { Panel } from '../components/ui/Panel';
import { ValidationCharts } from '../components/validate/ValidationCharts';
import { api } from '../api/endpoints';
import type { ValidationReportResponse } from '../types/api';

export function ValidatePage() {
  const [report, setReport] = useState<ValidationReportResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const res = await api.getValidationReport();
        setReport(res);
      } catch (err) {
        console.error(err);
        setError('Failed to load validation report.');
      } finally {
        setLoading(false);
      }
    };
    fetchReport();
  }, []);

  if (loading) return <div style={{ padding: 'var(--space-6)', color: 'var(--color-text-subtle)' }}>Loading validation report...</div>;
  if (error || !report) return <div style={{ padding: 'var(--space-6)', color: 'var(--color-danger)' }}>{error}</div>;

  return (
    <div style={{ padding: 'var(--space-6)', overflowY: 'auto', height: '100%' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        
        <h1 style={{ margin: 0, fontSize: '1.5rem', letterSpacing: '0.05em', color: 'var(--color-text)', marginBottom: 'var(--space-2)' }}>
          INDEPENDENT SUBSURFACE VALIDATION
        </h1>
        <div style={{ color: 'var(--color-text-subtle)', fontSize: '0.875rem', marginBottom: 'var(--space-8)', maxWidth: '800px', lineHeight: 1.5 }}>
          ANTARBODH is evaluated against independent ARGO observations at the observation's actual location and depth. 
          GLORYS is shown as a same-observation reference benchmark.
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-6)', marginBottom: 'var(--space-6)' }}>
          {/* Matched Sample */}
          <Panel style={{ flex: 1 }}>
            <div className="label-scientific" style={{ marginBottom: 'var(--space-4)' }}>MATCHED SAMPLE</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-subtle)', fontSize: '0.875rem' }}>Observations</span>
                <span style={{ color: 'var(--color-text)', fontFamily: 'var(--font-mono)' }}>{report.sample.common_matched_observations.toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-subtle)', fontSize: '0.875rem' }}>Profiles</span>
                <span style={{ color: 'var(--color-text)', fontFamily: 'var(--font-mono)' }}>{report.sample.matched_profiles.toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-subtle)', fontSize: '0.875rem' }}>Floats</span>
                <span style={{ color: 'var(--color-text)', fontFamily: 'var(--font-mono)' }}>{report.sample.matched_floats.toLocaleString()}</span>
              </div>
            </div>
          </Panel>

          {/* ANTARBODH */}
          <Panel style={{ flex: 1, border: '1px solid var(--color-teal)' }}>
            <div className="label-scientific" style={{ marginBottom: 'var(--space-4)', color: 'var(--color-teal)' }}>ANTARBODH vs ARGO</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-subtle)', fontSize: '0.875rem' }}>RMSE</span>
                <span style={{ color: 'var(--color-text)', fontFamily: 'var(--font-mono)' }}>{report.antarbodh_vs_argo.rmse.toFixed(4)} °C</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-subtle)', fontSize: '0.875rem' }}>MAE</span>
                <span style={{ color: 'var(--color-text)', fontFamily: 'var(--font-mono)' }}>{report.antarbodh_vs_argo.mae.toFixed(4)} °C</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-subtle)', fontSize: '0.875rem' }}>Bias</span>
                <span style={{ color: 'var(--color-text)', fontFamily: 'var(--font-mono)' }}>{report.antarbodh_vs_argo.bias > 0 ? '+' : ''}{report.antarbodh_vs_argo.bias.toFixed(4)} °C</span>
              </div>
            </div>
          </Panel>

          {/* GLORYS */}
          <Panel style={{ flex: 1 }}>
            <div className="label-scientific" style={{ marginBottom: 'var(--space-4)' }}>GLORYS vs ARGO</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-subtle)', fontSize: '0.875rem' }}>RMSE</span>
                <span style={{ color: 'var(--color-text)', fontFamily: 'var(--font-mono)' }}>{report.glorys_vs_argo.rmse.toFixed(4)} °C</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-subtle)', fontSize: '0.875rem' }}>MAE</span>
                <span style={{ color: 'var(--color-text)', fontFamily: 'var(--font-mono)' }}>{report.glorys_vs_argo.mae.toFixed(4)} °C</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-subtle)', fontSize: '0.875rem' }}>Bias</span>
                <span style={{ color: 'var(--color-text)', fontFamily: 'var(--font-mono)' }}>{report.glorys_vs_argo.bias > 0 ? '+' : ''}{report.glorys_vs_argo.bias.toFixed(4)} °C</span>
              </div>
            </div>
          </Panel>
        </div>

        <div style={{ marginBottom: 'var(--space-8)', padding: 'var(--space-4)', backgroundColor: 'rgba(6, 20, 29, 0.4)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', fontSize: '0.875rem', color: 'var(--color-text-subtle)', lineHeight: 1.5 }}>
          <strong style={{ color: 'var(--color-text)' }}>Benchmark Summary:</strong> On this matched observation sample, GLORYS exhibits lower overall RMSE and MAE. ANTARBODH achieves lower overall bias, and as seen below, outperforms GLORYS in RMSE at deeper vertical layers (300–1000 m).
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-6)', marginBottom: 'var(--space-6)' }}>
          {/* Charts */}
          <Panel style={{ flex: 2 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-6)', marginBottom: 'var(--space-6)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <div style={{ width: '12px', height: '3px', backgroundColor: 'var(--color-teal)' }}></div>
                <span className="label-scientific" style={{ color: 'var(--color-text)', fontSize: '0.875rem' }}>ANTARBODH</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <div style={{ width: '12px', height: '0px', borderTop: '2px dashed var(--color-text-subtle)' }}></div>
                <span className="label-scientific" style={{ color: 'var(--color-text-subtle)', fontSize: '0.875rem' }}>GLORYS</span>
              </div>
            </div>
            
            <ValidationCharts metrics={report.per_depth} />
          </Panel>

          {/* Table */}
          <Panel style={{ flex: 1, overflowX: 'auto' }}>
            <div className="label-scientific" style={{ marginBottom: 'var(--space-4)' }}>METRICS BY DEPTH</div>
            <table style={{ width: '100%', fontSize: '0.75rem', borderCollapse: 'collapse', fontFamily: 'var(--font-mono)' }}>
              <thead>
                <tr style={{ color: 'var(--color-text-subtle)', borderBottom: '1px solid var(--color-border)', textAlign: 'right' }}>
                  <th style={{ padding: 'var(--space-2) 0', textAlign: 'left' }}>Depth</th>
                  <th style={{ padding: 'var(--space-2) 0' }}>n_obs</th>
                  <th style={{ padding: 'var(--space-2) 0', color: 'var(--color-teal)' }}>A-RMSE</th>
                  <th style={{ padding: 'var(--space-2) 0' }}>G-RMSE</th>
                </tr>
              </thead>
              <tbody>
                {report.per_depth.map(m => (
                  <tr key={m.depth} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: 'var(--space-2) 0', textAlign: 'left', color: 'var(--color-text)' }}>{m.depth}m</td>
                    <td style={{ padding: 'var(--space-2) 0', color: 'var(--color-text-subtle)' }}>{m.n_obs}</td>
                    <td style={{ padding: 'var(--space-2) 0', color: 'var(--color-teal)' }}>{m.antarbodh_rmse.toFixed(3)}</td>
                    <td style={{ padding: 'var(--space-2) 0', color: 'var(--color-text)' }}>{m.glorys_rmse.toFixed(3)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>
        </div>

      </div>
    </div>
  );
}
