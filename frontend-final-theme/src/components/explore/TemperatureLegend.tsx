/**
 * Colour ramp legend for the rendered temperature field.
 * The ramp and its stops mirror the map layer's existing scale.
 */
export function TemperatureLegend() {
  return (
    <div
      className="map-overlay"
      style={{
        position: 'relative',
        padding: 'var(--space-3) var(--space-4)',
        width: '248px',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          marginBottom: 'var(--space-3)',
        }}
      >
        <span className="label-scientific label-scientific--bright">
          Temperature
        </span>

        <span
          className="data-numeric"
          style={{
            fontSize: '0.65rem',
            color: 'var(--color-text-subtle)',
          }}
        >
          °C
        </span>
      </div>

      <div
        style={{
          position: 'relative',
          height: '6px',
          width: '100%',
          borderRadius: 'var(--radius-full)',
          overflow: 'hidden',
          background:
            'linear-gradient(to right, #313695, #4575b4, #74add1, #abd9e9, #e0f3f8, #fee090, #fdae61, #f46d43, #d73027)',
          boxShadow:
            'inset 0 0 0 1px rgba(255, 255, 255, 0.10)',
        }}
      />

      {/* Tick marks */}
      <div
        aria-hidden="true"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginTop: '3px',
        }}
      >
        {[0, 1, 2, 3, 4].map((t) => (
          <span
            key={t}
            style={{
              width: '1px',
              height: '3px',
              backgroundColor: 'var(--color-border-strong)',
            }}
          />
        ))}
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginTop: '3px',
          fontSize: '0.625rem',
          color: 'var(--color-text-subtle)',
          fontFamily: 'var(--font-mono)',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        <span>0</span>
        <span>8</span>
        <span>16</span>
        <span>24</span>
        <span>32</span>
      </div>
    </div>
  );
}
