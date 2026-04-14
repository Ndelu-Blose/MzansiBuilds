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


def test_celebration_endpoint_supports_filter_sort_and_spotlight(client):
    response = client.get("/api/celebration?filter=all&sort=recent&limit=10&offset=0")
    assert response.status_code == 200
    payload = response.json()
    assert "items" in payload
    assert "summary" in payload
    assert "spotlight" in payload


def test_celebration_endpoint_rejects_invalid_filter_or_sort(client):
    bad_filter = client.get("/api/celebration?filter=bad")
    bad_sort = client.get("/api/celebration?sort=bad")
    assert bad_filter.status_code == 400
    assert bad_sort.status_code == 400


def test_feed_endpoint_supports_tab_query(client):
    response = client.get("/api/feed?tab=all&limit=10&offset=0")
    assert response.status_code == 200
    payload = response.json()
    assert "items" in payload
    assert payload.get("tab") == "all"


def test_feed_endpoint_rejects_invalid_tab(client):
    response = client.get("/api/feed?tab=invalid")
    assert response.status_code == 422


def test_reaction_endpoints_require_auth(client):
    create_response = client.post("/api/projects/test-project-id/reactions", json={"reaction_type": "applaud"})
    delete_response = client.delete("/api/projects/test-project-id/reactions/applaud")
    assert create_response.status_code == 401
    assert delete_response.status_code == 401


def test_feed_social_mutations_require_auth(client):
    create_post = client.post("/api/feed/posts", json={"content": "hello world"})
    react = client.post("/api/feed/posts/fake-post/reactions", json={"reaction_type": "like"})
    comment = client.post("/api/feed/posts/fake-post/comments", json={"content": "nice"})
    follow = client.post("/api/users/fake-user/follow")
    assert create_post.status_code == 401
    assert react.status_code == 401
    assert comment.status_code == 401
    assert follow.status_code == 401


def test_digest_endpoints_require_auth(client):
    preview = client.get("/api/digest/preview")
    preferences = client.get("/api/digest/preferences")
    update = client.put("/api/digest/preferences", json={"frequency": "weekly", "channels": ["email_digest"]})
    assert preview.status_code == 401
    assert preferences.status_code == 401
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
