import json
import os

import redis.asyncio as redis

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")


class EventBus:
    def __init__(self):
        self.redis = redis.from_url(REDIS_URL, encoding="utf-8", decode_responses=True)

    async def publish(self, user_id: str, event_type: str, data: dict):
        """
        Publish an event to a specific user's channel.
        The Go Gateway subscribes to 'user:{user_id}:events' and forwards these
        to the WebSocket.
        """
        channel = f"user:{user_id}:events"
        message = json.dumps({"type": event_type, "data": data})
        await self.redis.publish(channel, message)

    async def close(self):
        await self.redis.close()


# Global instance
_bus = None


def get_event_bus() -> EventBus:
    global _bus
    if _bus is None:
        _bus = EventBus()
    return _bus
