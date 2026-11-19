export function BuildBar({
  value,
  total,
  color = 'var(--signal)',
  label,
}: {
  value: number;
  total: number;
  color?: string;
  label?: string;
}) {
  const ratio = total > 0 ? value / total : 0;
  const width = Math.min(100, Math.round(ratio * 100));
  return (
    <div
      className={`build-bar${ratio > 1 ? ' over' : ''}`}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(ratio * 100)}
      aria-label={label}
    >
      <span style={{ width: `${width}%`, background: color }} />
    </div>
  );
}
