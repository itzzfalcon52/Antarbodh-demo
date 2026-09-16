import type {
  Feature,
  FeatureCollection,
  Polygon,
  Position,
} from 'geojson';
import type { ExpressionSpecification } from 'maplibre-gl';

import type { TemperatureFieldResponse } from '../../types/api';
import { DOMAIN } from '../../lib/constants';

type TemperatureProperties = {
  temperature: number | null;
};

type TemperatureFeature = Feature<
  Polygon,
  TemperatureProperties
>;

export function createTemperatureGeoJSON(
  data: TemperatureFieldResponse
): FeatureCollection<Polygon, TemperatureProperties> {
  const {
    latitude,
    longitude,
    temperature,
  } = data;

  if (
    latitude.length === 0 ||
    longitude.length === 0 ||
    temperature.length === 0
  ) {
    return {
      type: 'FeatureCollection',
      features: [],
    };
  }

  if (temperature.length !== latitude.length) {
    throw new Error(
      `Temperature latitude dimension mismatch: ` +
      `${temperature.length} rows for ${latitude.length} latitudes`
    );
  }

  for (let i = 0; i < temperature.length; i++) {
    if (temperature[i].length !== longitude.length) {
      throw new Error(
        `Temperature longitude dimension mismatch at row ${i}: ` +
        `${temperature[i].length} values for ${longitude.length} longitudes`
      );
    }
  }

  const resolution = DOMAIN.RESOLUTION;
  const halfRes = resolution / 2;

  const features: TemperatureFeature[] = [];

  for (let i = 0; i < latitude.length; i++) {
    const lat = latitude[i];

    if (!Number.isFinite(lat)) {
      continue;
    }

    for (let j = 0; j < longitude.length; j++) {
      const lon = longitude[j];

      if (!Number.isFinite(lon)) {
        continue;
      }

      const rawTemp = temperature[i][j];

      if (
        rawTemp === null ||
        !Number.isFinite(rawTemp)
      ) {
        continue;
      }

      const sw: Position = [
        lon - halfRes,
        lat - halfRes,
      ];

      const se: Position = [
        lon + halfRes,
        lat - halfRes,
      ];

      const ne: Position = [
        lon + halfRes,
        lat + halfRes,
      ];

      const nw: Position = [
        lon - halfRes,
        lat + halfRes,
      ];

      features.push({
        type: 'Feature',
        properties: {
          temperature: rawTemp,
        },
        geometry: {
          type: 'Polygon',
          coordinates: [[
            sw,
            se,
            ne,
            nw,
            sw,
          ]],
        },
      });
    }
  }

  return {
    type: 'FeatureCollection',
    features,
  };
}

export function createGridGeoJSON(): FeatureCollection<
  Polygon,
  Record<string, never>
> {
  const {
    LAT_MIN,
    LAT_MAX,
    LON_MIN,
    LON_MAX,
    RESOLUTION,
  } = DOMAIN;

  const halfRes = RESOLUTION / 2;

  type GridFeature = Feature<
    Polygon,
    Record<string, never>
  >;

  const features: GridFeature[] = [];

  for (
    let lat = LAT_MIN + halfRes;
    lat < LAT_MAX;
    lat += RESOLUTION
  ) {
    for (
      let lon = LON_MIN + halfRes;
      lon < LON_MAX;
      lon += RESOLUTION
    ) {
      const sw: Position = [
        lon - halfRes,
        lat - halfRes,
      ];

      const se: Position = [
        lon + halfRes,
        lat - halfRes,
      ];

      const ne: Position = [
        lon + halfRes,
        lat + halfRes,
      ];

      const nw: Position = [
        lon - halfRes,
        lat + halfRes,
      ];

      features.push({
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'Polygon',
          coordinates: [[
            sw,
            se,
            ne,
            nw,
            sw,
          ]],
        },
      });
    }
  }

  return {
    type: 'FeatureCollection',
    features,
  };
}

export const temperatureColorScale: ExpressionSpecification = [
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
  32, '#d73027',
];