export function formatCoordinate(val: number, type: 'lat' | 'lon'): string {
  const dir = type === 'lat' ? (val >= 0 ? 'N' : 'S') : (val >= 0 ? 'E' : 'W');
  return `${Math.abs(val).toFixed(2)}° ${dir}`;
}

export function formatTemperature(val: number | null): string {
  if (val === null) return '--';
  return `${val.toFixed(2)}°C`;
}
