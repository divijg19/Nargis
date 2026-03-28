type PrimitiveClass = string | number | boolean | null | undefined;
type ClassDictionary = Record<string, boolean | null | undefined>;
type ClassArray = ClassValue[];
type ClassValue = PrimitiveClass | ClassDictionary | ClassArray;

function normalizeClassValue(input: ClassValue, out: string[]) {
  if (!input) return;

  if (typeof input === "string" || typeof input === "number") {
    out.push(String(input));
    return;
  }

  if (Array.isArray(input)) {
    for (const item of input) {
      normalizeClassValue(item, out);
    }
    return;
  }

  for (const [key, enabled] of Object.entries(input)) {
    if (enabled) out.push(key);
  }
}

/**
 * Utility function to combine conditional class names
 */
export function cn(...inputs: ClassValue[]) {
  const classes: string[] = [];
  for (const input of inputs) {
    normalizeClassValue(input, classes);
  }
  return classes.join(" ");
}

export function getStatusColor(status: "todo" | "inProgress" | "done") {
  switch (status) {
    case "todo":
      return "status-todo";
    case "inProgress":
      return "status-inProgress";
    case "done":
      return "status-done";
    default:
      return "status-todo";
  }
}

export function getStatusLabel(status: "todo" | "inProgress" | "done") {
  switch (status) {
    case "todo":
      return "To Do";
    case "inProgress":
      return "In Progress";
    case "done":
      return "Done";
    default:
      return "Unknown";
  }
}

export function dateKey(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const local = new Date(d);
  const y = local.getFullYear();
  const m = String(local.getMonth() + 1).padStart(2, "0");
  const day = String(local.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
