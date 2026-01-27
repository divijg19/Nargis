"use client";

type MessageProps = {
  role: "user" | "assistant";
  text: string;
  ts?: number;
  thoughts?: string[];
};

export default function Message({ role, text, ts, thoughts }: MessageProps) {
  const time = ts
    ? new Date(ts).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
    : undefined;

  return (
    <div
      className={`message message--${role}`}
      role={role === "assistant" ? "article" : "note"}
      aria-live={role === "assistant" ? "polite" : undefined}
    >
      <div
        className="message__meta"
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: "6px",
        }}
      >
        <div className="message__who text-xs font-medium">
          {role === "user" ? "You" : "Nargis"}
        </div>
        {time && (
          <div className="message__time text-[11px] text-muted-foreground">
            {time}
          </div>
        )}
      </div>
      <div className="message__body whitespace-pre-wrap text-sm leading-relaxed">
        {text}
      </div>
      {thoughts && thoughts.length > 0 && (
        <div className="message__thoughts text-xs text-muted-foreground mt-2">
          {thoughts.map((t, i) => (
            <div
              key={`${i}-${String(t).slice(0, 30)}`}
              className="inline-block mr-2"
            >
              {t}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
