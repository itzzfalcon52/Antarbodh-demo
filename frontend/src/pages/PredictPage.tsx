import { useState, useEffect } from 'react';
import { Panel } from '../components/ui/Panel';
import { Button } from '../components/ui/Button';
import { PredictionMap } from '../components/predict/PredictionMap';
import { ObservationStatus } from '../components/predict/ObservationStatus';
import { PredictionProfilePanel } from '../components/predict/PredictionProfilePanel';
import { api } from '../api/endpoints';
import type { AvailabilityResponse, ProfileResponse } from '../types/api';
import { DOMAIN } from '../lib/constants';

export function PredictPage() {
  const [date, setDate] = useState('2025-01-01');
  const [lat, setLat] = useState<number | null>(12.5);
  const [lon, setLon] = useState<number | null>(88.0);

  const [availability, setAvailability] = useState<AvailabilityResponse | null>(null);
  const [checking, setChecking] = useState(false);
  
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Invalidate states when inputs change
  useEffect(() => {
    setAvailability(null);
    setProfile(null);
    setError(null);
  }, [date, lat, lon]);

  const isValidLocation = lat !== null && lon !== null && 
                          lat >= DOMAIN.LAT_MIN && lat <= DOMAIN.LAT_MAX && 
                          lon >= DOMAIN.LON_MIN && lon <= DOMAIN.LON_MAX;

  const handleCheck = async () => {
    if (!isValidLocation) return;
    setChecking(true);
    setError(null);
    try {
      const res = await api.getAvailability(date);
      setAvailability(res);
    } catch (err: any) {
      console.error(err);
      setError('Failed to check availability.');
    } finally {
      setChecking(false);
    }
  };

  const handleRun = async () => {
    if (!isValidLocation || !availability?.prediction_possible) return;
    setRunning(true);
    setError(null);
    try {
      const res = await api.getProfile(date, lat as number, lon as number, 'predict');
      setProfile(res);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Reconstruction failed. Check backend logs.');
    } finally {
      setRunning(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', flex: 1, padding: 'var(--space-4)', gap: 'var(--space-4)' }}>
      
      {/* Header */}
      <div style={{ padding: '0 var(--space-2)' }}>
        <h1 style={{ margin: 0, fontSize: '1.5rem', letterSpacing: '0.05em', color: 'var(--color-text)' }}>ON-DEMAND SUBSURFACE RECONSTRUCTION</h1>
        <div style={{ color: 'var(--color-text-subtle)', fontSize: '0.875rem', marginTop: 'var(--space-1)' }}>
          Generate a vertical temperature profile from surface observations
        </div>
      </div>

      <div style={{ display: 'flex', gap: 'var(--space-4)', flex: 1, minHeight: 0 }}>
        
        {/* Left: Request Form */}
        <Panel style={{ width: '400px', display: 'flex', flexDirection: 'column', overflowY: 'auto', flexShrink: 0 }}>
          <div className="label-scientific" style={{ marginBottom: 'var(--space-4)' }}>OBSERVATION REQUEST</div>
          
          {/* Inputs */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
            <div>
              <label className="label-scientific" style={{ display: 'block', marginBottom: 'var(--space-2)' }}>DATE</label>
              <input 
                type="date" 
                value={date} 
                onChange={(e) => setDate(e.target.value)}
                style={{
                  width: '100%',
                  padding: 'var(--space-2) var(--space-3)',
                  backgroundColor: 'rgba(255,255,255,0.05)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--color-text)',
                  fontFamily: 'var(--font-mono)'
                }}
              />
            </div>
            
            <div style={{ display: 'flex', gap: 'var(--space-4)' }}>
              <div style={{ flex: 1 }}>
                <label className="label-scientific" style={{ display: 'block', marginBottom: 'var(--space-2)' }}>LATITUDE</label>
                <input 
                  type="number" 
                  step="0.01"
                  value={lat === null ? '' : lat} 
                  onChange={(e) => setLat(e.target.value ? parseFloat(e.target.value) : null)}
                  style={{
                    width: '100%',
                    padding: 'var(--space-2) var(--space-3)',
                    backgroundColor: 'rgba(255,255,255,0.05)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--color-text)',
                    fontFamily: 'var(--font-mono)'
                  }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label className="label-scientific" style={{ display: 'block', marginBottom: 'var(--space-2)' }}>LONGITUDE</label>
                <input 
                  type="number" 
                  step="0.01"
                  value={lon === null ? '' : lon} 
                  onChange={(e) => setLon(e.target.value ? parseFloat(e.target.value) : null)}
                  style={{
                    width: '100%',
                    padding: 'var(--space-2) var(--space-3)',
                    backgroundColor: 'rgba(255,255,255,0.05)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--color-text)',
                    fontFamily: 'var(--font-mono)'
                  }}
                />
              </div>
            </div>

            {!isValidLocation && lat !== null && lon !== null && (
              <div style={{ color: 'var(--color-danger)', fontSize: '0.75rem', marginTop: '-8px' }}>
                Location outside ANTARBODH model domain.
              </div>
            )}

            <PredictionMap lat={lat} lon={lon} onLocationChange={(newLat, newLon) => { setLat(newLat); setLon(newLon); }} />
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <Button 
              variant="secondary" 
              onClick={handleCheck} 
              disabled={!isValidLocation || checking}
              style={{ width: '100%' }}
            >
              {checking ? 'CHECKING...' : 'CHECK OBSERVATIONS'}
            </Button>
            
            <Button 
              variant="primary" 
              onClick={handleRun}
              disabled={!availability?.prediction_possible || running}
              style={{ width: '100%', opacity: availability?.prediction_possible ? 1 : 0.5 }}
            >
              RUN RECONSTRUCTION
            </Button>
          </div>

          <ObservationStatus availability={availability} />
          
        </Panel>

        {/* Right: Result Panel */}
        <Panel style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {error ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-danger)', textAlign: 'center', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <div className="label-scientific">RECONSTRUCTION FAILED</div>
              <div style={{ fontSize: '0.875rem' }}>{error}</div>
            </div>
          ) : running ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-ocean-bright)', flexDirection: 'column', gap: 'var(--space-6)' }}>
              <div className="label-scientific" style={{ fontSize: '1.25rem' }}>RUNNING RECONSTRUCTION</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', fontSize: '0.875rem', color: 'var(--color-text-subtle)' }}>
                <span>Preparing surface observations...</span>
                <span>Applying ANTARBODH preprocessing...</span>
                <span>Running CNN inference...</span>
                <span>Generating 15-depth profile...</span>
              </div>
            </div>
          ) : profile ? (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <div style={{ marginBottom: 'var(--space-6)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h2 style={{ margin: '0 0 var(--space-1) 0', fontSize: '1.25rem', color: 'var(--color-text)' }}>RECONSTRUCTION COMPLETE</h2>
                  <div className="label-scientific" style={{ color: 'var(--color-text-subtle)' }}>
                    {lat?.toFixed(2)}°N · {lon?.toFixed(2)}°E — {new Date(`${date}T00:00:00Z`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }).toUpperCase()}
                  </div>
                </div>
              </div>
              <div style={{ flex: 1, minHeight: 0 }}>
                <PredictionProfilePanel profile={profile} />
              </div>
            </div>
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-subtle)', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <div className="label-scientific">ENTER A DATE AND LOCATION</div>
              <div style={{ fontSize: '0.875rem', maxWidth: '300px', textAlign: 'center', lineHeight: 1.5 }}>
                Select coordinates within the Bay of Bengal to reconstruct the subsurface temperature profile.
              </div>
            </div>
          )}
        </Panel>

      </div>
    </div>
  );
}
