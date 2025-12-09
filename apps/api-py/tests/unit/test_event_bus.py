from unittest.mock import AsyncMock, patch

import pytest

from services.event_bus import EventBus


@pytest.mark.asyncio
async def test_event_bus_publish():
    # Mock the redis client
    mock_redis = AsyncMock()

    with patch("redis.asyncio.from_url", return_value=mock_redis):
        bus = EventBus()

        user_id = "test-user-123"
        event_type = "task_created"
        data = {"id": "task-1", "title": "Test Task"}

        await bus.publish(user_id, event_type, data)

        # Verify publish was called with correct channel and message
        mock_redis.publish.assert_called_once()
        call_args = mock_redis.publish.call_args
        assert call_args[0][0] == f"user:{user_id}:events"
        assert "task_created" in call_args[0][1]
        assert "Test Task" in call_args[0][1]

        await bus.close()
        mock_redis.close.assert_called_once()
