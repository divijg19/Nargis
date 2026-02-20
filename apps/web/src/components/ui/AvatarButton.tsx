"use client";

type AvatarButtonProps = {
  onClick: () => void;
  label?: string;
};

export function AvatarButton({
  onClick,
  label = "Account",
}: AvatarButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-card border border-structural text-foreground opacity-95 transition-[transform,opacity] duration-(--motion-medium) hover:scale-[1.03] hover:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/35"
      aria-label={label}
      title={label}
    >
      <svg
        className="h-5 w-5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.75}
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15.75 6.75a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.5 19.25a7.5 7.5 0 0115 0"
        />
      </svg>
    </button>
  );
}
