import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

const SIZES = {
  sm: { width: '26px', height: '26px' },
  md: { width: '34px', height: '34px' },
  lg: { width: '42px', height: '42px' },
} as const;

export function IconButton({
  children,
  size = 'md',
  style,
  className,
  ...props
}: IconButtonProps) {
  return (
    <button
      className={['icon-btn', className ?? ''].filter(Boolean).join(' ')}
      style={{ ...SIZES[size], ...style }}
      {...props}
    >
      {children}
    </button>
  );
}
