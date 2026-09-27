import { useEffect, useRef, useState } from 'react';

/**
 * The landing page is read as a dive: every section carries the
 * standard depth it represents (data-depth) and whether it sits in
 * the warm surface water or the dark deep (data-tone).
 */

export type Tone = 'light' | 'dark';

export function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/** Runs `onFrame` at most once per animation frame on scroll/resize. */
export function useScrollFrame(onFrame: () => void) {
  const callback = useRef(onFrame);

  useEffect(() => {
    callback.current = onFrame;
  });

  useEffect(() => {
    let frame = 0;

    const run = () => {
      frame = 0;
      callback.current();
    };

    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(run);
    };

    run();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
    };
  }, []);
}

/** True once the element has entered the viewport; never resets. */
export function useInView<T extends Element>(rootMargin = '0px 0px -12% 0px') {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node || inView) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [inView, rootMargin]);

  return [ref, inView] as const;
}

/** The tone of whichever section is under viewport line `y`. */
export function toneAt(y: number): Tone {
  // Scoped to <main> so the nav and gauge, which carry their own
  // data-tone, never match themselves.
  const sections = document.querySelectorAll<HTMLElement>('main [data-tone]');

  for (const section of sections) {
    const { top, bottom } = section.getBoundingClientRect();
    if (top <= y && bottom > y) {
      return section.dataset.tone === 'dark' ? 'dark' : 'light';
    }
  }

  return 'light';
}

/**
 * Depth in metres at viewport line `y`, interpolated between the
 * depth of the section under the line and the one after it. The
 * smoothstep holds each section near its own depth at its edges so
 * the reading settles while a section is being read.
 */
export function depthAt(y: number): number {
  const sections = Array.from(
    document.querySelectorAll<HTMLElement>('[data-depth]'),
  );

  for (let i = 0; i < sections.length; i++) {
    const { top, height } = sections[i].getBoundingClientRect();
    const from = Number(sections[i].dataset.depth);
    const to = Number(sections[i + 1]?.dataset.depth ?? from);

    if (y < top) return i === 0 ? 0 : from;
    if (y < top + height) {
      const t = (y - top) / Math.max(height, 1);
      return from + t * t * (3 - 2 * t) * (to - from);
    }
  }

  return Number(sections[sections.length - 1]?.dataset.depth ?? 0);
}
