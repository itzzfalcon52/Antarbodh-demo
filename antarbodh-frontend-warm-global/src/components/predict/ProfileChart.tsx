import {
  useCallback,
  useId,
  useMemo,
  useState,
  type PointerEvent,
} from 'react';

import { DEPTH_AXIS_TICKS, depthFraction } from '../../lib/depthScale';
import {
  DEPTH_GROUPS,
  temperatureColor,
  type CoolingLayer,
  type ProfileLevel,
} from '../../lib/profileStats';

import '../../styles/predict-result.css';

interface ProfileChartProps {
  levels: ProfileLevel[];
  cooling: CoolingLayer | null;
  activeDepth: number | null;
  onActiveDepthChange: (depth: number | null) => void;
  /** Colour for a temperature; defaults to the saffron-to-indigo ramp
   *  scaled to this profile. Explore passes the map's absolute scale. */
  colorFor?: (temp: number) => string;
  /** Called with the nearest level when the plot is clicked. */
  onDepthClick?: (depth: number) => void;
}

const MAX_DEPTH = 1000;

// Below this width the depth-group labels move inside the plot.
const COMPACT_WIDTH = 400;

const PAD_TOP = 30;
const PAD_BOTTOM = 46;
const PAD_LEFT = 46;

// Band edges sit halfway between the last level of one group and the
// first of the next, so each shaded band contains exactly its levels.
const BANDS = DEPTH_GROUPS.map((group, i) => {
  const first = group.depths[0];
  const last = group.depths[group.depths.length - 1];
  const prev = DEPTH_GROUPS[i - 1]?.depths;
  const next = DEPTH_GROUPS[i + 1]?.depths;

  return {
    title: group.title,
    top: prev ? (prev[prev.length - 1] + first) / 2 : 0,
    bottom: next ? (last + next[0]) / 2 : MAX_DEPTH,
  };
});

/**
 * The chart is drawn at its real pixel width (measured) rather than
 * scaled from a fixed viewBox, so labels stay legible on a phone.
 */
