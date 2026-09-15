import type { ButtonHTMLAttributes } from 'react';

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

export function IconButton({ children, size = 'md', style, ...props }: IconButtonProps) {
  const sizes = {
    sm: { width: '24px', height: '24px', padding: '4px' },
    md: { width: '32px', height: '32px', padding: '6px' },
    lg: { width: '40px', height: '40px', padding: '8px' }
  };

  return (
    <button
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'transparent',
        border: '1px solid transparent',
        color: 'var(--color-text-subtle)',
        borderRadius: 'var(--radius-md)',
        cursor: 'pointer',
        transition: 'var(--transition-fast)',
        outline: 'none',
        ...sizes[size],
        ...style
      }}
      {...props}
    >
      {children}
    </button>
  );
}
