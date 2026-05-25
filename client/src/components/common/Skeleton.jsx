import clsx from "clsx";

export const Skeleton = ({ className }) => (
  <div className={clsx("relative overflow-hidden rounded-2xl bg-white/[0.06]", className)}>
    <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.6s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
  </div>
);

export const CardSkeleton = () => <Skeleton className="h-36" />;

export const ChartSkeleton = () => <Skeleton className="h-80" />;

export const TransactionSkeleton = () => (
  <div className="space-y-3">
    {Array.from({ length: 5 }).map((_, index) => (
      <div key={index} className="flex items-center gap-3">
        <Skeleton className="h-11 w-11 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-3 w-1/2" />
        </div>
        <Skeleton className="h-5 w-20" />
      </div>
    ))}
  </div>
);
