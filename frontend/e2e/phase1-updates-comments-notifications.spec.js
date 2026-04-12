const { test, expect } = require('@playwright/test');

const BACKEND = process.env.E2E_BACKEND_ORIGIN || 'http://localhost:8001';
const PROJECT_ID = '00000000-0000-4000-8000-000000000099';
const OWNER_ID = '00000000-0000-4000-8000-000000000001';

const iso = () => new Date().toISOString();

function corsHeaders(request) {
  const origin = request.headers()['origin'] || '*';
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET,POST,PATCH,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Allow-Credentials': 'true',
  };
}

function authorUser() {
  return {
    id: OWNER_ID,
    email: 'owner@e2e.test',
    name: 'Owner User',
    username: null,
    role: 'user',
    auth_provider: 'email',
    picture: null,
    created_at: iso(),
  };
}

async function installPhase1Mocks(page) {
  const updates = [];
  let updateSeq = 0;
  const comments = [];
  let commentSeq = 0;
  const notifications = [
    {
      id: 'n1',
      type: 'project_comment',
      title: 'Test notification',
      body: 'Someone commented',
      project_id: PROJECT_ID,
      read_at: null,
      created_at: iso(),
    },
  ];

  await page.route(`${BACKEND}/**`, async (route) => {
    const request = route.request();
    const method = request.method();
    const url = new URL(request.url());
    const path = url.pathname;

    if (method === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: corsHeaders(request) });
      return;
    }

    const json = (body, status = 200) =>
      route.fulfill({
        status,
        headers: { ...corsHeaders(request), 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

    if (method === 'POST' && path === '/api/auth/login') {
      await json({
        user: authorUser(),
        message: 'Login successful',
      });
      return;
    }

    if (method === 'GET' && path === '/api/my/projects') {
      await json({
        items: [
          {
            id: PROJECT_ID,
            user_id: OWNER_ID,
            title: 'E2E project',
            description: 'Test',
            tech_stack: [],
            stage: 'in_progress',
            support_needed: null,
            short_pitch: null,
            long_description: null,
            category: null,
            tags: [],
            looking_for_help: null,
            roles_needed: [],
            demo_url: null,
            problem_statement: null,
            roadmap_summary: null,
            project_type: 'idea',
            verification_status: 'unverified',
            ownership_type: 'none',
            repo_connected: false,
            created_at: iso(),
            updated_at: iso(),
          },
        ],
      });
      return;
    }

    if (method === 'GET' && path === '/api/my/collaboration-requests') {
      await json({ items: [] });
      return;
    }

    if (method === 'GET' && path === `/api/projects/${PROJECT_ID}`) {
      await json({
        id: PROJECT_ID,
        user_id: OWNER_ID,
        title: 'E2E project',
        description: 'Test',
        tech_stack: [],
        stage: 'in_progress',
        support_needed: null,
        short_pitch: null,
        long_description: null,
        category: null,
        tags: [],
        looking_for_help: null,
        roles_needed: [],
        demo_url: null,
        problem_statement: null,
        roadmap_summary: null,
        project_type: 'idea',
        verification_status: 'unverified',
        ownership_type: 'none',
        repo_connected: false,
        created_at: iso(),
        updated_at: iso(),
        milestones: [],
        updates_count: 0,
        comments_count: 0,
        contributors: [],
        recent_commits: [],
        repo_summary: null,
        languages: [],
        readme_excerpt: null,
        readme_present: false,
        last_synced_at: null,
        sync_status: null,
        sync_error: null,
        detected_frameworks: [],
        key_file_highlights: [],
        user: authorUser(),
      });
      return;
    }

    if (method === 'GET' && path === `/api/projects/${PROJECT_ID}/updates`) {
      await json({ items: [...updates] });
      return;
    }

    if (method === 'POST' && path === `/api/projects/${PROJECT_ID}/updates`) {
      updateSeq += 1;
      const payload = await request.postDataJSON();
      const row = {
        id: `u-${updateSeq}`,
        project_id: PROJECT_ID,
        author_user_id: OWNER_ID,
        title: payload.title,
        body: payload.body,
        update_type: payload.update_type || 'progress',
        created_at: iso(),
        updated_at: iso(),
        author: authorUser(),
      };
      updates.unshift(row);
      await json(row);
      return;
    }

    if (method === 'PATCH' && path.match(/^\/api\/projects\/[^/]+\/updates\/[^/]+$/)) {
      const uid = path.split('/').pop();
      const payload = await request.postDataJSON();
      const idx = updates.findIndex((u) => u.id === uid);
      if (idx >= 0) {
        updates[idx] = { ...updates[idx], ...payload, updated_at: iso() };
        await json(updates[idx]);
        return;
      }
      await json({ detail: 'Not found' }, 404);
      return;
    }

    if (method === 'DELETE' && path.match(/^\/api\/projects\/[^/]+\/updates\/[^/]+$/)) {
      const uid = path.split('/').pop();
      const idx = updates.findIndex((u) => u.id === uid);
      if (idx >= 0) {
        updates.splice(idx, 1);
        await json({ message: 'deleted' });
        return;
      }
      await json({ detail: 'Not found' }, 404);
      return;
    }

    if (method === 'GET' && path === `/api/projects/${PROJECT_ID}/milestones`) {
      await json({ items: [] });
      return;
    }
    if (method === 'GET' && path === `/api/projects/${PROJECT_ID}/comments`) {
      await json({ items: [...comments] });
      return;
    }
    if (method === 'POST' && path === `/api/projects/${PROJECT_ID}/comments`) {
      commentSeq += 1;
      const payload = await request.postDataJSON();
      const row = {
        id: `c-${commentSeq}`,
        project_id: PROJECT_ID,
        user_id: OWNER_ID,
        content: payload.content,
        created_at: iso(),
        user: authorUser(),
      };
      comments.unshift(row);
      await json(row);
      return;
    }
    if (method === 'DELETE' && path.match(/^\/api\/projects\/[^/]+\/comments\/[^/]+$/)) {
      const cid = path.split('/').pop();
      const idx = comments.findIndex((c) => c.id === cid);
      if (idx >= 0) {
        comments.splice(idx, 1);
        await json({ message: 'ok' });
        return;
      }
      await json({ detail: 'Not found' }, 404);
      return;
    }

    if (method === 'GET' && path === `/api/projects/${PROJECT_ID}/collaborators`) {
      await json({ items: [] });
      return;
    }
    if (method === 'GET' && path === `/api/projects/${PROJECT_ID}/activity`) {
      await json({ items: [] });
      return;
    }

    if (method === 'GET' && path === '/api/notifications') {
      const unread = notifications.filter((n) => !n.read_at).length;
      await json({ items: [...notifications], unread_count: unread, limit: 20, offset: 0 });
      return;
    }
    if (method === 'PATCH' && path.match(/^\/api\/notifications\/[^/]+\/read$/)) {
      const segs = path.split('/').filter(Boolean);
      const nid = segs[segs.length - 2];
      const n = notifications.find((x) => x.id === nid);
      if (n) {
        n.read_at = iso();
        await json({ ...n });
        return;
      }
      await json({ detail: 'Not found' }, 404);
      return;
    }

    await route.fulfill({ status: 501, headers: corsHeaders(request), body: path });
  });

  await page.route('**/auth/v1/token**', async (route) => {
    if (route.request().method() !== 'POST') {
      await route.continue();
      return;
    }
    await route.fulfill({
      status: 400,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'invalid_grant', error_description: 'Invalid login credentials' }),
    });
  });
}

