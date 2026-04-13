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


def test_bookmark_requires_auth(client):
    response = client.post("/api/projects/test-project-id/bookmark")
    assert response.status_code == 401


def test_matched_projects_requires_auth(client):
    response = client.get("/api/projects/matched")
    assert response.status_code == 401


def test_create_receipt_requires_auth(client):
    response = client.post("/api/collaborations/test-collab-id/receipt", json={})
    assert response.status_code == 401


def test_builder_score_missing_user_returns_404(client):
    response = client.get("/api/users/missing-user-id/builder-score")
    assert response.status_code == 404


def test_open_roles_endpoint_is_available(client):
    response = client.get("/api/open-roles")
    assert response.status_code == 200
    assert "items" in response.json()


def test_trending_endpoints_are_available(client):
    projects = client.get("/api/trending/projects")
    builders = client.get("/api/trending/builders")
    assert projects.status_code == 200
    assert builders.status_code == 200
    assert "items" in projects.json()
    assert "items" in builders.json()


def test_digest_endpoints_require_auth(client):
    preview = client.get("/api/digest/preview")
    update = client.put("/api/digest/preferences", json={"enabled": True, "frequency": "weekly", "channels": ["in_app"]})
    assert preview.status_code == 401
    assert update.status_code == 401


def test_activation_endpoints_require_auth(client):
    checklist = client.get("/api/activation/checklist")
    dashboard_state = client.get("/api/dashboard/activation-state")
    assert checklist.status_code == 401
    assert dashboard_state.status_code == 401


def test_share_card_endpoints_return_not_found_for_unknown_ids(client):
    project_card = client.get("/api/projects/missing-project/share-card")
    profile_card = client.get("/api/users/missing-user/share-card")
    assert project_card.status_code == 404
    assert profile_card.status_code == 404
