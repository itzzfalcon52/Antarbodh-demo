import type { CSSProperties, ElementType, ReactNode } from 'react';

interface AnimatedSectionProps {
  children: ReactNode;

  /** Ordinal used to stagger sibling reveals. */
  index?: number;

  /** 'rise' translates upward, 'fade' only changes opacity. */
  variant?: 'rise' | 'fade';

  as?: ElementType;
  className?: string;
  style?: CSSProperties;
}

/**
 * Purely presentational entrance wrapper. The animation is
 * CSS-driven and is reduced to 1ms under prefers-reduced-motion.
 */
export function AnimatedSection({
  children,
  index = 0,
  variant = 'rise',
  as: Tag = 'div',
  className,
  style,
}: AnimatedSectionProps) {
  const classes = [
    variant === 'rise' ? 'ab-rise' : 'ab-fade',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <Tag
      className={classes}
      style={{ ['--stagger' as string]: index, ...style }}
    >
      {children}
    </Tag>
  );
}
