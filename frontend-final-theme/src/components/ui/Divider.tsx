interface DividerProps {
  /** Vertical spacing around the rule. */
  spacing?: string;
}

export function Divider({ spacing = 'var(--space-5)' }: DividerProps) {
  return (
    <div
      role="separator"
      className="rule"
      style={{ margin: `${spacing} 0` }}
    />
  );
}
