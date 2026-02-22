"use client";

import { CheckIcon, ClipboardDocumentIcon } from "@heroicons/react/24/outline";

export type SidebarPrompt = {
  title: string;
  subtitle: string;
  prompt: string;
  icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
};

export function PromptList({
  prompts,
  compact,
  copiedIndex,
  onSelect,
  onCopy,
  mobile,
}: {
  prompts: SidebarPrompt[];
  compact?: boolean;
  copiedIndex: number | null;
  onSelect: (prompt: string) => void;
  onCopy: (prompt: string, idx: number) => void;
  mobile?: boolean;
}) {
  if (compact) {
    return (
      <div className="flex flex-col items-center space-y-3 py-4">
        {prompts.map((p) => {
          const Icon = p.icon;
          return (
            <button
              key={p.title}
              type="button"
              onClick={() => onSelect(p.prompt)}
              title={p.title}
              aria-label={p.title}
              className="p-2 rounded-md border border-transparent hover:border-border/30 hover:bg-hover/20 transition-[color,background-color,border-color,opacity,box-shadow,transform]"
            >
              {Icon ? (
                <div className="w-8 h-8 flex items-center justify-center text-muted-foreground">
                  <Icon className="w-4 h-4" aria-hidden />
                </div>
              ) : (
                <svg
                  className="w-5 h-5 text-muted-foreground"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M4 6h16M4 12h16M4 18h8"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-3">
      {prompts.map((p, idx) => {
        const Icon = p.icon;
        return (
          <div key={p.title} className="relative">
            <button
              type="button"
              onClick={() => onSelect(p.prompt)}
              className={
                mobile
                  ? "w-full flex items-center justify-between p-3 rounded-lg border-l-2 border-transparent bg-transparent hover:bg-hover/20 hover:border-border/60 transition-[color,background-color,border-color,opacity,box-shadow,transform]"
                  : "w-full flex items-center justify-between p-3 rounded-lg border-l-2 border-transparent bg-transparent hover:bg-hover/20 hover:border-border/60 transition-[color,background-color,border-color,opacity,box-shadow,transform]"
              }
            >
              {mobile ? (
                <>
                  <div className="flex-1 text-left">
                    <p className="nav-label text-sm font-medium text-foreground">
                      {p.title}
                    </p>
                  </div>
                  <div className="shrink-0 ml-3 text-right">
                    <p className="nav-label text-xs text-muted-foreground">
                      {p.subtitle}
                    </p>
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-3">
                  {Icon && (
                    <div className="w-8 h-8 flex items-center justify-center text-muted-foreground">
                      <Icon className="w-4 h-4" aria-hidden />
                    </div>
                  )}
                  <div className="text-left">
                    <p className="nav-label text-sm font-medium text-foreground">
                      {p.title}
                    </p>
                    <p className="nav-label text-xs text-muted-foreground mt-0.5">
                      {p.subtitle}
                    </p>
                  </div>
                </div>
              )}
            </button>
            <button
              type="button"
              onClick={() => onCopy(p.prompt, idx)}
              aria-label={`Copy prompt ${p.title}`}
              className="absolute right-2 top-2 p-1 rounded text-muted-foreground hover:text-foreground"
            >
              {copiedIndex === idx ? (
                <CheckIcon className="w-4 h-4 text-green-400" />
              ) : (
                <ClipboardDocumentIcon className="w-4 h-4" />
              )}
            </button>
          </div>
        );
      })}
    </div>
  );
}
