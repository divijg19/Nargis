"use client";

import { useTheme } from "@/contexts/ThemeContext";

export function ThemeToggle() {
	const { theme, resolvedTheme, toggleTheme } = useTheme();
	return (
		<button
			type="button"
			onClick={toggleTheme}
			className="relative w-9 h-9 rounded-md bg-transparent border-hairline-token hover-glass-strong transition-all duration-180 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
			aria-label={`Toggle theme, current: ${resolvedTheme}`}
			aria-pressed={resolvedTheme === "dark"}
		>
			<div className="flex items-center justify-center w-full h-full">
				{/* Use the same squarish inner container for both light and dark icons */}
				<div className="w-5 h-5 rounded-md flex items-center justify-center">
					{resolvedTheme === "light" ? (
						<svg
							className="w-4 h-4 text-amber-500"
							fill="currentColor"
							viewBox="0 0 24 24"
							aria-hidden="true"
						>
							<path d="M12 2.25a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zM7.5 12a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM18.894 6.166a.75.75 0 00-1.06-1.06l-1.591 1.59a.75.75 0 101.06 1.061l1.591-1.59zM21.75 12a.75.75 0 01-.75.75h-2.25a.75.75 0 010-1.5H21a.75.75 0 01.75.75zM17.834 18.894a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 10-1.061 1.06l1.59 1.591zM12 18a.75.75 0 01.75.75V21a.75.75 0 01-1.5 0v-2.25A.75.75 0 0112 18zM7.758 17.303a.75.75 0 00-1.061-1.06l-1.591 1.59a.75.75 0 001.06 1.061l1.591-1.59zM6 12a.75.75 0 01-.75.75H3a.75.75 0 010-1.5h2.25A.75.75 0 016 12zM6.697 7.757a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 00-1.061 1.06l1.59 1.591z" />
						</svg>
					) : (
						<svg
							className="w-4 h-4 text-indigo-500"
							fill="currentColor"
							viewBox="0 0 24 24"
							aria-hidden="true"
						>
							<path
								fillRule="evenodd"
								d="M9.528 1.718a.75.75 0 01.162.819A8.97 8.97 0 009 6a9 9 0 009 9 8.97 8.97 0 003.463-.69.75.75 0 01.981.98 10.503 10.503 0 01-9.694 6.46c-5.799 0-10.5-4.701-10.5-10.5 0-4.368 2.667-8.112 6.46-9.694a.75.75 0 01.818.162z"
								clipRule="evenodd"
							/>
						</svg>
					)}
				</div>
				{theme === "system" && (
					<span
						className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full"
						aria-hidden
					/>
				)}
				<span className="sr-only">Toggle theme (light / dark / system)</span>
			</div>
		</button>
	);
}
