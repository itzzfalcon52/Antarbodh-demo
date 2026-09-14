import { useEffect, useRef } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { TemperatureSliceResponse } from '../../types/api';
import { renderGridToImageData } from '../../utils/formatting';

// Use Carto's keyless standard dark tiles for scientific applications
const BASEMAP_STYLE = {
  version: 8 as const,
  sources: {
    'carto-dark': {
      type: 'raster' as const,
      tiles: ['https://a.basemaps.cartocdn.com/rastertiles/dark_nolabels/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '&copy; <a href="https://carto.com/" target="_blank">CARTO</a>'
    }
  },
  layers: [
    {
      id: 'carto-dark-layer',
      type: 'raster' as const,
      source: 'carto-dark',
      minzoom: 0,
      maxzoom: 22
    }
  ]
};

interface OceanMapProps {
  temperatureSlice: TemperatureSliceResponse | null;
  selectedLocation: { lat: number; lon: number } | null;
  onLocationClick: (loc: { lat: number; lon: number }) => void;
}

const DATA_SOURCE_ID = 'antarbodh-data';
const DATA_LAYER_ID = 'antarbodh-layer';

export function OceanMap({ temperatureSlice, selectedLocation, onLocationClick }: OceanMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);

  // Initialize Map only once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: BASEMAP_STYLE,
      center: [90, 12.5], // Center of Bay of Bengal [lon, lat]
      zoom: 4,
      minZoom: 3,
      maxZoom: 10,
      dragRotate: false,
    });

    map.on('load', () => {
      // Add empty image source initially
      map.addSource(DATA_SOURCE_ID, {
        type: 'image',
        url: '', // We'll update this with an object URL later, wait, maplibre requires url or coordinates
        // Actually for dynamic images, we can provide coordinates and an initial transparent pixel or canvas
        coordinates: [
          [80.0, 20.0], // Top left (NW) [lon, lat]
          [100.0, 20.0], // Top right (NE)
          [100.0, 5.0], // Bottom right (SE)
          [80.0, 5.0], // Bottom left (SW)
        ]
      });

      map.addLayer({
        id: DATA_LAYER_ID,
        type: 'raster',
        source: DATA_SOURCE_ID,
        paint: {
          'raster-opacity': 0.8,
          'raster-fade-duration': 0 // Essential for smooth timeline scrubbing
        }
      });
    });

    map.on('click', (e: maplibregl.MapMouseEvent) => {
      onLocationClick({
        lat: e.lngLat.lat,
        lon: e.lngLat.lng
      });
    });

    map.on('mouseenter', DATA_LAYER_ID, () => {
      map.getCanvas().style.cursor = 'crosshair';
    });
    map.on('mouseleave', DATA_LAYER_ID, () => {
      map.getCanvas().style.cursor = '';
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [onLocationClick]);

  // Update Data Layer without remounting the map
  useEffect(() => {
    if (!mapRef.current || !temperatureSlice) return;
    const map = mapRef.current;

    const source = map.getSource(DATA_SOURCE_ID) as maplibregl.ImageSource;
    if (!source) return; // Map might not be fully loaded yet

    const { temperature_grid, latitudes, longitudes, min_temp, max_temp } = temperatureSlice;

    // Use sensible defaults if the slice has no explicit min/max
    const vMin = min_temp ?? 20;
    const vMax = max_temp ?? 32;

    const imageData = renderGridToImageData(temperature_grid, vMin, vMax);
    
    // Create an offscreen canvas to convert ImageData to a URL for maplibre
    const canvas = document.createElement('canvas');
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.putImageData(imageData, 0, 0);
      
      // We can use updateImage directly passing the canvas element
      // However, the coordinates must match the grid EXACTLY.
      // Top-Left (NW): [lon_min, lat_max]
      // Top-Right (NE): [lon_max, lat_max]
      // Bottom-Right (SE): [lon_max, lat_min]
      // Bottom-Left (SW): [lon_min, lat_min]
      // The grid from the backend is assumed to be ordered with latitudes descending (20 down to 5).
      
      const lonMin = Math.min(...longitudes);
      const lonMax = Math.max(...longitudes);
      const latMin = Math.min(...latitudes);
      const latMax = Math.max(...latitudes);

      // In MapLibre 3+, updateImage takes an HTMLImageElement or HTMLCanvasElement
      source.updateImage({
        url: canvas.toDataURL(),
        coordinates: [
          [lonMin, latMax],
          [lonMax, latMax],
          [lonMax, latMin],
          [lonMin, latMin]
        ]
      });
    }
  }, [temperatureSlice]);

  // Handle Marker
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    if (selectedLocation) {
      if (!markerRef.current) {
        markerRef.current = new maplibregl.Marker({ color: 'var(--accent-primary)' })
          .setLngLat([selectedLocation.lon, selectedLocation.lat])
          .addTo(map);
      } else {
        markerRef.current.setLngLat([selectedLocation.lon, selectedLocation.lat]);
      }
      
      // Pan slightly if marker is out of view
      // But don't force a full flyTo every click to keep it calm
    } else {
      if (markerRef.current) {
        markerRef.current.remove();
        markerRef.current = null;
      }
    }
  }, [selectedLocation]);

  return (
    <div 
      ref={containerRef} 
      style={{ 
        position: 'absolute', 
        top: 0, left: 0, right: 0, bottom: 0, 
        backgroundColor: '#040914' 
      }} 
    />
  );
}
