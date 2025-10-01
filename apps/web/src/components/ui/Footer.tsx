import Link from "next/link";

export function Footer() {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="fixed bottom-3 left-0 right-0 z-40 px-4 sm:px-6 lg:px-8 pointer-events-none">
            <div className="max-w-4xl mx-auto">
                <div className="glass bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl rounded-xl border border-gray-200/60 dark:border-gray-700/60 shadow-lg shadow-gray-200/10 dark:shadow-gray-900/30 pointer-events-auto">
                    <div className="px-4 py-3">
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                            {/* Left - Branding */}
                            <div className="flex items-center space-x-2 text-xs">
                                <div className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                                    <span className="text-[10px]" aria-hidden="true">🌸</span>
                                </div>
                                <span className="text-gray-600 dark:text-gray-400 font-medium">
                                    Nargis © {currentYear}
                                </span>
                            </div>

                            {/* Center - Quick Links */}
                            <nav aria-label="Footer navigation" className="flex items-center space-x-3">
                                <Link
                                    href="/dashboard"
                                    className="text-xs text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors font-medium"
                                >
                                    Dashboard
                                </Link>
                                <span className="text-gray-300 dark:text-gray-700 text-xs">•</span>
                                <Link
                                    href="/tasks"
                                    className="text-xs text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors font-medium"
                                >
                                    Tasks
                                </Link>
                                <span className="text-xs text-gray-300 dark:text-gray-700">•</span>
                                <Link
                                    href="/habits"
                                    className="text-xs text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors font-medium"
                                >
                                    Habits
                                </Link>
                            </nav>

                            {/* Right - Status */}
                            <div className="flex items-center space-x-1.5 text-xs text-gray-600 dark:text-gray-400">
                                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" aria-hidden="true" />
                                <span className="font-medium">Operational</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
}
