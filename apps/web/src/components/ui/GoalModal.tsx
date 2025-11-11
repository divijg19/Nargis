"use client";

import { useState } from "react";
import type { CreateGoalRequest, Goal, SuggestedAction } from "@/types";

interface GoalModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: CreateGoalRequest) => Promise<Goal>;
    aiSuggestions?: SuggestedAction[];
}

export default function GoalModal({
    isOpen,
    onClose,
    onSubmit,
    aiSuggestions = [],
}: GoalModalProps) {
    const [step, setStep] = useState<"basic" | "ai-questions" | "review">("basic");
    const [formData, setFormData] = useState<CreateGoalRequest>({
        title: "",
        description: "",
        category: "personal",
        deadline: undefined,
    });
    const [aiAnswers, setAiAnswers] = useState<Record<number, string>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    const aiQuestions = [
        "What's your main motivation for this goal?",
        "What would success look like?",
        "What challenges might you face?",
    ];

    if (!isOpen) return null;

    const handleBasicSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.title.trim()) return;
        setStep("ai-questions");
    };

    const handleAiQuestionsSubmit = () => {
        setStep("review");
    };

    const handleFinalSubmit = async () => {
        setIsSubmitting(true);
        try {
            // Enhance description with AI answers
            const enhancedDescription =
                formData.description +
                (Object.keys(aiAnswers).length > 0
                    ? `\n\nInsights:\n${Object.entries(aiAnswers)
                        .map(([idx, answer]) => `- ${aiQuestions[Number(idx)]}: ${answer}`)
                        .join("\n")}`
                    : "");

            await onSubmit({
                ...formData,
                description: enhancedDescription,
            });
            handleClose();
        } catch (error) {
            console.error("Failed to create goal:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        setStep("basic");
        setFormData({
            title: "",
            description: "",
            category: "personal",
            deadline: undefined,
        });
        setAiAnswers({});
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 md:p-8">
            <button
                type="button"
                className="absolute inset-0 bg-black/40 backdrop-blur-sm cursor-default"
                onClick={handleClose}
                aria-label="Close modal"
            />
            <div className="relative w-full max-w-2xl bg-background rounded-2xl border shadow-2xl transform transition-all duration-200 max-h-[90vh] overflow-auto">
                {/* Header */}
                <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-brand flex items-center justify-center shadow-inner">
                                <span className="text-lg text-white" aria-hidden>
                                    🎯
                                </span>
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold">Create New Goal</h3>
                                <p className="text-xs text-muted-foreground">
                                    {step === "basic" && "Tell me about your goal"}
                                    {step === "ai-questions" && "Let me understand better"}
                                    {step === "review" && "Review and confirm"}
                                </p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={handleClose}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                            aria-label="Close modal"
                        >
                            <svg
                                className="w-5 h-5"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                aria-hidden="true"
                            >
                                <title>Close</title>
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M6 18L18 6M6 6l12 12"
                                />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Progress indicator */}
                <div className="px-6 py-3 bg-gray-50 dark:bg-gray-900/50">
                    <div className="flex items-center justify-between text-xs">
                        <div
                            className={`flex-1 ${step === "basic" ? "text-primary font-medium" : "text-muted-foreground"}`}
                        >
                            Basic Info
                        </div>
                        <div className="w-8 h-px bg-border mx-2" />
                        <div
                            className={`flex-1 text-center ${step === "ai-questions" ? "text-primary font-medium" : "text-muted-foreground"}`}
                        >
                            AI Assistant
                        </div>
                        <div className="w-8 h-px bg-border mx-2" />
                        <div
                            className={`flex-1 text-right ${step === "review" ? "text-primary font-medium" : "text-muted-foreground"}`}
                        >
                            Review
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="px-6 py-6">
                    {/* Step 1: Basic Information */}
                    {step === "basic" && (
                        <form onSubmit={handleBasicSubmit} className="space-y-4">
                            <div>
                                <label
                                    htmlFor="goal-title"
                                    className="block text-sm font-medium mb-2"
                                >
                                    Goal Title *
                                </label>
                                <input
                                    id="goal-title"
                                    type="text"
                                    value={formData.title}
                                    onChange={(e) =>
                                        setFormData({ ...formData, title: e.target.value })
                                    }
                                    className="w-full px-4 py-2 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                                    placeholder="e.g., Learn Spanish, Run a marathon"
                                    required
                                />
                            </div>

                            <div>
                                <label
                                    htmlFor="goal-category"
                                    className="block text-sm font-medium mb-2"
                                >
                                    Category
                                </label>
                                <select
                                    id="goal-category"
                                    value={formData.category}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            category: e.target.value as Goal["category"],
                                        })
                                    }
                                    className="w-full px-4 py-2 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                                >
                                    <option value="personal">Personal</option>
                                    <option value="career">Career</option>
                                    <option value="health">Health</option>
                                    <option value="learning">Learning</option>
                                    <option value="finance">Finance</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>

                            <div>
                                <label
                                    htmlFor="goal-deadline"
                                    className="block text-sm font-medium mb-2"
                                >
                                    Target Date (Optional)
                                </label>
                                <input
                                    id="goal-deadline"
                                    type="date"
                                    value={
                                        formData.deadline
                                            ? new Date(formData.deadline).toISOString().split("T")[0]
                                            : ""
                                    }
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            deadline: e.target.value
                                                ? new Date(e.target.value)
                                                : undefined,
                                        })
                                    }
                                    className="w-full px-4 py-2 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                                />
                            </div>

                            <div>
                                <label
                                    htmlFor="goal-description"
                                    className="block text-sm font-medium mb-2"
                                >
                                    Description (Optional)
                                </label>
                                <textarea
                                    id="goal-description"
                                    value={formData.description}
                                    onChange={(e) =>
                                        setFormData({ ...formData, description: e.target.value })
                                    }
                                    className="w-full px-4 py-2 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary min-h-[100px] resize-none"
                                    placeholder="Add more details about your goal..."
                                />
                            </div>

                            <div className="flex justify-end gap-2 pt-4">
                                <button
                                    type="button"
                                    onClick={handleClose}
                                    className="px-4 py-2 rounded-lg border hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={!formData.title.trim()}
                                    className="px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    Next: AI Questions
                                </button>
                            </div>
                        </form>
                    )}

                    {/* Step 2: AI Questions */}
                    {step === "ai-questions" && (
                        <div className="space-y-6">
                            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mb-6">
                                <p className="text-sm text-blue-900 dark:text-blue-100">
                                    <strong>💡 Nargis AI Assistant</strong>
                                    <br />
                                    Help me understand your goal better so I can suggest the best
                                    path forward.
                                </p>
                            </div>

                            {aiQuestions.map((question, idx) => (
                                // biome-ignore lint/suspicious/noArrayIndexKey: Static question list, order never changes
                                <div key={`ai-question-${idx}`}>
                                    <label
                                        htmlFor={`ai-question-${idx}`}
                                        className="block text-sm font-medium mb-2"
                                    >
                                        {question}
                                    </label>
                                    <textarea
                                        id={`ai-question-${idx}`}
                                        value={aiAnswers[idx] || ""}
                                        onChange={(e) =>
                                            setAiAnswers({ ...aiAnswers, [idx]: e.target.value })
                                        }
                                        className="w-full px-4 py-2 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary min-h-20 resize-none"
                                        placeholder="Share your thoughts..."
                                    />
                                </div>
                            ))}

                            <div className="flex justify-between gap-2 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setStep("basic")}
                                    className="px-4 py-2 rounded-lg border hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                                >
                                    Back
                                </button>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setStep("review")}
                                        className="px-4 py-2 rounded-lg border hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                                    >
                                        Skip Questions
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleAiQuestionsSubmit}
                                        className="px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors"
                                    >
                                        Next: Review
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Review */}
                    {step === "review" && (
                        <div className="space-y-4">
                            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 space-y-3">
                                <div>
                                    <p className="text-xs text-muted-foreground mb-1">Goal</p>
                                    <p className="font-medium">{formData.title}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground mb-1">Category</p>
                                    <p className="capitalize">{formData.category}</p>
                                </div>
                                {formData.deadline && (
                                    <div>
                                        <p className="text-xs text-muted-foreground mb-1">
                                            Target Date
                                        </p>
                                        <p>
                                            {new Date(formData.deadline).toLocaleDateString("en-US", {
                                                year: "numeric",
                                                month: "long",
                                                day: "numeric",
                                            })}
                                        </p>
                                    </div>
                                )}
                                {formData.description && (
                                    <div>
                                        <p className="text-xs text-muted-foreground mb-1">
                                            Description
                                        </p>
                                        <p className="text-sm">{formData.description}</p>
                                    </div>
                                )}
                            </div>

                            {/* AI Suggestions Preview (placeholder for now) */}
                            {aiSuggestions.length > 0 && (
                                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                                    <p className="text-sm font-medium text-green-900 dark:text-green-100 mb-2">
                                        🤖 AI Suggested Next Steps:
                                    </p>
                                    <ul className="text-sm space-y-1 text-green-800 dark:text-green-200">
                                        {aiSuggestions.slice(0, 3).map((suggestion, idx) => (
                                            <li key={`${suggestion.type}-${suggestion.title}-${idx}`}>• {suggestion.title}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            <div className="flex justify-between gap-2 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setStep("ai-questions")}
                                    className="px-4 py-2 rounded-lg border hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                                >
                                    Back
                                </button>
                                <button
                                    type="button"
                                    onClick={handleFinalSubmit}
                                    disabled={isSubmitting}
                                    className="px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    {isSubmitting ? "Creating..." : "Create Goal"}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
