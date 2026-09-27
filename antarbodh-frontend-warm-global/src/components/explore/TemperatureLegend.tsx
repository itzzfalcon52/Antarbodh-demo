import {
  TEMPERATURE_GRADIENT,
  TEMPERATURE_MAX,
  TEMPERATURE_MIN,
} from '../../lib/mapColors';

const TICKS = [0, 8, 16, 24, 32];

/**
 * Key for what is drawn on the map: the temperature ramp (built from
 * the same stops as the map layer) and the selected-point marker.
 */
export function TemperatureLegend() {
  return (
    <div className="map-overlay ex-legend">
      <div className="ex-legend__head">
        <span className="ex-legend__title">Temperature</span>
        <span className="ex-legend__unit">°C</span>
      </div>

      <div
        aria-hidden="true"
        className="ex-legend__ramp"
        style={{ background: TEMPERATURE_GRADIENT }}
      />

      <div aria-hidden="true" className="ex-legend__ticks">
        {TICKS.map((t) => (
          <span
            key={t}
            style={{
              left: `${((t - TEMPERATURE_MIN) / (TEMPERATURE_MAX - TEMPERATURE_MIN)) * 100}%`,
            }}
          >
            {t}
          </span>
        ))}
      </div>

      <p className="ex-legend__note">
        <span aria-hidden="true" className="ex-legend__marker" />
        Selected point
      </p>
    </div>
  );
}
