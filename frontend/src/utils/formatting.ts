export function formatCoordinate(lat: number, lon: number): string {
  const latStr = `${Math.abs(lat).toFixed(2)}° ${lat >= 0 ? 'N' : 'S'}`;
  const lonStr = `${Math.abs(lon).toFixed(2)}° ${lon >= 0 ? 'E' : 'W'}`;
  return `${latStr}, ${lonStr}`;
}

export function formatDate(dateStr: string): string {
  // Assuming '2025-01-01'
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }).toUpperCase(); // e.g., 12 JAN 2025
}

// A scientific color scale for temperature (similar to Turbo or Thermal)
// Maps [0.0, 1.0] to [r, g, b]
function thermalColormap(t: number): [number, number, number] {
  t = Math.max(0, Math.min(1, t));
  // Simple perceptually smooth multi-stop gradient (blue -> cyan -> green -> yellow -> red)
  const stops = [
    { v: 0.00, c: [13, 71, 161] },   // Deep blue
    { v: 0.25, c: [6, 182, 212] },   // Cyan
    { v: 0.50, c: [16, 185, 129] },  // Green
    { v: 0.75, c: [234, 179, 8] },   // Yellow
    { v: 1.00, c: [239, 68, 68] }    // Red
  ];

  let lower = stops[0];
  let upper = stops[stops.length - 1];

  for (let i = 0; i < stops.length - 1; i++) {
    if (t >= stops[i].v && t <= stops[i+1].v) {
      lower = stops[i];
      upper = stops[i+1];
      break;
    }
  }

  const range = upper.v - lower.v;
  const fraction = range === 0 ? 0 : (t - lower.v) / range;

  const r = Math.round(lower.c[0] + fraction * (upper.c[0] - lower.c[0]));
  const g = Math.round(lower.c[1] + fraction * (upper.c[1] - lower.c[1]));
  const b = Math.round(lower.c[2] + fraction * (upper.c[2] - lower.c[2]));

  return [r, g, b];
}

/**
 * Renders the backend temperature grid into an ImageData object that MapLibre can consume.
 */
export function renderGridToImageData(
  grid: (number | null)[][], 
  minTemp: number = 0, 
  maxTemp: number = 32
): ImageData {
  if (!grid || grid.length === 0) return new ImageData(1, 1);
  
  const height = grid.length;
  const width = grid[0].length;
  const imageData = new ImageData(width, height);
  const data = imageData.data;

  // The grid from numpy is likely ordered lat descending (North to South) or ascending.
  // MapLibre's image layer expects the top-left to be the first pixel.
  // We'll assume the grid is already [lat][lon], where lat=0 is the top (North), 
  // because that's standard for raster imagery, but if it's upside down, we can reverse it here.
  // Wait, standard NetCDF often goes South to North. Let's render as is; we will set MapLibre coordinates correctly.
  
  let i = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const val = grid[y][x];
      if (val === null || val === undefined) {
        // Transparent for missing data
        data[i] = 0;
        data[i + 1] = 0;
        data[i + 2] = 0;
        data[i + 3] = 0;
      } else {
        const normalized = (val - minTemp) / (maxTemp - minTemp);
        const [r, g, b] = thermalColormap(normalized);
        data[i] = r;
        data[i + 1] = g;
        data[i + 2] = b;
        data[i + 3] = 200; // Semi-transparent so basemap shows slightly
      }
      i += 4;
    }
  }

  return imageData;
}
