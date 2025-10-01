"use client";
// React import not needed (using automatic runtime)
import { useToasts } from '@/contexts/ToastContext';

export function ToastViewport() {
    const { toasts, dismiss } = useToasts();
    return (
        <div className="fixed top-20 right-4 flex flex-col gap-2 z-50 max-w-sm">
            {toasts.map(t => (
                <div key={t.id} className={`rounded-md shadow px-4 py-3 text-sm border bg-white dark:bg-gray-800 flex items-start gap-3 ${variantClass(t.variant)}`}>
                    <div className="flex-1">
                        {t.title && <p className="font-semibold mb-0.5">{t.title}</p>}
                        <p className="leading-snug whitespace-pre-wrap">{t.message}</p>
                    </div>
                    <button type="button" aria-label="Dismiss" className="text-xs opacity-60 hover:opacity-100" onClick={() => dismiss(t.id)}>✕</button>
                </div>
            ))}
        </div>
    );
}

function variantClass(v?: string) {
    switch (v) {
        case 'success': return 'border-green-300 dark:border-green-600';
        case 'error': return 'border-red-300 dark:border-red-600';
        case 'warning': return 'border-yellow-300 dark:border-yellow-600';
        default: return 'border-gray-300 dark:border-gray-700';
    }
}
