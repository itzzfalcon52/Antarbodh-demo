import type { ArgoObservationResponse } from '../../types/api';
import { formatCoordinate } from '../../lib/formatting';
import { mapTemperatureColor } from '../../lib/mapColors';

interface MapHoverReadoutProps {
  lat: number;
  lon: number;
  temp: number | null;
  depth: number;
  argo: ArgoObservationResponse | null;
  argoLoading: boolean;
}

/**
 * Floating inspection card shown while the pointer is over the map.
 * Presentation only — every value is passed in.
 */
export function MapHoverReadout({
  lat,
  lon,
  temp,
  depth,
  argo,
  argoLoading,
}: MapHoverReadoutProps) {
  const argoTemp =
    argo?.available && argo.temperature_degC !== undefined
      ? argo.temperature_degC
      : null;

  return (
    <div className="map-overlay ex-hover ab-fade">
      <p className="ex-hover__place">
        {formatCoordinate(lat, 'lat')}, {formatCoordinate(lon, 'lon')}
      </p>

      <div className="ex-hover__main">
        <span
          aria-hidden="true"
          className="ex-swatch"
          style={{ background: temp === null ? 'transparent' : mapTemperatureColor(temp) }}
        />
        <span className="ex-hover__temp">
          {temp === null ? '—' : temp.toFixed(2)}
          <span className="nl-unit"> °C</span>
        </span>
      </div>
      <p className="ex-hover__sub">Antarbodh at {depth} m</p>

      <div className="ex-hover__argo">
        <div className="ex-hover__argo-row">
          <span>Argo float</span>
          <strong>
            {argoLoading
              ? 'Searching…'
              : argoTemp !== null
                ? `${argoTemp.toFixed(2)} °C`
                : 'No match'}
          </strong>
        </div>

        {!argoLoading && argoTemp !== null && argo && (
          <p className="ex-hover__argo-meta">
            ~{argo.depth_m_approx?.toFixed(0)} m · {argo.distance_km?.toFixed(0)} km away ·{' '}
            {argo.date_observed}
            {argo.temperature_source === 'adjusted' ? ' · adjusted' : ''}
          </p>
        )}

        {!argoLoading && argoTemp === null && (
          <p className="ex-hover__argo-meta">
            No independent observation within the matching window.
          </p>
        )}
      </div>
    </div>
  );
}
