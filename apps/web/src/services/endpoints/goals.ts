// Goals endpoints removed — keep harmless no-op functions to avoid import errors.
export async function listGoals() {
  return [] as const;
}

export async function createGoal(_data: unknown) {
  return null;
}

export async function getGoal(_id: string) {
  return null;
}

export async function updateGoal(_id: string, _data: unknown) {
  return null;
}

export async function deleteGoal(_id: string) {
  return null;
}
