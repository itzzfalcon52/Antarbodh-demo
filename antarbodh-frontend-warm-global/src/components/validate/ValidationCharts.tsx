import {
  useCallback,
  useState,
  type PointerEvent,
} from 'react';

import type { ValidationDepthMetrics } from '../../types/api';
import { DEPTH_AXIS_TICKS, depthFraction } from '../../lib/depthScale';

interface ValidationChartsProps {
  metrics: ValidationDepthMetrics[];
  activeDepth: number | null;
  onActiveDepthChange: (depth: number | null) => void;
}

interface ChartSpec {
  title: string;
  hint: string;
  getA: (m: ValidationDepthMetrics) => number;
  getG: (m: ValidationDepthMetrics) => number;
  min: number;
  max: number;
  ticks: number[];
  digits: number;
  zero?: boolean;
}

// Axis ranges are fixed so the four panels read consistently; every
// per-depth value in the current report falls inside them.
const CHARTS: ChartSpec[] = [
  {
    title: 'RMSE',
    hint: 'Root-mean-square error, °C. Lower is better.',
    getA: (m) => m.antarbodh_rmse,
    getG: (m) => m.glorys_rmse,
    min: 0,
    max: 1.6,
    ticks: [0, 0.4, 0.8, 1.2, 1.6],
    digits: 2,
  },
  {
    title: 'MAE',
    hint: 'Mean absolute error, °C. Lower is better.',
    getA: (m) => m.antarbodh_mae,
    getG: (m) => m.glorys_mae,
    min: 0,
    max: 1.4,
    ticks: [0, 0.35, 0.7, 1.05, 1.4],
    digits: 2,
  },
  {
    title: 'Bias',
    hint: 'Mean signed error, °C. Closer to zero is better.',
    getA: (m) => m.antarbodh_bias,
    getG: (m) => m.glorys_bias,
    min: -0.8,
    max: 0.8,
    ticks: [-0.8, -0.4, 0, 0.4, 0.8],
    digits: 2,
    zero: true,
  },
  {
    title: 'Correlation',
    hint: 'Pearson correlation with Argo. Higher is better.',
    getA: (m) => m.antarbodh_corr,
    getG: (m) => m.glorys_corr,
    min: 0,
    max: 1,
    ticks: [0, 0.25, 0.5, 0.75, 1],
    digits: 3,
  },
];

const H = 300;
const PAD = { top: 16, right: 16, bottom: 30, left: 46 };

