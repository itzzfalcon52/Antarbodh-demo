import type { FeatureCollection, Polygon } from 'geojson';
import type { TemperatureFieldResponse } from '../../types/api';
import { DOMAIN } from '../../lib/constants';

export function createTemperatureGeoJSON(data: TemperatureFieldResponse): FeatureCollection<Polygon, { temperature: number | null }> {
  const { latitude, longitude, temperature } = data;
  const resolution = DOMAIN.RESOLUTION;
  const halfRes = resolution / 2;

  const features: any[] = [];

  for (let i = 0; i < latitude.length; i++) {
    for (let j = 0; j < longitude.length; j++) {
      const temp = temperature[i][j];
      
      // Skip cells without valid temperature data (e.g., land)
      if (temp === null) continue;

      const lat = latitude[i];
      const lon = longitude[j];

      // Corners of the grid cell
      const sw = [lon - halfRes, lat - halfRes];
      const se = [lon + halfRes, lat - halfRes];
      const ne = [lon + halfRes, lat + halfRes];
      const nw = [lon - halfRes, lat + halfRes];

      features.push({
        type: 'Feature',
        properties: { temperature: temp },
        geometry: {
          type: 'Polygon',
          coordinates: [[sw, se, ne, nw, sw]]
        }
      });
    }
  }

  return {
    type: 'FeatureCollection',
    features
  };
}

export function createGridGeoJSON(): FeatureCollection<Polygon, {}> {
  const { LAT_MIN, LAT_MAX, LON_MIN, LON_MAX, RESOLUTION } = DOMAIN;
  const halfRes = RESOLUTION / 2;
  const features: any[] = [];

  for (let lat = LAT_MIN + halfRes; lat < LAT_MAX; lat += RESOLUTION) {
    for (let lon = LON_MIN + halfRes; lon < LON_MAX; lon += RESOLUTION) {
      const sw = [lon - halfRes, lat - halfRes];
      const se = [lon + halfRes, lat - halfRes];
      const ne = [lon + halfRes, lat + halfRes];
      const nw = [lon - halfRes, lat + halfRes];

      features.push({
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'Polygon',
          coordinates: [[sw, se, ne, nw, sw]]
        }
      });
    }
  }

  return { type: 'FeatureCollection', features };
}

export const temperatureColorScale = [
  'interpolate',
  ['linear'],
  ['get', 'temperature'],
  0, '#313695',
  4, '#4575b4',
  8, '#74add1',
  12, '#abd9e9',
  16, '#e0f3f8',
  20, '#fee090',
  24, '#fdae61',
  28, '#f46d43',
  32, '#d73027'
];
