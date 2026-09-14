import { useEffect, useState } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { X, Info } from 'lucide-react';
import { ApiClient } from '../../api/client';
import type { ProfileResponse, SurfaceConditionsResponse, VariableObservation } from '../../types/api';
import { formatCoordinate, formatDate } from '../../utils/formatting';

interface InspectionPanelProps {
  location: { lat: number; lon: number } | null;
  date: string;
  depth: number;
  onClose: () => void;
}

export function InspectionPanel({ location, date, depth, onClose }: InspectionPanelProps) {
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [surface, setSurface] = useState<SurfaceConditionsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!location) return;

    const controller = new AbortController();
    setLoading(true);
    setError(null);

    Promise.all([
      ApiClient.getProfile(date, location.lat, location.lon, controller.signal),
      ApiClient.getSurfaceConditions(date, location.lat, location.lon, controller.signal)
    ])
    .then(([profData, surfData]) => {
      setProfile(profData);
      setSurface(surfData);
    })
    .catch(err => {
      if (err.name !== 'AbortError') {
        setError(err.message);
      }
    })
    .finally(() => {
      setLoading(false);
    });

    return () => controller.abort();
  }, [location, date]);

  if (!location) return null;

  const chartData = profile ? profile.depths.map((d, i) => ({
    depth: d,
    temp: profile.temperatures[i]
  })) : [];

  const currentTemp = profile ? (() => {
    const idx = profile.depths.indexOf(depth);
    return idx >= 0 ? profile.temperatures[idx] : null;
  })() : null;

  return (
    <div className="panel" style={{
      position: 'absolute', top: '80px', bottom: '100px', right: '24px',
      width: '320px', display: 'flex', flexDirection: 'column',
      animation: 'slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
      overflow: 'hidden'
    }}>
      <div style={{ padding: '16px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Inspection</div>
          <div className="mono" style={{ fontSize: '15px', fontWeight: 600, marginTop: '4px' }}>{formatCoordinate(location.lat, location.lon)}</div>
          <div className="mono" style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{formatDate(date)}</div>
        </div>
        <button className="btn" onClick={onClose} style={{ padding: '4px' }}>
          <X size={16} />
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {loading && (
          <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)', fontSize: '12px' }}>
            <div className="spinner" style={{ margin: '0 auto 12px', width: '20px', height: '20px', border: '2px solid var(--accent-primary)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            Retrieving observations...
          </div>
        )}

        {error && (
          <div style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--accent-error)', padding: '12px', borderRadius: 'var(--radius-sm)', fontSize: '12px', display: 'flex', gap: '8px' }}>
            <Info size={16} style={{ flexShrink: 0 }} />
            <div>{error}</div>
          </div>
        )}

        {!loading && !error && profile && (
          <>
            <div>
              <div style={{ fontSize: '32px', fontWeight: 300, color: 'var(--text-primary)' }}>
                {currentTemp !== null && currentTemp !== undefined ? currentTemp.toFixed(2) : '—'}
                <span style={{ fontSize: '16px', color: 'var(--text-muted)', marginLeft: '4px' }}>°C</span>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Temperature at {depth}m depth</div>
            </div>

            <div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>Vertical Profile</div>
              <div style={{ height: '200px', width: '100%', marginLeft: '-16px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} layout="vertical" margin={{ top: 10, right: 20, bottom: 10, left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="var(--border-subtle)" />
                    <XAxis type="number" dataKey="temp" domain={['dataMin - 1', 'dataMax + 1']} tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis type="number" dataKey="depth" reversed tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} width={35} />
                    <Tooltip 
                      cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 2 }}
                      contentStyle={{ background: 'var(--bg-panel-solid)', border: '1px solid var(--border-subtle)', borderRadius: '4px', fontSize: '12px' }}
                      formatter={(val: any) => [`${(val as number).toFixed(2)} °C`, 'Temp']}
                      labelFormatter={(label: any) => `Depth: ${label}m`}
                    />
                    <Line type="monotone" dataKey="temp" stroke="var(--accent-primary)" strokeWidth={2} dot={{ r: 3, fill: 'var(--bg-panel)', stroke: 'var(--accent-primary)', strokeWidth: 2 }} isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {surface && (
              <div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>Surface Conditions</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <SurfaceCard label="SST" obs={surface.sst} />
                  <SurfaceCard label="SSS" obs={surface.sss} />
                  <SurfaceCard label="SSH" obs={surface.ssh} />
                  <SurfaceCard label="Currents" obs={surface.current_speed} />
                  <SurfaceCard label="Winds" obs={surface.wind_speed} />
                </div>
              </div>
            )}
          </>
        )}
      </div>
      <style>{`
        @keyframes slideIn { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }
      `}</style>
    </div>
  );
}

function SurfaceCard({ label, obs }: { label: string, obs: VariableObservation }) {
  return (
    <div style={{ background: 'var(--bg-control)', padding: '8px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
      <div style={{ fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>{label}</div>
      {obs.available && obs.value !== null ? (
        <div className="mono" style={{ fontSize: '13px', color: 'var(--text-primary)', marginTop: '2px' }}>
          {obs.value.toFixed(2)} <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{obs.units}</span>
        </div>
      ) : (
        <div style={{ fontSize: '11px', color: 'var(--accent-warning)', marginTop: '2px' }} title={obs.reason}>
          Unavailable
        </div>
      )}
    </div>
  );
}
