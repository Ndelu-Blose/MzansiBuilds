const { test, expect } = require('@playwright/test');

const OWNER_ID = '00000000-0000-4000-8000-000000000001';
const IMPORTED_PROJECT_ID = '00000000-0000-4000-8000-0000000000ab';
const GITHUB_REPO_ID = 424242;

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

const mockRepo = {
  github_repo_id: GITHUB_REPO_ID,
  name: 'gh-import-repo',
  full_name: 'e2e-owner/gh-import-repo',
  owner_login: 'e2e-owner',
  owner_id: 1,
  private: false,
  description: 'Repo description from GitHub API',
  updated_at: iso(),
  pushed_at: iso(),
  language: 'TypeScript',
  topics: ['react', 'testing'],
  stargazers_count: 3,
  forks_count: 1,
  owner_avatar_url: null,
  homepage: 'https://demo.example.com',
  owner_match: true,
  contributor_match: false,
  visibility: 'public',
};

function importedProjectResponse(overrides = {}) {
  return {
    id: IMPORTED_PROJECT_ID,
    user_id: OWNER_ID,
    title: 'Custom GH Title',
    description: 'Edited description for e2e',
    tech_stack: [],
    stage: 'idea',
    support_needed: null,
    short_pitch: null,
    long_description: 'Edited description for e2e',
    category: null,
    tags: ['TypeScript', 'react', 'testing'],
    looking_for_help: null,
    roles_needed: [],
    demo_url: 'https://demo.example.com',
    problem_statement: null,
    roadmap_summary: null,
    project_type: 'idea',
    verification_status: 'unverified',
    ownership_type: 'none',
    repo_connected: true,
    created_at: iso(),
    updated_at: iso(),
    import_provenance: {
      source: 'github',
      github_repo_full_name: 'e2e-owner/gh-import-repo',
      github_repo_id: GITHUB_REPO_ID,
      imported_at: iso(),
      submitted_title: 'Custom GH Title',
      submitted_tags: ['TypeScript', 'react', 'testing'],
      submitted_stage: 'idea',
      submitted_demo_url: 'https://demo.example.com',
    },
    ...overrides,
  };
}

async function installGithubImportMocks(page) {
  let lastImportPayload = null;

  await page.route('**/api/**', async (route) => {
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
      const user = email.includes('visitor') ? loginUser('00000000-0000-4000-8000-000000000002', email) : loginUser(OWNER_ID, email);
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
      await json({ items: [] });
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

    if (method === 'GET' && path === '/api/dashboard/activation-state') {
      await json({ has_projects: false, has_matches: false, has_activity: false, skills_count: 0, first_match_count: 0 });
      return;
    }

    if (method === 'GET' && path === '/api/integrations/github/account') {
      await json({ connected: true, username: 'e2e-owner', avatar_url: null, scopes: 'read:user', connected_at: iso() });
      return;
    }

    if (method === 'GET' && path === '/api/integrations/github/repos') {
      await json({
        items: [mockRepo],
        total: 1,
        page: 1,
        per_page: 8,
      });
      return;
    }

    if (method === 'GET' && path === `/api/integrations/github/repos/${GITHUB_REPO_ID}/languages`) {
      await json({ languages: { TypeScript: 70, CSS: 30 } });
      return;
    }

    if (method === 'GET' && path === `/api/integrations/github/repos/${GITHUB_REPO_ID}/readme-summary`) {
      await json({ text: '# Hello\n\nReadme body for import test.' });
      return;
    }

    if (method === 'POST' && path === '/api/projects/import/github') {
      lastImportPayload = await request.postDataJSON();
      await json(importedProjectResponse());
      return;
    }

    await route.fulfill({ status: 501, headers: corsHeaders(request), body: JSON.stringify({ detail: `Unhandled e2e path: ${method} ${path}` }) });
  });

  await page.route('**/auth/v1/token**', async (route) => {
    if (route.request().method() !== 'POST') {
      await route.continue();
      return;
    }
    const user = loginUser(OWNER_ID, 'owner@e2e.test');
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        access_token: 'e2e-access-token',
        token_type: 'bearer',
        expires_in: 3600,
        refresh_token: 'e2e-refresh-token',
        user: {
          id: user.id,
          email: user.email,
          role: 'authenticated',
          aud: 'authenticated',
          app_metadata: { provider: 'email' },
          user_metadata: { full_name: user.name },
          created_at: iso(),
        },
      }),
    });
  });

  return { getLastImportPayload: () => lastImportPayload };
}

async function legacyLogin(page) {
  await page.goto('/login');
  await page.getByTestId('email-input').fill('owner@e2e.test');
  await page.getByTestId('password-input').fill('any-password');
  await page.getByTestId('submit-btn').click();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 20000 });
}

test.describe('GitHub import flow', () => {
  test('mocks GitHub + import API, review step, and successful import', async ({ page }) => {
    const { getLastImportPayload } = await installGithubImportMocks(page);
    await legacyLogin(page);

    await page.getByTestId('create-project-btn').click();
    await expect(page.getByTestId('create-project-modal')).toBeVisible();

    await page.getByRole('button', { name: mockRepo.full_name }).click();

    await expect(page.getByTestId('github-repo-preview')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('README preview')).toBeVisible({ timeout: 10000 });

    await page.getByTestId('project-title-input').fill('Custom GH Title');
    await page.getByTestId('project-description-input').fill('Edited description for e2e');

    await page.getByTestId('github-import-review-step-btn').click();
    await expect(page.getByTestId('github-import-review')).toBeVisible();
    await expect(page.getByTestId('github-import-review-warnings')).toBeVisible();
    await expect(page.getByTestId('github-import-review-warnings')).toContainText('quite short');
    await expect(page.getByTestId('github-import-review-desc-count')).toContainText('recommended 40+');

    await page.getByTestId('github-import-review-jump-description').click();
    await expect(page.getByTestId('github-import-review')).toBeHidden();
    await expect(page.getByTestId('project-description-input')).toBeFocused();

    await page.getByTestId('github-import-review-step-btn').click();
    await expect(page.getByTestId('github-import-review')).toBeVisible();
    await expect(page.getByTestId('github-import-review')).toContainText('Custom GH Title');
    await expect(page.getByTestId('github-import-review')).toContainText('Edited description for e2e');
    await expect(page.getByTestId('github-import-review')).toContainText('https://demo.example.com');

    await page.getByTestId('github-import-confirm-btn').click();

    await expect(page.getByTestId('create-project-modal')).toBeHidden({ timeout: 15000 });
    await expect(page.getByRole('link', { name: /Custom GH Title/i })).toBeVisible();

    const payload = getLastImportPayload();
    expect(payload).toBeTruthy();
    expect(payload.github_repo_id).toBe(GITHUB_REPO_ID);
    expect(payload.title).toBe('Custom GH Title');
    expect(payload.long_description).toBe('Edited description for e2e');
    expect(payload.stage).toBe('idea');
    expect(payload.demo_url).toBe('https://demo.example.com');
    expect(Array.isArray(payload.tags)).toBeTruthy();
    expect(payload.tags).toContain('TypeScript');
  });
});