test.describe('Phase 1 — updates, comments, notifications', () => {
  test('owner posts, edits, and deletes an update', async ({ page }) => {
    await installPhase1Mocks(page);
    await page.goto('/login');
    await page.getByTestId('email-input').fill('owner@e2e.test');
    // LoginPage enforces minLength={6} on the password field; shorter values never submit.
    await page.getByTestId('password-input').fill('any-password');
    await page.getByTestId('submit-btn').click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 20000 });
    await page.getByTestId('project-card').filter({ hasText: 'E2E project' }).click();
    await expect(page.getByTestId('project-detail')).toBeVisible({ timeout: 15000 });

    await page.getByPlaceholder('Update title').fill('My update title');
    await page.getByTestId('update-input').fill('First body for update');
    await page.getByTestId('post-update-btn').click();
    await expect(page.getByTestId('update-item').filter({ hasText: 'My update title' })).toBeVisible();

    await page.getByTestId('update-item').filter({ hasText: 'My update title' }).getByTestId('edit-update-btn').click();
    await page.getByTestId('edit-update-body').fill('Edited body content');
    await page.getByTestId('save-update-btn').click();
    await expect(page.getByText('Edited body content')).toBeVisible();

    page.once('dialog', (d) => d.accept());
    await page.getByTestId('update-item').filter({ hasText: 'My update title' }).getByTestId('delete-update-btn').click();
    await expect(page.getByText('Edited body content')).toHaveCount(0);
  });

  test('owner deletes own comment', async ({ page }) => {
    await installPhase1Mocks(page);
    await page.goto('/login');
    await page.getByTestId('email-input').fill('owner@e2e.test');
    await page.getByTestId('password-input').fill('any-password');
    await page.getByTestId('submit-btn').click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 20000 });
    await page.getByTestId('project-card').filter({ hasText: 'E2E project' }).click();
    await expect(page.getByTestId('project-detail')).toBeVisible({ timeout: 15000 });

    await page.getByTestId('comment-input').fill('Temporary comment');
    await page.getByTestId('post-comment-btn').click();
    await expect(page.getByTestId('comment-item').filter({ hasText: 'Temporary comment' })).toBeVisible();
    page.once('dialog', (d) => d.accept());
    await page.getByTestId('comment-item').filter({ hasText: 'Temporary comment' }).getByTestId('delete-comment-btn').click();
    await expect(page.getByText('Temporary comment')).toHaveCount(0);
  });

  test('notifications bell shows unread and mark read lowers badge', async ({ page }) => {
    await installPhase1Mocks(page);
    await page.goto('/login');
    await page.getByTestId('email-input').fill('owner@e2e.test');
    await page.getByTestId('password-input').fill('any-password');
    await page.getByTestId('submit-btn').click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 20000 });

    await expect(page.getByTestId('notifications-badge')).toBeVisible();
    await page.getByTestId('notifications-bell').click();
    await expect(page.getByTestId('notification-row').first()).toBeVisible();
    await page.getByTestId('notification-row').first().click();
    await expect(page.getByTestId('notifications-badge')).toHaveCount(0);
  });
});
