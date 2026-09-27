import { useMemo, useRef, useState } from 'react';

import { prefersReducedMotion, useScrollFrame } from './dive';

/**
 * A statement whose words darken one by one as it is scrolled
 * through. Assistive technology reads the full text regardless.
 */
export function RevealText({ text }: { text: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const words = useMemo(() => text.split(' '), [text]);
  const [lit, setLit] = useState(() =>
    prefersReducedMotion() ? words.length : 0,
  );

  useScrollFrame(() => {
    const node = ref.current;
    if (!node || prefersReducedMotion()) return;

    const { top, height } = node.getBoundingClientRect();
    const viewport = window.innerHeight;

    // Starts as the block enters the lower fifth of the screen and
    // completes once its end has risen past the middle.
    const start = viewport * 0.82;
    const travel = start - viewport * 0.45 + height;
    const progress = Math.min(1, Math.max(0, (start - top) / travel));

    setLit(Math.round(progress * words.length));
  });

  return (
    <p ref={ref} className="l-reveal">
      {words.map((word, index) => (
        <span key={index} data-lit={index < lit}>
          {word}{' '}
        </span>
      ))}
    </p>
  );
}
