import { useEffect, useState } from 'react';

import { prefersReducedMotion, useInView } from './dive';

interface StatCounterProps {
  value: number;
  decimals?: number;
  unit?: string;
  label: string;
}

const DURATION_MS = 1400;

export function StatCounter({
  value,
  decimals = 0,
  unit,
  label,
}: StatCounterProps) {
  const [ref, inView] = useInView<HTMLDivElement>();
  const [shown, setShown] = useState(() =>
    prefersReducedMotion() ? value : 0,
  );

  useEffect(() => {
    if (!inView || prefersReducedMotion()) return;

    let frame = 0;
    const start = performance.now();

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / DURATION_MS);
      const eased = 1 - Math.pow(1 - t, 4);
      setShown(value * eased);
      if (t < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [inView, value]);

  const formatted = shown.toLocaleString('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return (
    <div ref={ref} className="l-stat">
      <div className="l-stat__value">
        {/* Screen readers get the final figure, not the count-up. */}
        <span aria-hidden="true">{formatted}</span>
        <span className="l-sr">
          {value.toLocaleString('en-IN')}
          {unit}
        </span>
        {unit && (
          <span className="l-stat__unit" aria-hidden="true">
            {unit}
          </span>
        )}
      </div>
      <p className="l-stat__label">{label}</p>
    </div>
  );
}
