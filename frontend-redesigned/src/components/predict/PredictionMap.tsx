import { useEffect, useRef } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { DOMAIN } from '../../lib/constants';

interface PredictionMapProps {
  lat: number | null;
  lon: number | null;
  onLocationChange: (lat: number, lon: number) => void;
}

export function PredictionMap({ lat, lon, onLocationChange }: PredictionMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);

  useEffect(() => {
    if (map.current || !mapContainer.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: '/assets/ocean-style.json',
      center: [90, 12.5],
      zoom: 3.5,
      maxBounds: [
        [DOMAIN.LON_MIN - 10, DOMAIN.LAT_MIN - 10],
        [DOMAIN.LON_MAX + 10, DOMAIN.LAT_MAX + 10]
      ],
      attributionControl: false
    });

    map.current.on('load', () => {
      if (!map.current) return;

      // Add domain bounding box
      map.current.addSource('domain', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'Polygon',
            coordinates: [[
              [DOMAIN.LON_MIN, DOMAIN.LAT_MIN],
              [DOMAIN.LON_MAX, DOMAIN.LAT_MIN],
              [DOMAIN.LON_MAX, DOMAIN.LAT_MAX],
              [DOMAIN.LON_MIN, DOMAIN.LAT_MAX],
              [DOMAIN.LON_MIN, DOMAIN.LAT_MIN]
            ]]
          }
        }
      });

      map.current.addLayer({
        id: 'domain-fill',
        type: 'fill',
        source: 'domain',
        paint: {
          'fill-color': '#2AAFA3',
          'fill-opacity': 0.05
        }
      });
      
      map.current.addLayer({
        id: 'domain-border',
        type: 'line',
        source: 'domain',
        paint: {
          'line-color': '#2AAFA3',
          'line-width': 1,
          'line-dasharray': [4, 4]
        }
      });

      // Add marker source
      map.current.addSource('marker', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] }
      });

      map.current.addLayer({
        id: 'marker-point',
        type: 'circle',
        source: 'marker',
        paint: {
          'circle-radius': 6,
          'circle-color': '#fdae61',
          'circle-stroke-width': 2,
          'circle-stroke-color': '#06141D'
        }
      });

      // Click to select location inside domain
      map.current.on('click', (e: any) => {
        const { lng, lat } = e.lngLat;
        // Clamp visually selected click to domain just to be safe, but really they can click in domain
        if (lat >= DOMAIN.LAT_MIN && lat <= DOMAIN.LAT_MAX && lng >= DOMAIN.LON_MIN && lng <= DOMAIN.LON_MAX) {
          onLocationChange(Number(lat.toFixed(2)), Number(lng.toFixed(2)));
        }
      });
      
      map.current.on('mouseenter', 'domain-fill', () => {
        if (map.current) map.current.getCanvas().style.cursor = 'crosshair';
      });
      map.current.on('mouseleave', 'domain-fill', () => {
        if (map.current) map.current.getCanvas().style.cursor = '';
      });
    });
  }, []);

  // Update marker position when props change
  useEffect(() => {
    if (!map.current) return;
    const source = map.current.getSource('marker') as maplibregl.GeoJSONSource;
    if (source) {
      if (lat !== null && lon !== null) {
        source.setData({
          type: 'FeatureCollection',
          features: [{
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'Point',
              coordinates: [lon, lat]
            }
          }]
        });
      } else {
        source.setData({ type: 'FeatureCollection', features: [] });
      }
    }
  }, [lat, lon]);

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '248px',
        borderRadius: 'var(--radius-md)',
        overflow: 'hidden',
        border: '1px solid var(--color-border)',
        backgroundColor: 'var(--color-abyss)',
        flexShrink: 0,
      }}
    >
      <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />

      {/* Seats the map into the panel. Decorative only. */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          boxShadow: 'inset 0 0 48px rgba(3, 11, 18, 0.6)',
        }}
      />

      <div
        style={{
          position: 'absolute',
          bottom: 'var(--space-2)',
          right: 'var(--space-2)',
          pointerEvents: 'none',
        }}
      >
        <div
          className="label-scientific"
          style={{
            fontSize: '0.5625rem',
            backgroundColor: 'rgba(3, 11, 18, 0.82)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            border: '1px solid var(--color-border-faint)',
            padding: '4px 8px',
            borderRadius: 'var(--radius-full)',
            color: 'var(--color-text-muted)',
          }}
        >
          Domain 5–20°N · 80–100°E
        </div>
      </div>
    </div>
  );
}
