import type {
  ValidationDepthMetrics,
} from '../../types/api';


interface ValidationChartsProps {
  metrics: ValidationDepthMetrics[];
}


const DEPTHS = [
  0,
  5,
  10,
  20,
  30,
  50,
  75,
  100,
  125,
  150,
  200,
  300,
  500,
  700,
  1000,
];


function depthY(depth: number): number {

  if (depth <= 200) {
    return (
      (depth / 200) * 40
    );
  }

  return (
    40 +
    ((depth - 200) / 800) * 60
  );
}


function clamp(
  value: number,
  min: number,
  max: number,
): number {

  return Math.max(
    min,
    Math.min(max, value)
  );
}


function MetricChart({
  title,
  subtitle,
  metrics,
  getA,
  getG,
  min,
  max,
  zero = false,
  unit = '',
}: {
  title: string;
  subtitle: string;
  metrics: ValidationDepthMetrics[];
  getA: (m: ValidationDepthMetrics) => number;
  getG: (m: ValidationDepthMetrics) => number;
  min: number;
  max: number;
  zero?: boolean;
  unit?: string;
}) {

  const range = max - min;

  const x = (value: number) => {

    if (!Number.isFinite(value)) {
      return 0;
    }

    return clamp(
      ((value - min) / range) * 100,
      0,
      100,
    );
  };


  const pointsA = metrics
    .map((metric) => {
      const value = getA(metric);

      if (!Number.isFinite(value)) {
        return null;
      }

      return `${x(value)},${depthY(metric.depth)}`;
    })
    .filter(Boolean)
    .join(' ');


  const pointsG = metrics
    .map((metric) => {
      const value = getG(metric);

      if (!Number.isFinite(value)) {
        return null;
      }

      return `${x(value)},${depthY(metric.depth)}`;
    })
    .filter(Boolean)
    .join(' ');


  const zeroX = x(0);


  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0,
      }}
    >

      <div
        className="label-scientific"
        style={{
          marginBottom:
            'var(--space-1)',
        }}
      >
        {title}
      </div>

      <div
        style={{
          fontSize: '0.7rem',
          color:
            'var(--color-text-subtle)',
          marginBottom:
            'var(--space-3)',
        }}
      >
        {subtitle}
        {unit ? ` · ${unit}` : ''}
      </div>


      <div
        style={{
          position: 'relative',
          height: '320px',
          background:
            'var(--color-deep)',
          border:
            '1px solid var(--color-border)',
          borderRadius:
            'var(--radius-sm)',
          overflow: 'hidden',
        }}
      >

        <svg
          width="100%"
          height="100%"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >

          {/* Vertical grid */}

          {[0, 25, 50, 75, 100].map(
            (p) => (
              <line
                key={`v-${p}`}
                x1={p}
                y1="0"
                x2={p}
                y2="100"
                stroke="rgba(255,255,255,0.05)"
                strokeWidth="0.25"
                strokeDasharray="1 1"
              />
            )
          )}


          {/* Depth grid */}

          {DEPTHS.map((depth) => {

            const y =
              depthY(depth);

            return (
              <line
                key={`d-${depth}`}
                x1="0"
                y1={y}
                x2="100"
                y2={y}
                stroke="rgba(255,255,255,0.025)"
                strokeWidth="0.25"
              />
            );
          })}


          {/* Zero line */}

          {zero && (
            <line
              x1={zeroX}
              y1="0"
              x2={zeroX}
              y2="100"
              stroke="rgba(255,255,255,0.22)"
              strokeWidth="0.35"
            />
          )}


          {/* GLORYS */}

          <polyline
            points={pointsG}
            fill="none"
            stroke="var(--color-text-subtle)"
            strokeWidth="0.7"
            strokeDasharray="2 2"
            vectorEffect="non-scaling-stroke"
          />


          {/* ANTARBODH */}

          <polyline
            points={pointsA}
            fill="none"
            stroke="var(--color-teal)"
            strokeWidth="1.1"
            vectorEffect="non-scaling-stroke"
          />


          {/* Points */}

          {metrics.map(
            (metric, index) => {

              const y =
                depthY(metric.depth);

              const valueA =
                getA(metric);

              const valueG =
                getG(metric);

              return (
                <g
                  key={`${metric.depth}-${index}`}
                >

                  {Number.isFinite(
                    valueG
                  ) && (
                      <circle
                        cx={x(valueG)}
                        cy={y}
                        r="1.2"
                        fill="var(--color-deep)"
                        stroke="var(--color-text-subtle)"
                        strokeWidth="0.7"
                        vectorEffect="non-scaling-stroke"
                      />
                    )}

                  {Number.isFinite(
                    valueA
                  ) && (
                      <circle
                        cx={x(valueA)}
                        cy={y}
                        r="1.5"
                        fill="var(--color-deep)"
                        stroke="var(--color-teal)"
                        strokeWidth="0.8"
                        vectorEffect="non-scaling-stroke"
                      />
                    )}

                </g>
              );
            }
          )}

        </svg>


        {/* Depth labels */}

        <div
          style={{
            position: 'absolute',
            left: '6px',
            top: '0',
            bottom: '0',
            pointerEvents: 'none',
          }}
        >

          {[0, 100, 500, 1000].map(
            (depth) => (

              <span
                key={depth}
                style={{
                  position: 'absolute',
                  top:
                    `${depthY(depth)}%`,
                  transform:
                    'translateY(-50%)',
                  fontFamily:
                    'var(--font-mono)',
                  fontSize:
                    '0.58rem',
                  color:
                    'var(--color-text-subtle)',
                  background:
                    'rgba(4,15,22,0.7)',
                  padding:
                    '1px 3px',
                }}
              >
                {depth}m
              </span>

            )
          )}

        </div>


        {/* Scale labels */}

        <div
          style={{
            position: 'absolute',
            left: '0',
            right: '0',
            bottom: '5px',
            display: 'flex',
            justifyContent:
              'space-between',
            padding:
              '0 6px',
            pointerEvents: 'none',
          }}
        >

          <span
            style={{
              fontFamily:
                'var(--font-mono)',
              fontSize:
                '0.58rem',
              color:
                'var(--color-text-subtle)',
            }}
          >
            {min.toFixed(
              min === -1 ? 1 : 2
            )}
          </span>

          <span
            style={{
              fontFamily:
                'var(--font-mono)',
              fontSize:
                '0.58rem',
              color:
                'var(--color-text-subtle)',
            }}
          >
            {((min + max) / 2).toFixed(
              min === -1 ? 1 : 2
            )}
          </span>

          <span
            style={{
              fontFamily:
                'var(--font-mono)',
              fontSize:
                '0.58rem',
              color:
                'var(--color-text-subtle)',
            }}
          >
            {max.toFixed(
              min === -1 ? 1 : 2
            )}
          </span>

        </div>

      </div>

    </div>
  );
}


