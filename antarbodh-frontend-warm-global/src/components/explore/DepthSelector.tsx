import { useEffect, useRef } from 'react';

import {
  UPPER_OCEAN,
  THERMOCLINE,
  DEEP_OCEAN,
} from '../../lib/constants';

/**
 * Brings the selected stop into view inside the rail's own scroll
 * container (vertical on desktop, horizontal chips on phones). It
 * never scrolls the page, so changing depth from the profile chart
 * does not jump the reader back up to the rail.
 */
function revealInScroller(stop: HTMLElement) {
  for (let el = stop.parentElement; el && el !== document.body; el = el.parentElement) {
    const style = getComputedStyle(el);
    const scrollsY = /(auto|scroll)/.test(style.overflowY) && el.scrollHeight > el.clientHeight;
    const scrollsX = /(auto|scroll)/.test(style.overflowX) && el.scrollWidth > el.clientWidth;
    if (!scrollsY && !scrollsX) continue;

    const box = el.getBoundingClientRect();
    const item = stop.getBoundingClientRect();
    const pad = 8;

    if (scrollsY) {
      if (item.top < box.top) el.scrollTop -= box.top - item.top + pad;
      else if (item.bottom > box.bottom) el.scrollTop += item.bottom - box.bottom + pad;
    }

    if (scrollsX) {
      if (item.left < box.left) el.scrollLeft -= box.left - item.left + pad;
      else if (item.right > box.right) el.scrollLeft += item.right - box.right + pad;
    }

    return;
  }
}

interface DepthSelectorProps {
  selectedDepth: number;
  onDepthChange: (depth: number) => void;
}

const GROUPS: {
  title: string;
  depths: number[];
  tone: string;
}[] = [
    {
      title: 'Upper Ocean',
      depths: UPPER_OCEAN,
      tone: 'var(--depth-upper)',
    },
    {
      title: 'Thermocline',
      depths: THERMOCLINE,
      tone: 'var(--depth-thermocline)',
    },
    {
      title: 'Deep Ocean',
      depths: DEEP_OCEAN,
      tone: 'var(--depth-deep)',
    },
  ];

/**
 * A vertical depth ruler. The gradient spine on the left makes
 * the descent through the water column legible at a glance;
 * the selectable stops are unchanged in behaviour.
 */
export function DepthSelector({
  selectedDepth,
  onDepthChange,
}: DepthSelectorProps) {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stop = root.current?.querySelector<HTMLElement>('[data-selected="true"]');
    if (stop) revealInScroller(stop);
  }, [selectedDepth]);

  return (
    <div ref={root} className="depth-selector">
      {/* Depth spine — decorative */}
      <div aria-hidden="true" className="depth-spine" />

      <div
        className="depth-rail"
        role="radiogroup"
        aria-label="Depth level"
      >
        {GROUPS.map(({ title, depths, tone }) => (
          <div key={title} className="depth-group">
            <div className="depth-group__label">
              <span
                aria-hidden="true"
                style={{
                  width: '5px',
                  height: '5px',
                  borderRadius: '50%',
                  backgroundColor: tone,
                  flexShrink: 0,
                }}
              />

              <span
                className="label-scientific"
                style={{ fontSize: '0.5875rem' }}
              >
                {title}
              </span>
            </div>

            <div className="depth-stops">
              {depths.map((d) => {
                const selected = selectedDepth === d;

                return (
                  <button
                    key={d}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    aria-label={`${d} metres depth`}
                    data-selected={selected}
                    className="depth-stop"
                    onClick={() => onDepthChange(d)}
                  >
                    <span
                      aria-hidden="true"
                      className="depth-stop__tick"
                    />

                    <span className="depth-stop__value">
                      {d}
                      <span
                        style={{
                          marginLeft: '2px',
                          fontSize: '0.62rem',
                          color: 'var(--color-text-faint)',
                        }}
                      >
                        m
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
