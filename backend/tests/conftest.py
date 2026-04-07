import os

import pytest


@pytest.fixture(scope="module")
def client():
    if not os.environ.get("DATABASE_URL"):
        pytest.skip("DATABASE_URL is required for API integration tests")
    from starlette.testclient import TestClient
    from server import app

    with TestClient(app) as c:
        yield c
