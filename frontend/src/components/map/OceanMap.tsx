import { useEffect, useRef } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { createTemperatureGeoJSON, createGridGeoJSON, temperatureColorScale } from './TemperatureLayer';
import { DOMAIN } from '../../lib/constants';
import type { TemperatureFieldResponse } from '../../types/api';

interface OceanMapProps {
  temperatureData: TemperatureFieldResponse | null;
  selectedLocation: { lat: number; lon: number } | null;
  onLocationSelect: (lat: number, lon: number) => void;
  onHoverLocation: (lat: number | null, lon: number | null, temp: number | null) => void;
}

export function OceanMap({ temperatureData, selectedLocation, onLocationSelect, onHoverLocation }: OceanMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);

  useEffect(() => {
    if (map.current || !mapContainer.current) return;

    try {
      map.current = new maplibregl.Map({
        container: mapContainer.current,
        style: '/assets/ocean-style.json',
        center: [90, 12.5],
        zoom: 4.5,
        maxBounds: [
          [DOMAIN.LON_MIN - 5, DOMAIN.LAT_MIN - 5],
          [DOMAIN.LON_MAX + 5, DOMAIN.LAT_MAX + 5]
        ],
        attributionControl: false
      });

      map.current.on('error', (e) => {
        console.error('MapLibre Error:', e);
      });

      map.current.on('load', () => {
        if (!map.current) return;

        // Add grid source and layer
        map.current.addSource('grid', {
          type: 'geojson',
          data: createGridGeoJSON()
        });

        map.current.addLayer({
          id: 'grid-lines',
          type: 'line',
          source: 'grid',
          paint: {
            'line-color': '#ffffff',
            'line-opacity': 0.05,
            'line-width': 1
          }
        });

        // Add temperature source and layer
        map.current.addSource('temperature', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] }
        });

        map.current.addLayer({
          id: 'temperature-fill',
          type: 'fill',
          source: 'temperature',
          paint: {
            'fill-color': temperatureColorScale as any,
            'fill-opacity': 0.8
          }
        }, 'coastline');

        // Interactivity
        map.current.on('mousemove', 'temperature-fill', (e: any) => {
          if (e.features && e.features.length > 0) {
            const feature = e.features[0];
            const coords = e.lngLat;
            onHoverLocation(coords.lat, coords.lng, feature.properties?.temperature);
          }
        });

        map.current.on('mouseleave', 'temperature-fill', () => {
          onHoverLocation(null, null, null);
        });

        map.current.on('click', 'temperature-fill', (e: any) => {
          const coords = e.lngLat;
          onLocationSelect(coords.lat, coords.lng);
        });
        
        // Highlight source
        map.current.addSource('highlight', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] }
        });

        map.current.addLayer({
          id: 'highlight-point',
          type: 'circle',
          source: 'highlight',
          paint: {
            'circle-radius': 6,
            'circle-color': '#E2E8F0',
            'circle-stroke-width': 2,
            'circle-stroke-color': '#06141D'
          }
        });
      });
    } catch (err: any) {
      console.error('Failed to create map', err);
    }
  }, []);

  // Update temperature data
  useEffect(() => {
    if (!map.current || !temperatureData) return;
    const source = map.current.getSource('temperature') as maplibregl.GeoJSONSource;
    if (source) {
      source.setData(createTemperatureGeoJSON(temperatureData));
    }
  }, [temperatureData]);

  // Update selected location marker
  useEffect(() => {
    if (!map.current) return;
    const source = map.current.getSource('highlight') as maplibregl.GeoJSONSource;
    if (source) {
      if (selectedLocation) {
        source.setData({
          type: 'FeatureCollection',
          features: [{
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'Point',
              coordinates: [selectedLocation.lon, selectedLocation.lat]
            }
          }]
        });
      } else {
        source.setData({ type: 'FeatureCollection', features: [] });
      }
    }
  }, [selectedLocation]);

  return (
    <div ref={mapContainer} style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }} />
  );
}