function MetricChart({
  spec,
  metrics,
  activeDepth,
  onActiveDepthChange,
}: {
  spec: ChartSpec;
  metrics: ValidationDepthMetrics[];
  activeDepth: number | null;
  onActiveDepthChange: (depth: number | null) => void;
}) {
  const [width, setWidth] = useState(480);

  // Drawn at the measured pixel width so points stay round and text
  // stays at its real size (the old chart stretched a 100×100 box).
  const frame = useCallback((node: HTMLDivElement | null) => {
    if (!node) return;
    setWidth(Math.round(node.getBoundingClientRect().width));

    const observer = new ResizeObserver(([entry]) => {
      setWidth(Math.round(entry.contentRect.width));
    });

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const W = Math.max(260, width);
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;

  const x = (v: number) =>
    PAD.left + ((Math.min(spec.max, Math.max(spec.min, v)) - spec.min) / (spec.max - spec.min)) * plotW;
  const y = (depth: number) => PAD.top + depthFraction(depth) * plotH;

  const series = (get: (m: ValidationDepthMetrics) => number) =>
    metrics
      .filter((m) => Number.isFinite(get(m)))
      .map((m, i) => `${i ? 'L' : 'M'}${x(get(m)).toFixed(1)} ${y(m.depth).toFixed(1)}`)
      .join(' ');

  const active = metrics.find((m) => m.depth === activeDepth) ?? null;

  const handlePointer = (event: PointerEvent<SVGRectElement>) => {
    const box = event.currentTarget.ownerSVGElement?.getBoundingClientRect();
    if (!box || metrics.length === 0) return;

    const py = ((event.clientY - box.top) / box.height) * H;
    let nearest = metrics[0];
    for (const m of metrics) {
      if (Math.abs(y(m.depth) - py) < Math.abs(y(nearest.depth) - py)) nearest = m;
    }
    onActiveDepthChange(nearest.depth);
  };

  return (
    <figure className="va-chart">
      <figcaption>
        <span className="va-chart__title">{spec.title}</span>
        <span className="va-chart__hint">{spec.hint}</span>
      </figcaption>

      <div ref={frame} className="va-chart__frame">
        <svg
          width={W}
          height={H}
          viewBox={`0 0 ${W} ${H}`}
          role="img"
          aria-label={`${spec.title} by depth for Antarbodh and GLORYS. Values are listed in the table below.`}
        >
          {DEPTH_AXIS_TICKS.map((d) => (
            <g key={d}>
              <line x1={PAD.left} x2={PAD.left + plotW} y1={y(d)} y2={y(d)} className="va-grid" />
              <text x={PAD.left - 8} y={y(d) + 3.5} textAnchor="end" className="va-tick">
                {d}
              </text>
            </g>
          ))}

          {spec.ticks.map((t) => (
            <g key={t}>
              <line x1={x(t)} x2={x(t)} y1={PAD.top} y2={PAD.top + plotH} className="va-grid va-grid--v" />
              <text x={x(t)} y={H - 10} textAnchor="middle" className="va-tick">
                {t}
              </text>
            </g>
          ))}

          {spec.zero && (
            <line x1={x(0)} x2={x(0)} y1={PAD.top} y2={PAD.top + plotH} className="va-zero" />
          )}

          <text x={PAD.left} y={PAD.top - 5} className="va-axis-title">
            Depth (m)
          </text>

          {active && (
            <line
              x1={PAD.left}
              x2={PAD.left + plotW}
              y1={y(active.depth)}
              y2={y(active.depth)}
              className="va-active-row"
            />
          )}

          <path d={series(spec.getG)} className="va-line va-line--g" />
          <path d={series(spec.getA)} className="va-line va-line--a" />

          {metrics.map((m) => (
            <g key={m.depth}>
              {Number.isFinite(spec.getG(m)) && (
                <circle cx={x(spec.getG(m))} cy={y(m.depth)} r={m.depth === activeDepth ? 4.5 : 2.6} className="va-dot va-dot--g" />
              )}
              {Number.isFinite(spec.getA(m)) && (
                <circle cx={x(spec.getA(m))} cy={y(m.depth)} r={m.depth === activeDepth ? 5 : 3} className="va-dot va-dot--a" />
              )}
            </g>
          ))}

          {active && (
            <g className="va-bubble" transform={`translate(${PAD.left + plotW - 4} ${Math.max(PAD.top + 14, y(active.depth) - 16)})`}>
              <rect x={-172} y={-12} width={172} height={24} rx={6} />
              <text x={-86} y={4} textAnchor="middle">
                {active.depth} m · A {spec.getA(active).toFixed(spec.digits)} · G {spec.getG(active).toFixed(spec.digits)}
              </text>
            </g>
          )}

          <rect
            x={PAD.left}
            y={PAD.top}
            width={plotW}
            height={plotH}
            fill="transparent"
            onPointerMove={handlePointer}
            onPointerDown={handlePointer}
            onPointerLeave={() => onActiveDepthChange(null)}
          />
        </svg>
      </div>
    </figure>
  );
}

export function ValidationCharts({
  metrics,
  activeDepth,
  onActiveDepthChange,
}: ValidationChartsProps) {
  return (
    <div className="va-charts">
      {CHARTS.map((spec) => (
        <MetricChart
          key={spec.title}
          spec={spec}
          metrics={metrics}
          activeDepth={activeDepth}
          onActiveDepthChange={onActiveDepthChange}
        />
      ))}
    </div>
  );
}
