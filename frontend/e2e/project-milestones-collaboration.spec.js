const { test, expect } = require('@playwright/test');

/** Matches production build `REACT_APP_BACKEND_URL` (see frontend/.env.local). */
const BACKEND = process.env.E2E_BACKEND_ORIGIN || 'http://localhost:8000';

const PROJECT_ID = '00000000-0000-4000-8000-000000000099';
const OWNER_ID = '00000000-0000-4000-8000-000000000001';
const VISITOR_ID = '00000000-0000-4000-8000-000000000002';

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

function baseProject(overrides = {}) {
  return {
    id: PROJECT_ID,
    user_id: OWNER_ID,
    title: 'E2E project',
    description: 'Browser test project',
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
    user: {
      id: OWNER_ID,
      email: 'owner@e2e.test',
      name: 'Owner User',
      username: null,
      role: 'user',
      auth_provider: 'email',
      picture: null,
      created_at: iso(),
    },
    ...overrides,
  };
}

function loginUser(id, email) {
  return {
    id,
    email,
    name: email.split('@')[0],
    username: null,
    role: 'user',
    auth_provider: 'email',
    picture: null,
    created_at: iso(),
  };
}

async function installBackendMock(page, { actingUserId, projectOverrides } = {}) {
  const userId = actingUserId || OWNER_ID;
  const milestones = [];
  let milestoneSeq = 0;

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
      const email = (await request.postDataJSON()).email?.toLowerCase() || '';
      const user =
        email.includes('visitor') || actingUserId === VISITOR_ID
          ? loginUser(VISITOR_ID, 'visitor@e2e.test')
          : loginUser(OWNER_ID, 'owner@e2e.test');
      await json({ user, message: 'Login successful' });
      return;
    }

    if (method === 'GET' && path === '/api/my/collaboration-requests') {
      await json({ items: [] });
      return;
    }

    if (method === 'GET' && path === '/api/notifications') {
      await json({ items: [], unread_count: 0, limit: 20, offset: 0 });
      return;
    }

    if (method === 'GET' && path === '/api/my/projects') {
      const items =
        actingUserId === VISITOR_ID
          ? []
          : [
              {
                id: PROJECT_ID,
                user_id: OWNER_ID,
                title: 'E2E project',
                description: 'Browser test project',
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
            ];
      await json({ items });
      return;
    }
    if (method === 'GET' && path === '/api/my/bookmarks') {
      await json({ items: [], total: 0, limit: 5, offset: 0 });
      return;
    }
    if (method === 'GET' && path === '/api/projects/matched') {
      await json({ items: [], total: 0, limit: 5, offset: 0 });
      return;
    }
    if (method === 'GET' && path === '/api/trending/projects') {
      await json({ items: [] });
      return;
    }
    if (method === 'GET' && path === '/api/trending/builders') {
      await json({ items: [] });
      return;
    }
    if (method === 'GET' && path === '/api/digest/preview') {
      await json({ active_projects: [], open_roles: [], trending_builders: [], milestone_highlights: [] });
      return;
    }
    if (method === 'GET' && path === '/api/activation/checklist') {
      await json({ profile_items: [], owner_items: [], top_items: [] });
      return;
    }
    if (method === 'GET' && path === '/api/dashboard/activation-state') {
      await json({
        has_projects: actingUserId !== VISITOR_ID,
        has_matches: false,
        has_activity: false,
        skills_count: actingUserId === VISITOR_ID ? 1 : 0,
        first_match_count: 0,
      });
      return;
    }

    if (method === 'GET' && path === '/api/projects') {
      await json({
        items: [
          {
            id: PROJECT_ID,
            user_id: OWNER_ID,
            title: 'E2E project',
            description: 'Browser test project',
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
            user: {
              id: OWNER_ID,
              email: 'owner@e2e.test',
              name: 'Owner User',
              username: null,
              role: 'user',
              auth_provider: 'email',
              picture: null,
              created_at: iso(),
            },
          },
        ],
        total: 1,
        limit: 20,
        offset: 0,
      });
      return;
    }

    if (method === 'GET' && path === `/api/projects/${PROJECT_ID}`) {
      await json(baseProject(projectOverrides));
      return;
    }

    if (method === 'GET' && path === `/api/projects/${PROJECT_ID}/milestones`) {
      await json({ items: [...milestones] });
      return;
    }

    if (method === 'POST' && path === `/api/projects/${PROJECT_ID}/milestones`) {
      milestoneSeq += 1;
      const payload = await request.postDataJSON();
      const row = {
        id: `ms-${milestoneSeq}`,
        project_id: PROJECT_ID,
        title: payload.title,
        description: payload.description ?? null,
        status: payload.status || 'planned',
        due_date: payload.due_date,
        completed_at: null,
        created_by_user_id: userId,
        created_at: iso(),
        updated_at: iso(),
      };
      milestones.push(row);
      await json(row);
      return;
    }

    if (method === 'PATCH' && path.match(/^\/api\/projects\/[^/]+\/milestones\/[^/]+$/)) {
      const msId = path.split('/').pop();
      const payload = await request.postDataJSON();
      const idx = milestones.findIndex((m) => m.id === msId);
      if (idx >= 0) {
        milestones[idx] = {
          ...milestones[idx],
          ...payload,
          status: payload.status ?? milestones[idx].status,
          updated_at: iso(),
          completed_at: payload.status === 'done' ? iso() : null,
        };
        await json(milestones[idx]);
        return;
      }
      await json({ detail: 'Not found' }, 404);
      return;
    }

    if (method === 'GET' && path === `/api/projects/${PROJECT_ID}/updates`) {
      await json({ items: [] });
      return;
    }
    if (method === 'GET' && path === `/api/projects/${PROJECT_ID}/timeline`) {
      await json({ items: [] });
      return;
    }
    if (method === 'GET' && path === `/api/projects/${PROJECT_ID}/share-card`) {
      await json({
        project_id: PROJECT_ID,
        title: 'E2E project',
        stage: 'in_progress',
        health_status: 'active',
        roles_needed: [],
        owner_name: 'Owner User',
        owner_score_band: 'Active Builder',
        last_activity_at: iso(),
        share_url: `http://127.0.0.1:4173/projects/${PROJECT_ID}`,
      });
      return;
    }

    if (method === 'GET' && path === `/api/projects/${PROJECT_ID}/comments`) {
      await json({ items: [] });
      return;
    }

    if (method === 'GET' && path === `/api/projects/${PROJECT_ID}/collaborators`) {
      await json({ items: [] });
      return;
    }

    if (method === 'POST' && path === `/api/projects/${PROJECT_ID}/collaborate`) {
      const payload = await request.postDataJSON();
      await json({
        id: 'collab-1',
        project_id: PROJECT_ID,
        requester_user_id: userId,
        message: payload.message || '',
        status: 'pending',
        created_at: iso(),
        requester: loginUser(userId, 'visitor@e2e.test'),
      });
      return;
    }

    if (method === 'GET' && path === `/api/projects/${PROJECT_ID}/activity`) {
      await json({ items: [] });
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
      body: JSON.stringify({
        error: 'invalid_grant',
        error_description: 'Invalid login credentials',
      }),
    });
  });
}

