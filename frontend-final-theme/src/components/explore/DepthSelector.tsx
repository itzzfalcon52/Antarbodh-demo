import {
  UPPER_OCEAN,
  THERMOCLINE,
  DEEP_OCEAN,
} from '../../lib/constants';

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
  return (
    <div className="depth-selector">
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
