from datetime import UTC, datetime

from services.habits import _compute_streaks
from storage.models import HabitEntry


def run():
    today = datetime.now().date()
    e = HabitEntry(date=today.isoformat(), completed=True)
    print("HabitEntry.date:", e.date, type(e.date))
    res = _compute_streaks([e])
    print("now datetime.now(UTC).date():", datetime.now(UTC).date())
    print("res:", res)


if __name__ == "__main__":
    run()
