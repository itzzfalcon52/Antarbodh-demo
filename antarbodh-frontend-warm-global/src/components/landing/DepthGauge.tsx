import { useState } from 'react';

import { TARGET_DEPTHS } from '../../lib/constants';
import { depthFraction } from '../../lib/depthScale';
import { depthAt, toneAt, useScrollFrame, type Tone } from './dive';

const LABELLED = new Set([0, 100, 500, 1000]);

/**
 * A fixed rail with the model's 15 standard depths. As the reader
 * scrolls, the marker descends to the depth of the section in view.
 */
export function DepthGauge() {
  const [depth, setDepth] = useState(0);
  const [tone, setTone] = useState<Tone>('light');

  useScrollFrame(() => {
    setDepth(depthAt(window.innerHeight * 0.3));
    setTone(toneAt(window.innerHeight / 2));
  });

  const metres = Math.floor(depth);

  return (
    <div className="l-gauge" data-tone={tone} aria-hidden="true">
      <div className="l-gauge__rail">
        {TARGET_DEPTHS.map((level) => (
          <span
            key={level}
            className="l-gauge__tick"
            data-passed={depth >= level}
            data-labelled={LABELLED.has(level)}
            style={{ top: `${depthFraction(level) * 100}%` }}
          >
            {LABELLED.has(level) && (
              <span className="l-gauge__label">{level}</span>
            )}
          </span>
        ))}

        <span
          className="l-gauge__fill"
          style={{ height: `${depthFraction(depth) * 100}%` }}
        />

        <span
          className="l-gauge__marker"
          style={{ top: `${depthFraction(depth) * 100}%` }}
        >
          {metres.toLocaleString('en-IN')} m
        </span>
      </div>
    </div>
  );
}
