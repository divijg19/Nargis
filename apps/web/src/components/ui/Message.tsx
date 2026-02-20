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
    <div className={`message message--${role}`}>
      <div className="message__meta flex items-center justify-between mb-1.5">
        <div className="message__who text-[13px] font-medium tracking-[0.01em] text-muted-foreground">
          {role === "user" ? "You" : "Nargis"}
        </div>
        {time && (
          <div className="message__time text-[12px] text-muted-foreground/90">
            {time}
          </div>
        )}
      </div>
      <div className="message__body whitespace-pre-wrap text-base leading-relaxed text-foreground">
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
