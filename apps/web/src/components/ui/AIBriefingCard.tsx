type AIBriefingCardProps = {
  loading: boolean;
  content: string | null;
  updatedAt?: Date;
  error: string | null;
};

export function AIBriefingCard({
  loading,
  content,
  updatedAt,
  error,
}: AIBriefingCardProps) {
  const hasBriefing = Boolean(content && content.trim().length > 0);

  return (
    <section
      aria-live="polite"
      className="rounded-2xl bg-linear-to-r from-emerald-500/30 via-cyan-500/20 to-sky-500/30 p-px shadow-sm"
    >
      <div className="rounded-2xl border border-cyan-300/30 bg-card/95 p-4 sm:p-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-lg" aria-hidden="true">
              ✨
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
          <div
            className="space-y-2 animate-pulse"
            role="status"
            aria-label="Loading briefing"
          >
            <div className="h-3 w-full rounded bg-cyan-200/50 dark:bg-cyan-800/40" />
            <div className="h-3 w-11/12 rounded bg-cyan-200/50 dark:bg-cyan-800/40" />
            <div className="h-3 w-9/12 rounded bg-cyan-200/50 dark:bg-cyan-800/40" />
          </div>
        ) : hasBriefing ? (
          <p className="text-sm leading-6 text-foreground/90 sm:text-base">
            {content}
          </p>
        ) : (
          <p className="text-sm leading-6 text-muted-foreground sm:text-base">
            {error ||
              "No proactive briefing yet. Nargis will post your next Morning Briefing after the next scheduler run."}
          </p>
        )}
      </div>
    </section>
  );
}
