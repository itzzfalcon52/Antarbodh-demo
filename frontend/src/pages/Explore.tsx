import { useState, useEffect } from 'react';
import { OceanMap } from '../components/map/OceanMap';
import { DataLegend } from '../components/map/DataLegend';
import { LayerSelector } from '../components/exploration/LayerSelector';
import { TimelineNavigator } from '../components/timeline/TimelineNavigator';
import { CoordinateInput } from '../components/location/CoordinateInput';
import { InspectionPanel } from '../components/location/InspectionPanel';
import { ApiClient } from '../api/client';
import type { MetadataResponse, TemperatureSliceResponse, SelectedLocation } from '../types/api';

export function Explore() {
  const [metadata, setMetadata] = useState<MetadataResponse | null>(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedDepth, setSelectedDepth] = useState(0);
  const [selectedLocation, setSelectedLocation] = useState<SelectedLocation | null>(null);
  
  const [temperatureSlice, setTemperatureSlice] = useState<TemperatureSliceResponse | null>(null);
  const [loadingSlice, setLoadingSlice] = useState(false);

  // Initial load: Fetch metadata
  useEffect(() => {
    ApiClient.getMetadata()
      .then((m) => {
        setMetadata(m);
        if (m.supported_dates.length > 0) {
          setSelectedDate(m.supported_dates[0]);
        }
      })
      .catch(err => console.error("Failed to load metadata:", err));
  }, []);

  // Fetch temperature slice whenever date or depth changes
  useEffect(() => {
    if (!selectedDate) return;
    
    const controller = new AbortController();
    setLoadingSlice(true);
    
    ApiClient.getTemperatureSlice(selectedDate, selectedDepth, controller.signal)
      .then(slice => {
        setTemperatureSlice(slice);
      })
      .catch(err => {
        if (err.name !== 'AbortError') {
          console.error("Failed to load temperature slice:", err);
        }
      })
      .finally(() => {
        setLoadingSlice(false);
      });
      
    return () => controller.abort();
  }, [selectedDate, selectedDepth]);

  if (!metadata) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
        <div className="spinner" style={{ width: '24px', height: '24px', border: '2px solid var(--accent-primary)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  const depths = metadata.supported_depths;
  const dates = metadata.supported_dates;
  const domain = metadata.domain;

  return (
    <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
      
      {/* 1. Map Instrument */}
      <OceanMap 
        temperatureSlice={temperatureSlice}
        selectedLocation={selectedLocation}
        onLocationClick={setSelectedLocation}
      />

      {/* 2. Top-Left: Data Context */}
      <LayerSelector 
        depths={depths}
        selectedDepth={selectedDepth}
        onDepthChange={setSelectedDepth}
        variableNames={metadata.variable_names}
      />

      {/* 3. Top-Right: Coordinate Search */}
      <CoordinateInput 
        domain={domain}
        onLocationSubmit={setSelectedLocation}
      />

      {/* 4. Bottom-Right: Legend */}
      <DataLegend 
        min={temperatureSlice?.min_temp ?? 20}
        max={temperatureSlice?.max_temp ?? 32}
        unit={metadata.units.temperature}
        variableName="Temperature"
      />

      {/* 5. Bottom-Center: Timeline Navigator */}
      <TimelineNavigator 
        dates={dates}
        selectedDate={selectedDate}
        onDateSelected={setSelectedDate}
        isLoading={loadingSlice}
      />

      {/* 6. Contextual Inspection Drawer (Slide in from right) */}
      <InspectionPanel 
        location={selectedLocation}
        date={selectedDate}
        depth={selectedDepth}
        onClose={() => setSelectedLocation(null)}
      />

    </div>
  );
}
