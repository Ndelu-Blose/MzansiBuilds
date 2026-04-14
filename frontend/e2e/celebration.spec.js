const { test, expect } = require('@playwright/test');

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

test.describe('Celebration page', () => {
  test('renders controls, spotlight, and cards', async ({ page }) => {
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

      if (method === 'GET' && path === '/api/celebration') {
        await json({
          spotlight: {
            id: 'project-spotlight',
            user_id: 'user-1',
            title: 'Spotlight Build',
            description: 'A standout completed build.',
            tech_stack: ['React', 'FastAPI'],
            stage: 'completed',
            created_at: iso(),
            updated_at: iso(),
            completed_at: iso(),
            builder: { id: 'user-1', name: 'Spotlight Builder', username: 'spotlight' },
            reaction_counts: { applaud: 4, star: 3, inspired: 2 },
            viewer_reactions: { applauded: false, starred: false, inspired: false },
            collaborators_count: 2,
            comments_count: 1,
          },
          items: [
            {
              id: 'project-1',
              user_id: 'user-2',
              title: 'Completed Build One',
              description: 'Community project one',
              tech_stack: ['Node'],
              stage: 'completed',
              created_at: iso(),
              updated_at: iso(),
              completed_at: iso(),
              user: { id: 'user-2', name: 'Builder One', email: 'one@example.com', role: 'user', auth_provider: 'email', created_at: iso() },
              reaction_counts: { applaud: 1, star: 0, inspired: 0 },
              viewer_reactions: { applauded: false, starred: false, inspired: false },
              collaborators_count: 1,
              comments_count: 0,
            },
          ],
          summary: { total_completed: 3, this_week: 1, this_month: 2 },
          total: 1,
          limit: 20,
          offset: 0,
        });
        return;
      }

      if (method === 'GET' && path === '/api/my/bookmarks') {
        await json({ items: [], total: 0, limit: 5, offset: 0 });
        return;
      }

      await route.fallback();
    });

    await page.goto('/celebration');

    await expect(page.getByRole('heading', { name: 'Celebration Wall' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'This Week' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Trending' })).toBeVisible();
    await expect(page.getByText('Spotlight project')).toBeVisible();
    await expect(page.getByText('Completed Build One')).toBeVisible();
  });
});
