interface SkeletonProps {
  className?: string;
}
export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      aria-hidden
      className={`animate-pulse rounded-md bg-gray-200 dark:bg-gray-700 ${className || ""}`}
    />
  );
}
