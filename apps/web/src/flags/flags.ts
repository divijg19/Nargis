export type FeatureFlag =
	| "realtime"
	| "taskIntelligence"
	| "habitRisk"
	| "focusScoring"
	| "voiceInput";

interface FlagState {
	[k: string]: boolean;
}

const defaults: FlagState = {
	realtime: false,
	taskIntelligence: false,
	habitRisk: false,
	focusScoring: false,
	voiceInput: true,
};

let overrides: FlagState = {};

export function setFlag(flag: FeatureFlag, value: boolean) {
	overrides[flag] = value;
}

export function isFlagEnabled(flag: FeatureFlag): boolean {
	if (flag in overrides) return !!overrides[flag];
	return !!defaults[flag];
}

export function loadFlagOverridesFromEnv() {
	if (typeof window === "undefined") return;
	try {
		const raw = (window as Window & {
			__NARGIS_FLAGS__?: Record<string, boolean>;
		}).__NARGIS_FLAGS__;
		if (raw) overrides = { ...overrides, ...raw };
	} catch {
		/* noop */
	}
}

export function listFlags() {
	const merged: FlagState = { ...defaults, ...overrides };
	return Object.entries(merged).map(([key, enabled]) => ({ key, enabled }));
}
