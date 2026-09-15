import { useState, useEffect, useRef } from 'react';
import { Panel } from '../components/ui/Panel';
import { OceanMap } from '../components/map/OceanMap';
import { DepthSelector } from '../components/explore/DepthSelector';
import { DateTimeline } from '../components/explore/DateTimeline';
import { TemperatureLegend } from '../components/explore/TemperatureLegend';
import { LocationPanel } from '../components/explore/LocationPanel';
import { api } from '../api/endpoints';
import type { TemperatureFieldResponse, ProfileResponse } from '../types/api';
import { formatCoordinate, formatTemperature } from '../lib/formatting';

export function ExplorePage() {
  const [selectedDate, setSelectedDate] = useState('2025-01-01');
  const [selectedDepth, setSelectedDepth] = useState(0);
  const [selectedLocation, setSelectedLocation] = useState<{lat: number, lon: number} | null>(null);
  
  const [hoverData, setHoverData] = useState<{lat: number | null, lon: number | null, temp: number | null}>({ lat: null, lon: null, temp: null });
  
  const [temperatureField, setTemperatureField] = useState<TemperatureFieldResponse | null>(null);
  const [fieldLoading, setFieldLoading] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);

  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  // Simple cache
  const fieldCache = useRef<Record<string, TemperatureFieldResponse>>({});
  const profileCache = useRef<Record<string, ProfileResponse>>({});

  // Load field
  useEffect(() => {
    const cacheKey = `${selectedDate}_${selectedDepth}`;
    if (fieldCache.current[cacheKey]) {
      setTemperatureField(fieldCache.current[cacheKey]);
      setFieldError(null);
      return;
    }

    let isMounted = true;
    setFieldLoading(true);
    
    api.getTemperature(selectedDate, selectedDepth, 'historical')
      .then(data => {
        if (!isMounted) return;
        fieldCache.current[cacheKey] = data;
        setTemperatureField(data);
        setFieldError(null);
      })
      .catch(err => {
        if (!isMounted) return;
        console.error(err);
        setFieldError('TEMPERATURE FIELD UNAVAILABLE');
      })
      .finally(() => {
        if (isMounted) setFieldLoading(false);
      });

    return () => { isMounted = false; };
  }, [selectedDate, selectedDepth]);

  // Load profile
  useEffect(() => {
    if (!selectedLocation) {
      setProfile(null);
      return;
    }

    const { lat, lon } = selectedLocation;
    const cacheKey = `${selectedDate}_${lat}_${lon}`;
    
    if (profileCache.current[cacheKey]) {
      setProfile(profileCache.current[cacheKey]);
      return;
    }

    let isMounted = true;
    setProfileLoading(true);

    api.getProfile(selectedDate, lat, lon, 'historical')
      .then(data => {
        if (!isMounted) return;
        profileCache.current[cacheKey] = data;
        setProfile(data);
      })
      .catch(err => {
        if (!isMounted) return;
        console.error(err);
        setProfile(null);
      })
      .finally(() => {
        if (isMounted) setProfileLoading(false);
      });

    return () => { isMounted = false; };
  }, [selectedDate, selectedLocation]);

  const handleLocationSelect = (lat: number, lon: number) => {
    setSelectedLocation({ lat, lon });
  };

  const handleHoverLocation = (lat: number | null, lon: number | null, temp: number | null) => {
    setHoverData({ lat, lon, temp });
  };

  // Determine current display temp for inspection panel
  let panelTemp = null;
  if (profile && profile.depths_m) {
    const depthIdx = profile.depths_m.indexOf(selectedDepth);
    if (depthIdx !== -1) {
      panelTemp = profile.temperature_degC[depthIdx];
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', flex: 1, padding: 'var(--space-4)', gap: 'var(--space-4)' }}>
      
      {/* Top row: Map and Inspection */}
      <div style={{ display: 'flex', gap: 'var(--space-4)', flex: 1, minHeight: 0 }}>
        
        {/* Left: Depth Rail */}
        <div style={{ width: '120px', padding: 'var(--space-4) 0', overflowY: 'auto' }}>
          <DepthSelector selectedDepth={selectedDepth} onDepthChange={setSelectedDepth} />
        </div>

        {/* Center: Map Area */}
        <Panel style={{ flex: 3, position: 'relative', overflow: 'hidden', padding: 0 }}>
          <OceanMap 
            temperatureData={temperatureField} 
            selectedLocation={selectedLocation}
            onLocationSelect={handleLocationSelect}
            onHoverLocation={handleHoverLocation}
          />
          
          {/* Map Title Overlay */}
          <div style={{ position: 'absolute', top: 'var(--space-6)', left: 'var(--space-6)', zIndex: 1, pointerEvents: 'none' }}>
            <h2 style={{ margin: 0, fontSize: '1.5rem', letterSpacing: '0.05em', textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>BAY OF BENGAL</h2>
            <div className="label-scientific" style={{ color: 'var(--color-ocean-bright)', textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>
              SUBSURFACE TEMPERATURE • {selectedDepth}m
            </div>
          </div>

          {/* Map Hover Tooltip */}
          {hoverData.lat !== null && hoverData.lon !== null && (
            <div style={{ 
              position: 'absolute', 
              top: 'var(--space-6)', 
              right: 'var(--space-6)', 
              zIndex: 1, 
              backgroundColor: 'rgba(6, 20, 29, 0.85)', 
              backdropFilter: 'blur(8px)',
              padding: 'var(--space-3)', 
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--color-border)',
              pointerEvents: 'none'
            }}>
              <div className="data-numeric" style={{ fontSize: '0.875rem' }}>{formatCoordinate(hoverData.lat, 'lat')}</div>
              <div className="data-numeric" style={{ fontSize: '0.875rem' }}>{formatCoordinate(hoverData.lon, 'lon')}</div>
              <div style={{ height: '1px', backgroundColor: 'var(--color-border)', margin: 'var(--space-2) 0' }} />
              <div className="data-numeric" style={{ color: 'var(--color-ocean-bright)' }}>{formatTemperature(hoverData.temp)}</div>
              <div className="label-scientific" style={{ fontSize: '0.65rem', marginTop: '2px' }}>{selectedDepth}m</div>
            </div>
          )}

          {/* Legend Overlay */}
          <div style={{ position: 'absolute', bottom: 'var(--space-6)', left: 'var(--space-6)', zIndex: 1 }}>
            <TemperatureLegend />
          </div>

          {/* Loading/Error States */}
          {fieldLoading && (
            <div style={{ position: 'absolute', inset: 0, zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(6, 20, 29, 0.4)', backdropFilter: 'blur(2px)', pointerEvents: 'none' }}>
              <div className="label-scientific" style={{ backgroundColor: 'var(--color-deep)', padding: 'var(--space-3) var(--space-6)', borderRadius: 'var(--radius-full)', border: '1px solid var(--color-border)' }}>
                UPDATING FIELD...
              </div>
            </div>
          )}
          
          {fieldError && !fieldLoading && (
            <div style={{ position: 'absolute', inset: 0, zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(6, 20, 29, 0.6)', pointerEvents: 'none' }}>
              <div style={{ backgroundColor: 'var(--color-deep)', padding: 'var(--space-4) var(--space-6)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-danger)', textAlign: 'center' }}>
                <div className="label-scientific" style={{ color: 'var(--color-danger)', marginBottom: 'var(--space-2)' }}>{fieldError}</div>
                <div style={{ fontSize: '0.875rem', color: 'var(--color-text-subtle)' }}>Try selecting a different date or depth.</div>
              </div>
            </div>
          )}
        </Panel>

        {/* Right: Inspection Panel */}
        <Panel style={{ width: '320px', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
          <LocationPanel 
            location={selectedLocation} 
            date={selectedDate}
            depth={selectedDepth}
            temperature={panelTemp}
            profile={profile}
            loading={profileLoading}
          />
        </Panel>
      </div>

      {/* Bottom row: Timeline */}
      <Panel style={{ height: '80px', display: 'flex', alignItems: 'center', padding: '0 var(--space-6)', flexShrink: 0 }}>
        <DateTimeline selectedDate={selectedDate} onDateChange={setSelectedDate} />
      </Panel>
    </div>
  );
}
