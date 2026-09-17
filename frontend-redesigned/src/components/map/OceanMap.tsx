import { useEffect, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

import {
  createTemperatureGeoJSON,
  createGridGeoJSON,
  temperatureColorScale,
} from './TemperatureLayer.ts';

import { DOMAIN } from '../../lib/constants';
import type { TemperatureFieldResponse } from '../../types/api';

interface OceanMapProps {
  temperatureData: TemperatureFieldResponse | null;
  selectedLocation: { lat: number; lon: number } | null;
  onLocationSelect: (lat: number, lon: number) => void;
  onHoverLocation: (
    lat: number | null,
    lon: number | null,
    temp: number | null
  ) => void;
}

export function OceanMap({
  temperatureData,
  selectedLocation,
  onLocationSelect,
  onHoverLocation,
}: OceanMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);

  const onLocationSelectRef = useRef(onLocationSelect);
  const onHoverLocationRef = useRef(onHoverLocation);

  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    onLocationSelectRef.current = onLocationSelect;
  }, [onLocationSelect]);

  useEffect(() => {
    onHoverLocationRef.current = onHoverLocation;
  }, [onHoverLocation]);

  useEffect(() => {
    if (map.current || !mapContainer.current) {
      return;
    }

    const mapInstance = new maplibregl.Map({
      container: mapContainer.current,
      style: '/assets/ocean-style.json',
      center: [90, 12.5],
      zoom: 4.5,
      maxBounds: [
        [DOMAIN.LON_MIN - 5, DOMAIN.LAT_MIN - 5],
        [DOMAIN.LON_MAX + 5, DOMAIN.LAT_MAX + 5],
      ],
      attributionControl: false,
    });

    map.current = mapInstance;

    mapInstance.on('error', (event) => {
      console.error('MapLibre Error:', event);
    });

    mapInstance.on('load', () => {
      mapInstance.addSource('grid', {
        type: 'geojson',
        data: createGridGeoJSON(),
      });

      mapInstance.addLayer({
        id: 'grid-lines',
        type: 'line',
        source: 'grid',
        paint: {
          'line-color': '#ffffff',
          'line-opacity': 0.05,
          'line-width': 1,
        },
      });

      mapInstance.addSource('temperature', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: [],
        },
      });

      mapInstance.addLayer(
        {
          id: 'temperature-fill',
          type: 'fill',
          source: 'temperature',
          paint: {
            'fill-color': temperatureColorScale,
            'fill-opacity': 0.8,
          },
        },
        'coastline'
      );

      mapInstance.on(
        'mousemove',
        'temperature-fill',
        (event: maplibregl.MapLayerMouseEvent) => {
          if (!event.features || event.features.length === 0) {
            return;
          }

          const feature = event.features[0];
          const rawTemperature =
            feature.properties?.temperature;

          const temperature =
            rawTemperature == null
              ? null
              : Number(rawTemperature);

          onHoverLocationRef.current(
            event.lngLat.lat,
            event.lngLat.lng,
            Number.isFinite(temperature)
              ? temperature
              : null
          );
        }
      );

      mapInstance.on(
        'mouseleave',
        'temperature-fill',
        () => {
          onHoverLocationRef.current(
            null,
            null,
            null
          );
        }
      );

      mapInstance.on(
        'click',
        'temperature-fill',
        (event: maplibregl.MapLayerMouseEvent) => {
          onLocationSelectRef.current(
            event.lngLat.lat,
            event.lngLat.lng
          );
        }
      );

      mapInstance.addSource('highlight', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: [],
        },
      });

      mapInstance.addLayer({
        id: 'highlight-point',
        type: 'circle',
        source: 'highlight',
        paint: {
          'circle-radius': 6,
          'circle-color': '#E2E8F0',
          'circle-stroke-width': 2,
          'circle-stroke-color': '#06141D',
        },
      });

      setMapReady(true);
    });

    return () => {
      mapInstance.remove();
      map.current = null;
      setMapReady(false);
    };
  }, []);

  useEffect(() => {
    if (
      !mapReady ||
      !map.current ||
      !temperatureData
    ) {
      return;
    }

    const source = map.current.getSource(
      'temperature'
    ) as maplibregl.GeoJSONSource | undefined;

    if (!source) {
      return;
    }

    try {
      const geoJSON =
        createTemperatureGeoJSON(temperatureData);

      source.setData(geoJSON);
    } catch (error) {
      console.error(
        'Failed to convert temperature field to GeoJSON:',
        error
      );
    }
  }, [mapReady, temperatureData]);

  useEffect(() => {
    if (!mapReady || !map.current) {
      return;
    }

    const source = map.current.getSource(
      'highlight'
    ) as maplibregl.GeoJSONSource | undefined;

    if (!source) {
      return;
    }

    if (!selectedLocation) {
      source.setData({
        type: 'FeatureCollection',
        features: [],
      });
      return;
    }

    source.setData({
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'Point',
            coordinates: [
              selectedLocation.lon,
              selectedLocation.lat,
            ],
          },
        },
      ],
    });
  }, [mapReady, selectedLocation]);

  return (
    <div
      ref={mapContainer}
      style={{
        width: '100%',
        height: '100%',
        position: 'absolute',
        top: 0,
        left: 0,
      }}
    />
  );
}