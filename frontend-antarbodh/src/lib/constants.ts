export const TARGET_DEPTHS = [
  0, 5, 10, 20, 30, 50, 75, 100, 125, 150, 200, 300, 500, 700, 1000
];

export const UPPER_OCEAN = [0, 5, 10, 20, 30];
export const THERMOCLINE = [50, 75, 100, 125, 150, 200];
export const DEEP_OCEAN = [300, 500, 700, 1000];

export const DOMAIN = {
  LAT_MIN: 5,
  LAT_MAX: 20,
  LON_MIN: 80,
  LON_MAX: 100,
  RESOLUTION: 0.25
};

export const UNITS = {
  temperature: '°C',
  salinity: 'PSU',
  SSH: 'm',
  current: 'm/s',
  wind: 'm/s'
};
