import { cn } from '../../lib/utils';
import { formatWei } from '../../lib/utils';

interface StakeDisplayProps {
  entryFeeWei: string;
  className?: string;
  showLabel?: boolean;
}

export function StakeDisplay({ entryFeeWei, className, showLabel = true }: StakeDisplayProps) {
  const isFree = entryFeeWei === '0';

  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      {showLabel && (
        <span className="text-muted-foreground text-sm">Stake:</span>
      )}
      <span
        className={cn(
          'font-semibold text-sm',
          isFree ? 'text-green-400' : 'text-yellow-400'
        )}
      >
        {formatWei(entryFeeWei)}
      </span>
    </div>
  );
}