export function ValidationCharts({
  metrics,
}: ValidationChartsProps) {

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns:
          'repeat(2, minmax(0, 1fr))',
        gap: 'var(--space-6)',
      }}
    >

      {/* RMSE */}

      <MetricChart
        title="RMSE BY DEPTH"
        subtitle="Absolute reconstruction error"
        metrics={metrics}
        getA={(m) =>
          m.antarbodh_rmse
        }
        getG={(m) =>
          m.glorys_rmse
        }
        min={0}
        max={1.6}
        unit="°C"
      />


      {/* MAE */}

      <MetricChart
        title="MAE BY DEPTH"
        subtitle="Mean absolute error"
        metrics={metrics}
        getA={(m) =>
          m.antarbodh_mae
        }
        getG={(m) =>
          m.glorys_mae
        }
        min={0}
        max={1.4}
        unit="°C"
      />


      {/* BIAS */}

      <MetricChart
        title="BIAS BY DEPTH"
        subtitle="Signed reconstruction error"
        metrics={metrics}
        getA={(m) =>
          m.antarbodh_bias
        }
        getG={(m) =>
          m.glorys_bias
        }
        min={-0.8}
        max={0.8}
        zero
        unit="°C"
      />


      {/* CORRELATION */}

      <MetricChart
        title="CORRELATION BY DEPTH"
        subtitle="Pearson correlation with ARGO"
        metrics={metrics}
        getA={(m) =>
          m.antarbodh_corr
        }
        getG={(m) =>
          m.glorys_corr
        }
        min={0}
        max={1}
      />

    </div>
  );
}