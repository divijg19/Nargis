import type { ActionButtonProps } from "@/types";
import { cn } from "@/utils";

/**
 * Action button component with variants
 * Converted from Vue ActionButton.vue
 */
export function ActionButton({
    icon,
    label,
    variant = "secondary",
    size = "md",
    onClick,
    disabled = false,
    className,
    loading = false,
    iconPosition = "left",
}: ActionButtonProps) {
    const baseClasses =
        "inline-flex items-center justify-center font-medium rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";

    const variantClasses = {
        primary:
            "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 dark:bg-blue-500 dark:hover:bg-blue-600",
        secondary:
            "bg-gray-100 text-gray-900 hover:bg-gray-200 focus:ring-gray-500 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600",
        danger:
            "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 dark:bg-red-500 dark:hover:bg-red-600",
    };

    const sizeClasses = {
        sm: "px-3 py-2 text-sm",
        md: "px-4 py-2 text-sm",
        lg: "px-6 py-3 text-base",
    };

    const content = (
        <>
            {icon && iconPosition === "left" && (
                <span className="text-lg mr-2" aria-hidden>
                    {icon}
                </span>
            )}
            <span>{label}</span>
            {icon && iconPosition === "right" && (
                <span className="text-lg ml-2" aria-hidden>
                    {icon}
                </span>
            )}
            {loading && (
                <span
                    className="ml-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent align-middle"
                    aria-hidden
                />
            )}
        </>
    );
    return (
        <button
            type="button"
            onClick={!loading ? onClick : undefined}
            aria-disabled={disabled || loading}
            disabled={disabled || loading}
            className={cn(
                baseClasses,
                variantClasses[variant],
                sizeClasses[size],
                loading && "opacity-80 cursor-progress",
                className,
            )}
        >
            {content}
        </button>
    );
}
