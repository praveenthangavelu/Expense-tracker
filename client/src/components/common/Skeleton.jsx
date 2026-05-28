import clsx from "clsx";

export const Skeleton = ({ className }) => (
  <div className={clsx("relative overflow-hidden rounded-[10px] bg-[var(--skeleton-base)] border border-[var(--border-subtle)]", className)}>
    <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-[linear-gradient(135deg,transparent,var(--skeleton-shimmer),transparent)] blur-[2px]" />
  </div>
);

export const SkeletonCard = ({ className }) => <Skeleton className={clsx("h-36", className)} />;
export const CardSkeleton = SkeletonCard; // compatibility alias

export const SkeletonChart = ({ className }) => <Skeleton className={clsx("h-80", className)} />;
export const ChartSkeleton = SkeletonChart; // compatibility alias

export const SkeletonCircle = ({ className }) => <Skeleton className={clsx("h-11 w-11 rounded-full", className)} />;

export const SkeletonRow = ({ className }) => (
  <div className={clsx("flex items-center gap-3", className)}>
    <SkeletonCircle />
    <div className="flex-1 space-y-2">
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-3 w-1/2" />
    </div>
    <Skeleton className="h-5 w-20" />
  </div>
);

export const TransactionSkeleton = () => (
  <div className="space-y-4">
    {Array.from({ length: 5 }).map((_, index) => (
      <SkeletonRow key={index} />
    ))}
  </div>
);
