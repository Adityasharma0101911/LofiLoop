import { test as base, expect, type Page } from '@playwright/test';

/** Fails the test on any uncaught page error or console error. */
export const test = base.extend<{ studio: Page }>({
  studio: async ({ page }, provide) => {
    const problems: string[] = [];
    page.on('pageerror', (error) => problems.push(`pageerror: ${error.message}`));
    page.on('console', (msg) => {
      if (msg.type() === 'error') problems.push(`console: ${msg.text()}`);
    });
    await page.goto('/');
    await expect(page.getByRole('grid', { name: /Pattern A steps/ })).toBeVisible();
    await provide(page);
    expect(problems, problems.join('\n')).toEqual([]);
  },
});

export { expect };

export const kickPad = (page: Page, col: number) => page.locator(`[data-cell][data-row="0"][data-col="${col}"]`);
