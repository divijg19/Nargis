"use client";

type InfoControlProps = {
  onClick: () => void;
  label?: string;
};

export function InfoControl({
  onClick,
  label = "Open onboarding help",
}: InfoControlProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="onboarding-info-btn"
    >
      <svg
        className="h-4 w-4"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.75}
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 8h.01M11 12h1v4h1"
        />
        <circle cx="12" cy="12" r="9" />
      </svg>
    </button>
  );
}
