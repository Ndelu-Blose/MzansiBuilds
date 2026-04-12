from unittest.mock import MagicMock

from notification_service import (
    NOTIFICATION_TYPE_PROJECT_COMMENT,
    add_notification,
)


def test_add_notification_registers_on_session():
    session = MagicMock()
    n = add_notification(
        session,
        user_id="owner-1",
        notif_type=NOTIFICATION_TYPE_PROJECT_COMMENT,
        title="Hello",
        body="Body text",
        project_id="proj-1",
    )
    session.add.assert_called_once()
    added = session.add.call_args[0][0]
    assert added is n
    assert n.user_id == "owner-1"
    assert n.type == NOTIFICATION_TYPE_PROJECT_COMMENT
    assert n.title == "Hello"
    assert n.body == "Body text"
    assert n.project_id == "proj-1"
