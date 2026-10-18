import { test, expect, chromium } from '@playwright/test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

test('installed app shell and saved set survive a browser restart offline', async () => {
  const profile = mkdtempSync(join(tmpdir(), 'progression-pwa-'));
  let context = await chromium.launchPersistentContext(profile, { headless: true, viewport: { width: 393, height: 852 } });
  try {
    let page = await context.newPage();
    await page.goto('http://127.0.0.1:4173/');
    await page.getByLabel('Your name').fill('Offline test');
    await page.getByRole('button', { name: 'Get started' }).click();
    await expect(page.getByRole('button', { name: 'Start workout', exact: true })).toBeVisible();
    await page.evaluate(() => navigator.serviceWorker.ready.then(() => true));
    await page.reload();
    await page.waitForFunction(() => !!navigator.serviceWorker.controller);
    await context.setOffline(true);
    await page.getByRole('button', { name: 'Start workout', exact: true }).click();
    await page.getByRole('button', { name: 'Start exercise', exact: true }).click();
    await page.getByRole('textbox', { name: 'Reps', exact: true }).fill('5');
    await page.getByRole('button', { name: 'Save set', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Undo last saved set' })).toBeVisible();
    const workoutUrl = page.url();
    await context.close();
    context = await chromium.launchPersistentContext(profile, { headless: true, viewport: { width: 393, height: 852 } });
    await context.setOffline(true);
    page = await context.newPage();
    await page.goto(workoutUrl);
    await expect(page.getByRole('button', { name: 'Undo last saved set' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Update app' })).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.getByRole('button', { name: 'Undo last saved set' }).click();
    await expect(page.getByRole('button', { name: 'Undo last saved set' })).toHaveCount(0);
  } finally { await context.close(); rmSync(profile, { recursive: true, force: true }); }
});

test('desktop shows four simple day cards with the requested exercises', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/');
  await page.getByLabel('Your name').fill('Plan test');
  await page.getByRole('button', { name: 'Get started' }).click();
  await expect(page.getByRole('button', { name: 'Start workout', exact: true })).toBeVisible();
  await page.screenshot({ path: test.info().outputPath('today-desktop.png'), fullPage: true });
  await page.goto('/templates');
  for (const day of ['Pull', 'Push', 'Legs + Abs', 'Mix']) await expect(page.getByRole('heading', { name: day, exact: true })).toBeVisible();
  await expect(page.getByText('Weighted Pull-ups', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: test.info().outputPath('plans-desktop.png'), fullPage: true });
  await page.getByRole('button', { name: 'Edit exercises', exact: true }).first().click();
  await expect(page.getByLabel('Exercise name 1', { exact: true })).toHaveValue('Weighted Pull-ups');
  await expect(page.getByLabel('Library exercise 1', { exact: true })).toHaveCount(0);
  await expect(page.locator('select, datalist, input[list]')).toHaveCount(0);
  await page.getByLabel('Exercise name 1', { exact: true }).fill('Weighted Pull-ups');
  await expect(page.getByLabel('Exercise name 1', { exact: true })).toHaveAttribute('autocomplete', 'off');
  await page.screenshot({ path: test.info().outputPath('edit-day.png'), fullPage: true });
});
