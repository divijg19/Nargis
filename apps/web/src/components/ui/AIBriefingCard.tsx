import { Sparkles } from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";

type AIBriefingCardProps = {
  loading: boolean;
  content: string | null;
  updatedAt?: Date;
};

export function AIBriefingCard({
  loading,
  content,
  updatedAt,
}: AIBriefingCardProps) {
  const hasBriefing = Boolean(content && content.trim().length > 0);

  if (!loading && !hasBriefing) {
    return null;
  }

  return (
    <section
      aria-live="polite"
      className="rounded-2xl border border-blue-200/70 bg-blue-50/50 p-4 shadow-sm dark:border-blue-500/20 dark:bg-blue-900/10 sm:p-5"
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-blue-200/80 bg-white/70 text-blue-600 dark:border-blue-400/30 dark:bg-blue-900/20 dark:text-blue-300">
            <Sparkles className="h-4 w-4" aria-hidden="true" />
          </span>
          <h2 className="text-base font-semibold text-foreground sm:text-lg">
            Morning Briefing
          </h2>
        </div>
        {updatedAt ? (
          <span className="text-xs text-muted-foreground">
            Updated{" "}
            {updatedAt.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        ) : null}
      </div>

      {loading ? (
        <div className="space-y-2" role="status" aria-label="Loading briefing">
          <Skeleton className="h-3 w-full rounded-sm bg-blue-200/60 dark:bg-blue-800/35" />
          <Skeleton className="h-3 w-11/12 rounded-sm bg-blue-200/60 dark:bg-blue-800/35" />
          <Skeleton className="h-3 w-9/12 rounded-sm bg-blue-200/60 dark:bg-blue-800/35" />
        </div>
      ) : (
        <p className="whitespace-pre-wrap text-sm leading-6 text-foreground/90 sm:text-base">
          {content}
        </p>
      )}
    </section>
  );
}
