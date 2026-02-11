interface ProgressBarProps {
  current: number;
  total: number;
  label?: string;
}

export default function ProgressBar({ current, total, label }: ProgressBarProps) {
  const pct = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-primary-600/10 border-b border-primary-500/20">
      <div
        className="flex-1 h-1.5 bg-surface-200 dark:bg-surface-700 rounded-full overflow-hidden"
        role="progressbar"
        aria-valuenow={current}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-label={label ?? `Progress: ${current} of ${total}`}
      >
        <div
          className="h-full bg-primary-500 rounded-full transition-[width] duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-primary-600 dark:text-primary-400 font-medium whitespace-nowrap">
        {label ?? `${current}/${total}`}
      </span>
    </div>
  );
}
