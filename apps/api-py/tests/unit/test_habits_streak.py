from datetime import datetime, timedelta

from services.habits import _compute_streaks
from storage.models import HabitEntry


def test_compute_streaks_empty():
    assert _compute_streaks([]) == {"currentStreak": 0, "bestStreak": 0}


def test_compute_streaks_basic():
    # Today is completed
    today = datetime.now().date()
    entries = [HabitEntry(date=today.isoformat(), completed=True)]
    res = _compute_streaks(entries)
    assert res["currentStreak"] == 1
    assert res["bestStreak"] == 1


def test_compute_streaks_forgiving():
    # Yesterday completed, today not yet
    today = datetime.now().date()
    yesterday = today - timedelta(days=1)
    entries = [HabitEntry(date=yesterday.isoformat(), completed=True)]
    res = _compute_streaks(entries)
    assert res["currentStreak"] == 1
    assert res["bestStreak"] == 1


def test_compute_streaks_broken():
    # Day before yesterday completed, yesterday missed
    today = datetime.now().date()
    day_before_yesterday = today - timedelta(days=2)
    entries = [HabitEntry(date=day_before_yesterday.isoformat(), completed=True)]
    res = _compute_streaks(entries)
    assert res["currentStreak"] == 0
    assert res["bestStreak"] == 1


def test_compute_streaks_long_streak():
    # 5 days streak ending today
    today = datetime.now().date()
    entries = []
    for i in range(5):
        d = today - timedelta(days=i)
        entries.append(HabitEntry(date=d.isoformat(), completed=True))

    res = _compute_streaks(entries)
    assert res["currentStreak"] == 5
    assert res["bestStreak"] == 5


def test_compute_streaks_best_historical():
    # Current streak 1 (today), but historical best was 3
    today = datetime.now().date()
    entries = [HabitEntry(date=today.isoformat(), completed=True)]

    # Add a gap
    gap_day = today - timedelta(days=2)

    # Add 3 days streak before gap
    for i in range(3):
        d = gap_day - timedelta(days=i + 1)  # gap_day-1, gap_day-2, gap_day-3
        entries.append(HabitEntry(date=d.isoformat(), completed=True))

    res = _compute_streaks(entries)
    assert res["currentStreak"] == 1
    assert res["bestStreak"] == 3
