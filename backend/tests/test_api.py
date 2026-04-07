def test_api_root(client):
    response = client.get("/api/")
    assert response.status_code == 200
    body = response.json()
    assert body.get("message")
    assert "version" in body


def test_api_health(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data.get("status") == "healthy"
    assert data.get("database") == "connected"
