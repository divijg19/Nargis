"use client";
// React import not needed (using automatic runtime)
import { useToasts } from "@/contexts/ToastContext";

export function ToastViewport() {
	const { toasts, dismiss } = useToasts();
	return (
		<div className="fixed top-20 right-6 left-6 sm:left-auto sm:right-6 flex flex-col gap-2 z-50 items-end">
			{toasts.map((t) => {
				// Prefer explicit typed toasts (recommended). If `type` is present,
				// map it to a visual variant + icon. Otherwise fall back to the older
				// `variant` property and message-based matching for compatibility.
				let computedVariant = variantClass(t.variant);
				let icon = variantIcon(t.variant);

				if (t.type === "recording-started") {
					computedVariant = "toast--info"; // blue
					icon = (
						<svg
							viewBox="0 0 24 24"
							width={20}
							height={20}
							fill="none"
							stroke="currentColor"
							strokeWidth={2.2}
							aria-hidden={true}
						>
							<path strokeLinecap="round" strokeLinejoin="round" d="M12 1v11" />
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								d="M8 12a4 4 0 0 0 8 0V5a4 4 0 0 0-8 0v7z"
							/>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								d="M5 15a7 7 0 0 0 14 0"
							/>
							<path strokeLinecap="round" strokeLinejoin="round" d="M12 19v3" />
						</svg>
					);
				} else if (t.type === "recording-stopped") {
					computedVariant = "toast--success"; // green
					icon = (
						<svg
							viewBox="0 0 24 24"
							width={20}
							height={20}
							fill="none"
							stroke="currentColor"
							strokeWidth={2.2}
							aria-hidden={true}
						>
							<circle cx="12" cy="12" r="9" strokeWidth={2.2} />
							<rect x="9" y="9" width="6" height="6" rx="1" ry="1" />
						</svg>
					);
				} else if (t.type === "reconnecting") {
					computedVariant = "toast--warning"; // yellow
					icon = (
						<svg
							viewBox="0 0 24 24"
							width={20}
							height={20}
							fill="none"
							stroke="currentColor"
							strokeWidth={2.2}
							aria-hidden={true}
						>
							<circle cx="6" cy="12" r="1.5" />
							<circle cx="12" cy="12" r="1.5" />
							<circle cx="18" cy="12" r="1.5" />
						</svg>
					);
				} else if (t.type === "reconnected") {
					computedVariant = "toast--success"; // green
					icon = variantIcon("success");
				} else if (t.type === "connection-error") {
					computedVariant = "toast--error"; // red
					icon = variantIcon("error");
				} else if (t.type === "transcript-ready" || t.type === "ai-response") {
					computedVariant = "toast--info"; // blue/info
					icon = (
						<svg
							viewBox="0 0 24 24"
							width={20}
							height={20}
							fill="none"
							stroke="currentColor"
							strokeWidth={2.2}
							aria-hidden={true}
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"
							/>
						</svg>
					);
				} else {
					// Backwards-compat: small heuristic for older pushes that didn't set
					// `type` but included recognizable text in the message.
					const text = (t.message || "").toLowerCase();
					if (text.includes("recording started")) {
						computedVariant = "toast--info";
						icon = variantIcon("info");
					} else if (text.includes("recording stopped")) {
						computedVariant = "toast--success";
						icon = variantIcon("success");
					} else if (text.includes("reconnect")) {
						computedVariant = "toast--warning";
						icon = variantIcon("warning");
					}
				}

				return (
					<div
						key={t.id}
						className={`toast w-full max-w-sm text-sm ${computedVariant}`}
					>
						<div className="toast-icon" aria-hidden={true}>
							{icon}
						</div>
						<div className="flex-1">
							{t.title && <p className="toast-title">{t.title}</p>}
							<p className="leading-snug whitespace-pre-wrap">{t.message}</p>
						</div>
						<button
							type="button"
							aria-label="Dismiss"
							className="toast-dismiss"
							onClick={() => dismiss(t.id)}
						>
							✕
						</button>
					</div>
				);
			})}
		</div>
	);
}

function variantClass(v?: string) {
	switch (v) {
		case "success":
			return "toast--success";
		case "error":
			return "toast--error";
		case "warning":
			return "toast--warning";
		default:
			return "toast--info";
	}
}

function variantIcon(v?: string) {
	switch (v) {
		case "success":
			return (
				<svg
					viewBox="0 0 24 24"
					width="20"
					height="20"
					fill="none"
					stroke="currentColor"
					strokeWidth={2.5}
					aria-hidden={true}
				>
					<circle cx="12" cy="12" r="9" strokeWidth={2.2} />
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						d="M7.5 12.5l2.5 2.5L16.5 9.5"
					/>
				</svg>
			);
		case "error":
			return (
				<svg
					viewBox="0 0 24 24"
					width="20"
					height="20"
					fill="none"
					stroke="currentColor"
					strokeWidth={2.5}
					aria-hidden={true}
				>
					<circle cx="12" cy="12" r="9" strokeWidth={2.2} />
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						d="M8 8l8 8M16 8l-8 8"
					/>
				</svg>
			);
		case "warning":
			return (
				<svg
					viewBox="0 0 24 24"
					width="20"
					height="20"
					fill="none"
					stroke="currentColor"
					strokeWidth={2.3}
					aria-hidden={true}
				>
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						d="M12 4.5l8.5 14.5H3.5L12 4.5z"
					/>
					<path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4" />
					<path strokeLinecap="round" strokeLinejoin="round" d="M12 16h.01" />
				</svg>
			);
		default:
			return (
				<svg
					viewBox="0 0 24 24"
					width="20"
					height="20"
					fill="none"
					stroke="currentColor"
					strokeWidth={2.3}
					aria-hidden={true}
				>
					<circle cx="12" cy="12" r="9" strokeWidth={2.2} />
					<path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4" />
					<path strokeLinecap="round" strokeLinejoin="round" d="M12 16h.01" />
				</svg>
			);
	}
}