export function ProfileChart({
  levels,
  cooling,
  activeDepth,
  onActiveDepthChange,
  colorFor,
  onDepthClick,
}: ProfileChartProps) {
  const id = useId();
  const [width, setWidth] = useState(540);

  // Measured once synchronously on mount (so the first paint is
  // already the right size), then kept in sync by a ResizeObserver.
  const frame = useCallback((node: HTMLDivElement | null) => {
    if (!node) return;

    setWidth(Math.round(node.getBoundingClientRect().width));

    const observer = new ResizeObserver(([entry]) => {
      setWidth(Math.round(entry.contentRect.width));
    });

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const W = Math.max(280, width);
  const H = Math.round(Math.min(460, Math.max(360, W * 0.8)));
  const compact = W < COMPACT_WIDTH;
  const PAD = { top: PAD_TOP, right: compact ? 14 : 104, bottom: PAD_BOTTOM, left: PAD_LEFT };
  const PLOT_W = W - PAD.left - PAD.right;
  const PLOT_H = H - PAD.top - PAD.bottom;

  const scale = useMemo(() => {
    const temps = levels.map((l) => l.temp);
    const min = Math.floor(Math.min(...temps) - 0.5);
    const max = Math.ceil(Math.max(...temps) + 0.5);
    const step = max - min > 12 ? 5 : 2;

    const ticks: number[] = [];
    for (let t = Math.ceil(min / step) * step; t <= max; t += step) ticks.push(t);

    return {
      ticks,
      x: (temp: number) => PAD_LEFT + ((temp - min) / Math.max(1, max - min)) * PLOT_W,
      y: (depth: number) => PAD_TOP + depthFraction(depth, MAX_DEPTH) * PLOT_H,
      tempMin: Math.min(...temps),
      tempMax: Math.max(...temps),
    };
  }, [levels, PLOT_W, PLOT_H]);

  if (levels.length < 2) {
    return (
      <div ref={frame} className="pr-chart-empty">
        Not enough valid levels to draw a profile.
      </div>
    );
  }

  const points = levels.map((l) => ({ ...l, x: scale.x(l.temp), y: scale.y(l.depth) }));
  const first = points[0];
  const last = points[points.length - 1];

  const line = points.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  const area =
    `${line} L${PAD.left} ${last.y.toFixed(1)}` +
    ` L${PAD.left} ${first.y.toFixed(1)} Z`;

  const active = points.find((p) => p.depth === activeDepth) ?? null;

  const coolFrom = cooling && points.find((p) => p.depth === cooling.from.depth);
  const coolTo = cooling && points.find((p) => p.depth === cooling.to.depth);

  const nearestTo = (event: PointerEvent<SVGRectElement>) => {
    const svg = event.currentTarget.ownerSVGElement;
    if (!svg) return null;

    const box = svg.getBoundingClientRect();
    const y = ((event.clientY - box.top) / box.height) * H;

    let nearest = first;
    for (const p of points) {
      if (Math.abs(p.y - y) < Math.abs(nearest.y - y)) nearest = p;
    }

    return nearest;
  };

  const handlePointer = (event: PointerEvent<SVGRectElement>) => {
    const nearest = nearestTo(event);
    if (nearest) onActiveDepthChange(nearest.depth);
  };

  const handleClick = (event: PointerEvent<SVGRectElement>) => {
    const nearest = nearestTo(event);
    if (nearest) onDepthClick?.(nearest.depth);
  };

  const colorOf = (temp: number) =>
    colorFor ? colorFor(temp) : temperatureColor(temp, scale.tempMin, scale.tempMax);

  // Keep the read-out bubble inside the plot.
  const bubbleOnLeft = active ? active.x > PAD.left + PLOT_W - 120 : false;

  return (
    <div ref={frame} className="pr-chart-frame">
      <svg
        className="pr-chart"
        width={W}
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`Temperature against depth, from ${first.temp.toFixed(1)} °C at the surface to ${last.temp.toFixed(1)} °C at ${last.depth} m.`}
      >
        <defs>
          <linearGradient
            id={`${id}-depth`}
            gradientUnits="userSpaceOnUse"
            x1="0"
            y1={first.y}
            x2="0"
            y2={last.y}
          >
            {points.map((p) => (
              <stop
                key={p.depth}
                offset={(p.y - first.y) / Math.max(1, last.y - first.y)}
                stopColor={colorOf(p.temp)}
              />
            ))}
          </linearGradient>
        </defs>

        {/* Depth groups */}
        {BANDS.map((band, i) => {
          const y0 = scale.y(band.top);
          const y1 = scale.y(band.bottom);

          // In compact mode the label sits inside the band, on the side
          // away from where the profile runs through it.
          const inBand = points.filter((p) => p.depth >= band.top && p.depth <= band.bottom);
          const curveX = inBand.length
            ? inBand.reduce((sum, p) => sum + p.x, 0) / inBand.length
            : PAD.left + PLOT_W / 2;
          const labelOnLeft = curveX > PAD.left + PLOT_W / 2;

          return (
            <g key={band.title}>
              <rect
                x={PAD.left}
                y={y0}
                width={PLOT_W}
                height={y1 - y0}
                className={i % 2 ? 'pr-band pr-band--alt' : 'pr-band'}
              />
              {compact ? (
                <text
                  x={labelOnLeft ? PAD.left + 6 : PAD.left + PLOT_W - 6}
                  y={(y0 + y1) / 2 + 4}
                  textAnchor={labelOnLeft ? 'start' : 'end'}
                  className="pr-band-label"
                >
                  {band.title}
                </text>
              ) : (
                <>
                  <line x1={PAD.left + PLOT_W + 10} x2={PAD.left + PLOT_W + 10} y1={y0 + 2} y2={y1 - 2} className="pr-band-rule" />
                  <text x={PAD.left + PLOT_W + 18} y={(y0 + y1) / 2 + 3} className="pr-band-label">
                    {band.title}
                  </text>
                </>
              )}
            </g>
          );
        })}

        {/* Depth axis */}
        {DEPTH_AXIS_TICKS.map((d) => (
          <g key={d}>
            <line x1={PAD.left} x2={PAD.left + PLOT_W} y1={scale.y(d)} y2={scale.y(d)} className="pr-grid" />
            <text x={PAD.left - 9} y={scale.y(d) + 3.5} textAnchor="end" className="pr-tick">
              {d}
            </text>
          </g>
        ))}

        {/* Temperature axis */}
        {scale.ticks.map((t) => (
          <g key={t}>
            <line x1={scale.x(t)} x2={scale.x(t)} y1={PAD.top} y2={PAD.top + PLOT_H} className="pr-grid pr-grid--v" />
            <text x={scale.x(t)} y={PAD.top + PLOT_H + 18} textAnchor="middle" className="pr-tick">
              {t}°
            </text>
          </g>
        ))}

        <line x1={PAD.left} x2={PAD.left} y1={PAD.top - 8} y2={PAD.top + PLOT_H} className="pr-axis" />
        <line x1={PAD.left} x2={PAD.left + PLOT_W} y1={PAD.top + PLOT_H} y2={PAD.top + PLOT_H} className="pr-axis" />

        <text x={PAD.left} y={PAD.top - 14} className="pr-axis-title">
          Depth (m)
        </text>
        <text x={PAD.left + PLOT_W / 2} y={H - 6} textAnchor="middle" className="pr-axis-title">
          Temperature (°C)
        </text>

        {/* Profile */}
        <path d={area} fill={`url(#${id}-depth)`} className="pr-area" />
        <path d={line} stroke={`url(#${id}-depth)`} className="pr-line" />

        {/* The profile runs from upper right to lower left, so the space
            below and to the right of any segment is always clear. */}
        {coolFrom && coolTo && cooling && (() => {
          const mx = (coolFrom.x + coolTo.x) / 2;
          const my = (coolFrom.y + coolTo.y) / 2;
          const labelX = Math.min(mx + 30, PAD.left + PLOT_W - 118);

          return (
            <g className="pr-cooling">
              <line x1={coolFrom.x} y1={coolFrom.y} x2={coolTo.x} y2={coolTo.y} className="pr-cooling__segment" />
              <polyline
                points={`${mx + 5},${my + 5} ${mx + 20},${my + 24} ${labelX - 4},${my + 24}`}
                className="pr-cooling__leader"
              />
              <text x={labelX} y={my + 27} className="pr-cooling__label">
                Steepest cooling
              </text>
              <text x={labelX} y={my + 41} className="pr-cooling__value">
                −{cooling.dropPer10m.toFixed(2)} °C per 10 m
              </text>
            </g>
          );
        })()}

        {/* Crosshair for the active level */}
        {active && (
          <g className="pr-crosshair" pointerEvents="none">
            <line x1={PAD.left} x2={active.x} y1={active.y} y2={active.y} />
            <line x1={active.x} x2={active.x} y1={active.y} y2={PAD.top + PLOT_H} />
          </g>
        )}

        {points.map((p) => (
          <circle
            key={p.depth}
            cx={p.x}
            cy={p.y}
            r={p.depth === activeDepth ? 5.5 : 3}
            fill={p.depth === activeDepth ? colorOf(p.temp) : 'var(--color-panel)'}
            stroke={colorOf(p.temp)}
            className="pr-point"
          />
        ))}

        {active && (
          <g
            className="pr-bubble"
            transform={`translate(${bubbleOnLeft ? active.x - 12 : active.x + 12} ${active.y})`}
            pointerEvents="none"
          >
            <rect x={bubbleOnLeft ? -112 : 0} y={-13} width={112} height={26} rx={6} />
            <text x={bubbleOnLeft ? -56 : 56} y={4} textAnchor="middle">
              {active.depth} m · {active.temp.toFixed(2)} °C
            </text>
          </g>
        )}

        {/* Hover capture */}
        <rect
          x={PAD.left}
          y={PAD.top - 8}
          width={PLOT_W}
          height={PLOT_H + 16}
          fill="transparent"
          style={onDepthClick ? { cursor: 'pointer' } : undefined}
          onPointerMove={handlePointer}
          onPointerDown={handlePointer}
          onPointerUp={onDepthClick ? handleClick : undefined}
          onPointerLeave={() => onActiveDepthChange(null)}
        />
      </svg>
    </div>
  );
}
