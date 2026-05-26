import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const pages = [
  { name: 'Home', url: '/' },
  { name: 'Dashboard', url: '/dashboard' },
  { name: 'Borrow', url: '/borrow' }
];

for (const page of pages) {
  test(`${page.name} page should not have accessibility violations`, async ({ page: playwright }) => {
    await playwright.goto(page.url);
    
    // Wait for page to load
    await playwright.waitForLoadState('networkidle');
    
    const accessibilityScanResults = await new AxeBuilder({ page: playwright })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test(`${page.name} page should have proper color contrast`, async ({ page: playwright }) => {
    await playwright.goto(page.url);
    await playwright.waitForLoadState('networkidle');
    
    const accessibilityScanResults = await new AxeBuilder({ page: playwright })
      .withRules(['color-contrast'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });
}

test('Interactive elements should have proper focus indicators', async ({ page }) => {
  await page.goto('/borrow');
  await page.waitForLoadState('networkidle');
  
  // Test button focus
  const connectButton = page.getByRole('button', { name: /connect freighter wallet/i });
  await connectButton.focus();
  
  // Check if focus ring is visible
  const focusRing = await connectButton.evaluate((el) => {
    const styles = window.getComputedStyle(el, ':focus');
    return {
      outline: styles.outline,
      boxShadow: styles.boxShadow,
    };
  });
  
  expect(focusRing.outline !== 'none' || focusRing.boxShadow !== 'none').toBeTruthy();
});

test('Form inputs should have proper labels and contrast', async ({ page }) => {
  await page.goto('/borrow');
  await page.waitForLoadState('networkidle');
  
  const accessibilityScanResults = await new AxeBuilder({ page })
    .withRules(['label', 'color-contrast'])
    .include('form')
    .analyze();

  expect(accessibilityScanResults.violations).toEqual([]);
});
