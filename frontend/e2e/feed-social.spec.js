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

test.describe('Feed social timeline', () => {
  test('renders tabs, composer, and timeline item', async ({ page }) => {
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

      if (method === 'GET' && path === '/api/feed') {
        await json({
          items: [
            {
              id: 'post-1',
              activity_type: 'update',
              content: 'Checkout flow finished and deployed',
              tags: ['React', 'Stripe'],
              created_at: iso(),
              updated_at: iso(),
              author: { id: 'user-1', name: 'Thamsanqa', username: 'tham', picture: null },
              project: { id: 'project-1', title: 'E-commerce Platform', stage: 'in_progress' },
              reactions: { like: 2, applaud: 1, inspired: 1 },
              viewer_reactions: { liked: false, applauded: false, inspired: false },
              comments_count: 1,
              recent_comments: [],
            },
          ],
          total: 1,
          limit: 20,
          offset: 0,
          tab: 'all',
        });
        return;
      }

      if (method === 'GET' && path === '/api/my/projects') {
        await json({ items: [], total: 0, limit: 100, offset: 0 });
        return;
      }

      await route.fallback();
    });

    await page.goto('/feed');

    await expect(page.getByRole('heading', { name: 'Activity Feed' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Following' })).toBeVisible();
    await expect(page.getByPlaceholder('What are you building?')).toBeVisible();
    await expect(page.getByText('Checkout flow finished and deployed')).toBeVisible();
    await expect(page.getByRole('button', { name: /Like 2/i })).toBeVisible();
  });
});