async function legacyLogin(page) {
  await page.goto('/login');
  await page.getByTestId('email-input').fill('owner@e2e.test');
  await page.getByTestId('password-input').fill('any-password');
  await page.getByTestId('submit-btn').click();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 20000 });
}

test.describe('Project milestones and collaboration', () => {
  test('owner can add a milestone and mark it done', async ({ page }) => {
    await installBackendMock(page, { actingUserId: OWNER_ID });
    await legacyLogin(page);

    await expect(page.getByTestId('dashboard')).toBeVisible({ timeout: 15000 });
    await page.getByTestId('project-card').filter({ hasText: 'E2E project' }).click();
    await expect(page.getByTestId('project-detail')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('h1', { hasText: 'E2E project' })).toBeVisible();

    await page.getByTestId('milestone-input').fill('Ship milestones UI');
    await page.getByTestId('add-milestone-btn').click();
    await expect(page.getByText('Milestone created.')).toBeVisible();
    await expect(page.getByTestId('milestone-item').filter({ hasText: 'Ship milestones UI' })).toBeVisible();

    await page.getByTestId('milestone-item').filter({ hasText: 'Ship milestones UI' }).getByTestId('toggle-milestone-btn').click();
    await expect(page.getByText('Milestone completed.')).toBeVisible();
  });

  test('visitor can send a collaboration request', async ({ page }) => {
    await installBackendMock(page, { actingUserId: VISITOR_ID });
    await page.goto('/login');
    await page.getByTestId('email-input').fill('visitor@e2e.test');
    await page.getByTestId('password-input').fill('any-password');
    await page.getByTestId('submit-btn').click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 20000 });

    await expect(page.getByTestId('dashboard')).toBeVisible({ timeout: 15000 });
    await page.getByRole('link', { name: 'Explore' }).first().click();
    await page.getByTestId('project-card').filter({ hasText: 'E2E project' }).click();
    await expect(page.getByTestId('project-detail')).toBeVisible({ timeout: 15000 });

    await page.getByTestId('request-collab-btn').click();
    await page.getByTestId('collab-message-input').fill('I can help with QA and docs.');
    await page.getByTestId('send-collab-btn').click();

    await expect(page.getByTestId('collaborator-item')).toHaveCount(1);
    await expect(page.getByTestId('collaborator-item').getByText('visitor')).toBeVisible();
  });
});
