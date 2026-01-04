import sys
from contextlib import contextmanager
from typing import Any
from unittest.mock import patch

from langchain_core.language_models import BaseChatModel
from langchain_core.messages import AIMessage, BaseMessage, HumanMessage
from langchain_core.outputs import ChatGeneration, ChatResult
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from storage.models import Base, Task, User


# Setup in-memory DB
def setup_inmemory_db():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    return sessionmaker(bind=engine)


class MyFakeChatModel(BaseChatModel):
    responses: list[BaseMessage]
    i: int = 0

    def _generate(
        self,
        messages: list[BaseMessage],
        stop: list[str] | None = None,
        run_manager: Any = None,
        **kwargs: Any,
    ) -> ChatResult:
        if self.i >= len(self.responses):
            response = self.responses[-1]
        else:
            response = self.responses[self.i]
            self.i += 1
        return ChatResult(generations=[ChatGeneration(message=response)])

    @property
    def _llm_type(self) -> str:
        return "fake"

    def bind_tools(self, tools: Any, **kwargs: Any) -> "MyFakeChatModel":
        return self


def test_agent_creates_task():
    SessionLocal = setup_inmemory_db()

    # Create user
    with SessionLocal() as db:
        user = User(id="user-1", email="test@test.com", password_hash="hash")
        db.add(user)
        db.commit()

    @contextmanager
    def mock_get_session_now():
        print("Mock session used!")
        db = SessionLocal()
        try:
            yield db
        finally:
            db.close()

    # Patch get_session_now in storage.database
    with patch("storage.database.get_session_now", side_effect=mock_get_session_now):
        with patch("langchain_groq.ChatGroq") as MockChatGroq:
            # Tool call to create a task
            tool_call = {
                "name": "create_task_tool",
                "args": {"title": "Buy milk", "user_id": "user-1"},
                "id": "call_123",
                "type": "tool_call",
            }

            responses = [
                AIMessage(content="", tool_calls=[tool_call]),
                AIMessage(content="Task created successfully."),
            ]

            mock_llm = MyFakeChatModel(responses=responses)
            MockChatGroq.return_value = mock_llm

            # Build agent
            if "agent.graph" in sys.modules:
                del sys.modules["agent.graph"]
            if "agent.tools" in sys.modules:
                del sys.modules["agent.tools"]
            from agent.graph import _build_agent_app

            app = _build_agent_app()
            assert app is not None

            # Run agent
            inputs = {"messages": [HumanMessage(content="Create a task to buy milk")]}
            app.invoke(inputs)

            # Verify DB
            with mock_get_session_now() as db:
                task = db.query(Task).filter_by(title="Buy milk").first()
                assert task is not None
                assert task.title == "Buy milk"
