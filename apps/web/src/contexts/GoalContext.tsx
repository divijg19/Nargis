"use client";

import type React from "react";
import {
    createContext,
    useCallback,
    useContext,
    useMemo,
    useReducer,
} from "react";
import { useToasts } from "@/contexts/ToastContext";
import { buildEvent, emitDomainEvent } from "@/events/dispatcher";
import {
    createGoal as apiCreateGoal,
    deleteGoal as apiDeleteGoal,
    updateGoal as apiUpdateGoal,
    listGoals,
} from "@/services/endpoints/goals";
import type {
    CreateGoalRequest,
    Goal,
    GoalStore,
    UpdateGoalRequest,
} from "@/types";
import { generateId } from "@/utils";

// Action types
type GoalAction =
    | { type: "SET_LOADING"; payload: boolean }
    | { type: "SET_GOALS"; payload: Goal[] }
    | { type: "ADD_GOAL"; payload: Goal }
    | { type: "UPDATE_GOAL"; payload: { id: string; updates: Partial<Goal> } }
    | { type: "DELETE_GOAL"; payload: string };

// Initial state
const initialState: GoalStore = {
    goals: [],
    loading: false,
    activeGoals: [],
    completedGoals: [],
};

// Reducer function
function goalReducer(state: GoalStore, action: GoalAction): GoalStore {
    switch (action.type) {
        case "SET_LOADING":
            return { ...state, loading: action.payload };

        case "SET_GOALS":
            return { ...state, goals: action.payload, loading: false };

        case "ADD_GOAL":
            return { ...state, goals: [...state.goals, action.payload] };

        case "UPDATE_GOAL": {
            const updatedGoals = state.goals.map((goal) =>
                goal.id === action.payload.id
                    ? { ...goal, ...action.payload.updates, updatedAt: new Date() }
                    : goal,
            );
            return { ...state, goals: updatedGoals };
        }

        case "DELETE_GOAL": {
            const filteredGoals = state.goals.filter(
                (goal) => goal.id !== action.payload,
            );
            return { ...state, goals: filteredGoals };
        }

        default:
            return state;
    }
}

// Context type
interface GoalContextType extends GoalStore {
    addGoal: (goalData: CreateGoalRequest) => Promise<Goal>;
    updateGoal: (updates: UpdateGoalRequest) => Promise<void>;
    deleteGoal: (id: string) => Promise<void>;
    loadGoals: () => Promise<void>;
}

// Create context
const GoalContext = createContext<GoalContextType | undefined>(undefined);

// Provider component
export function GoalProvider({ children }: { children: React.ReactNode }) {
    const [state, dispatch] = useReducer(goalReducer, initialState);
    const { push } = useToasts();

    // Computed values
    const activeGoals = useMemo(
        () =>
            state.goals.filter(
                (g) => g.status === "active" || g.status === "planning",
            ),
        [state.goals],
    );

    const completedGoals = useMemo(
        () => state.goals.filter((g) => g.status === "completed"),
        [state.goals],
    );

    const loadGoals = useCallback(async () => {
        dispatch({ type: "SET_LOADING", payload: true });
        try {
            const goals = await listGoals();
            dispatch({ type: "SET_GOALS", payload: goals });
        } catch (error) {
            console.error("Failed to load goals:", error);
            dispatch({ type: "SET_LOADING", payload: false });
            push({
                title: "Sync Failed",
                message: "Could not load goals",
                variant: "error",
            });
        }
    }, [push]);

    const addGoal = async (goalData: CreateGoalRequest): Promise<Goal> => {
        try {
            const created = await apiCreateGoal(goalData);
            dispatch({ type: "ADD_GOAL", payload: created });
            emitDomainEvent(buildEvent("goal.created", { id: created.id }));
            push({
                title: "Goal Created",
                message: created.title,
                variant: "success",
            });
            return created;
        } catch {
            const newGoal: Goal = {
                ...goalData,
                id: generateId(),
                status: "planning",
                createdAt: new Date(),
                updatedAt: new Date(),
                milestones: [],
                linkedTaskIds: [],
                linkedHabitIds: [],
                progress: 0,
            };
            dispatch({ type: "ADD_GOAL", payload: newGoal });
            emitDomainEvent(buildEvent("goal.created.optimistic", { id: newGoal.id }));
            push({
                title: "Goal Created (Offline)",
                message: newGoal.title,
                variant: "info",
            });
            return newGoal;
        }
    };

    const updateGoal = async (updates: UpdateGoalRequest) => {
        dispatch({ type: "UPDATE_GOAL", payload: { id: updates.id, updates } });
        try {
            await apiUpdateGoal(updates.id, updates);
            emitDomainEvent(buildEvent("goal.updated", { id: updates.id }));
            push({
                title: "Goal Updated",
                message: "Changes saved",
                variant: "success",
            });
        } catch {
            push({
                title: "Update Failed",
                message: "Will retry later",
                variant: "warning",
            });
        }
    };

    const deleteGoal = async (id: string) => {
        dispatch({ type: "DELETE_GOAL", payload: id });
        try {
            await apiDeleteGoal(id);
            emitDomainEvent(buildEvent("goal.deleted", { id }));
            push({
                title: "Goal Deleted",
                message: "Goal removed successfully",
                variant: "success",
            });
        } catch {
            push({
                title: "Delete Failed",
                message: "Will retry later",
                variant: "warning",
            });
        }
    };

    const contextValue: GoalContextType = {
        ...state,
        activeGoals,
        completedGoals,
        addGoal,
        updateGoal,
        deleteGoal,
        loadGoals,
    };

    return (
        <GoalContext.Provider value={contextValue}>{children}</GoalContext.Provider>
    );
}

// Hook to use the context
export function useGoalStore() {
    const context = useContext(GoalContext);
    if (context === undefined) {
        throw new Error("useGoalStore must be used within a GoalProvider");
    }
    return context;
}
