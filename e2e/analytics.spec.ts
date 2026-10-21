import { test, expect, type Page } from '@playwright/test';

async function expectNoHorizontalOverflow(page: Page) {
  await expect.poll(() => page.evaluate(() => {
    const documentWidth = document.documentElement.scrollWidth;
    if (documentWidth <= innerWidth) return [];
    const offenders = [...document.body.querySelectorAll<HTMLElement>('*')]
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return { element, left: Math.round(rect.left), right: Math.round(rect.right), width: Math.round(rect.width) };
      })
      .filter(({ left, right, width }) => width > 0 && (left < -1 || right > innerWidth + 1))
      .slice(0, 20)
      .map(({ element, ...rect }) => ({
        tag: element.tagName.toLowerCase(),
        className: typeof element.className === 'string' ? element.className : '',
        text: element.innerText?.slice(0, 80),
        ...rect,
      }));
    return { viewportWidth: innerWidth, documentWidth, offenders };
  })).toEqual([]);
}

test('activity dashboard charts are readable on desktop, mobile and dark themes', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.goto('/');
  await page.getByLabel('Your name').fill('Dashboard preview');
  await page.getByRole('button', { name: 'Get started' }).click();
  await expect(page.getByRole('button', { name: 'Start workout', exact: true })).toBeVisible();
  // Seed only this isolated browser context; no personal browser data is touched.
  await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('workout-tracker');
      request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
    });
    const exercises = await new Promise<{ id: string; name: string }[]>((resolve, reject) => {
      const request = db.transaction('exercises').objectStore('exercises').getAll();
      request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
    });
    const monday = new Date(); monday.setHours(12, 0, 0, 0); monday.setDate(monday.getDate() - (monday.getDay() + 6) % 7);
    const day = (offset: number) => { const date = new Date(monday); date.setDate(date.getDate() + offset); return date.getTime(); };
    const tx = db.transaction(['sessions', 'logs', 'runs', 'bodyWeights'], 'readwrite');
    for (const [index, sets] of [18, 12, 20, 16].entries()) {
      const date = day(index * 2);
      tx.objectStore('sessions').put({ id: `preview-${index}`, templateId: 'preview-plan', templateName: 'Pull', date, startTime: date, endTime: date + 3600000, status: 'completed', notes: '', feeling: 'good' });
      for (let set = 0; set < sets; set++) {
        const exercise = exercises.find((exercise) => exercise.name === ['Barbell Bench Press', 'Weighted Pull-ups', 'Barbell Squat', 'Romanian Deadlift'][set % 4])!;
        tx.objectStore('logs').put({ id: `preview-${index}-${set}`, sessionId: `preview-${index}`, exerciseId: exercise.id, exerciseName: exercise.name, setNumber: set + 1, weight: 40, reps: 10, timestamp: date });
      }
    }
    for (const [index, weight] of [74.2, 74, 74.1, 73.8].entries()) tx.objectStore('bodyWeights').put({ id: `weight-${index}`, date: day(index * 2), createdAt: day(index * 2), weight });
    tx.objectStore('runs').put({ id: 'run-1', date: day(1), distanceKm: 5, durationSeconds: 1500, createdAt: day(1) });
    tx.objectStore('runs').put({ id: 'run-2', date: day(4), distanceKm: 7.5, durationSeconds: 2400, createdAt: day(4) });
    await new Promise<void>((resolve, reject) => { tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); });
    db.close();
  });
  await page.goto('/analytics');
  await expect(page.getByRole('region', { name: 'Workouts', exact: true })).toContainText('4');
  await expect(page.getByRole('region', { name: 'Categories trained', exact: true })).toContainText('4');
  await expect(page.getByRole('region', { name: 'Running distance', exact: true })).toContainText('12.5');
  await expect(page.locator('.recharts-bar-rectangle').first()).toBeVisible();
  await expect(page.locator('.recharts-line-curve')).toBeVisible();
  await expect(page.getByRole('combobox')).toHaveCount(0);
  await page.screenshot({ path: test.info().outputPath('activity-desktop.png'), fullPage: true, animations: 'disabled' });
  await expect(page.getByRole('button', { name: 'Sets', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'This year', exact: true }).click();
  await expect(page.getByRole('table', { name: 'Workouts recorded values' }).getByRole('row')).toHaveCount(13);
  await page.getByRole('button', { name: 'This week', exact: true }).click();
  const contentPane = page.locator('main').locator('..');
  const frameBefore = await contentPane.boundingBox();
  await page.getByRole('group', { name: 'Exercise categories' }).getByRole('button', { name: /Chest/ }).click();
  await expect(page.getByRole('region', { name: 'Chest exercise records' })).toContainText('Barbell Bench Press');
  await expect(page.getByRole('table', { name: 'Set load recorded values' })).toContainText('40 kg');
  await contentPane.evaluate((element) => { element.scrollTop = 500; });
  await expect.poll(() => contentPane.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
  await expect.poll(() => contentPane.boundingBox()).toEqual(frameBefore);
  const header = await page.locator('main header').first().boundingBox();
  expect(Math.abs(header!.y - frameBefore!.y)).toBeLessThanOrEqual(2);
  await page.screenshot({ path: test.info().outputPath('activity-scrolled-desktop.png'), animations: 'disabled' });
  await contentPane.evaluate((element) => { element.scrollTop = 0; });
  await page.getByRole('button', { name: 'Run km', exact: true }).click();
  await expect(page.getByRole('table', { name: 'Running distance recorded values' })).toContainText('7.5 km');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => window.scrollTo(0, 0));
  await expectNoHorizontalOverflow(page);
  // Wider system fonts and larger text must not let accessible chart tables
  // expand the document. macOS fonts otherwise conceal this Linux CI failure.
  const largerTableText = await page.addStyleTag({ content: 'table { font-size: 24px; }' });
  await expectNoHorizontalOverflow(page);
  await expect(page.getByRole('table', { name: 'Set load recorded values' })).toContainText('40 kg');
  await largerTableText.evaluate((element) => element.remove());
  await page.screenshot({ path: test.info().outputPath('activity-mobile.png'), fullPage: true, animations: 'disabled' });
  await page.evaluate(() => { document.documentElement.classList.add('dark'); document.documentElement.dataset.accent = 'purple'; });
  await page.screenshot({ path: test.info().outputPath('activity-dark.png'), fullPage: true, animations: 'disabled' });
  expect(await page.locator('.recharts-bar-rectangle path').first().evaluate((node) => getComputedStyle(node).fill)).toBe('rgb(125, 122, 245)');
});

test('old and new Bench Press IDs share every recorded load and exercise history', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Your name').fill('History mapping check');
  await page.getByRole('button', { name: 'Get started' }).click();
  await expect(page.getByRole('button', { name: 'Start workout', exact: true })).toBeVisible();
  await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('workout-tracker');
      request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
    });
    const exercises = await new Promise<{ id: string; name: string }[]>((resolve, reject) => {
      const request = db.transaction('exercises').objectStore('exercises').getAll();
      request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
    });
    const current = exercises.find((exercise) => exercise.name === 'Barbell Bench Press')!;
    const now = Date.now(); const oldDate = now - 400 * 86_400_000;
    const tx = db.transaction(['exercises', 'sessions', 'logs'], 'readwrite');
    tx.objectStore('exercises').put({ id: 'legacy-bench', name: 'Bench Press', createdAt: oldDate });
    for (const [id, date] of [['old-bench-session', oldDate], ['current-bench-session', now]] as const) {
      tx.objectStore('sessions').put({ id, templateId: 'historic-plan', templateName: 'Push', date, startTime: date, endTime: date + 1000, status: 'completed', notes: '', feeling: null });
    }
    tx.objectStore('logs').put({ id: 'legacy-bench-set', sessionId: 'old-bench-session', exerciseId: 'legacy-bench', exerciseName: 'Bench Press', weight: 50, reps: 8, setNumber: 1, timestamp: oldDate });
    tx.objectStore('logs').put({ id: 'current-bench-set', sessionId: 'current-bench-session', exerciseId: current.id, exerciseName: current.name, weight: 80, reps: 6, setNumber: 1, timestamp: now });
    await new Promise<void>((resolve, reject) => { tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); });
    db.close();
  });
  await page.goto('/activity');
  await page.getByRole('group', { name: 'Exercise categories' }).getByRole('button', { name: /Chest/ }).click();
  const records = page.getByRole('region', { name: 'Chest exercise records' });
  await expect(records.getByRole('link', { name: /Bench Press/ })).toHaveCount(1);
  const history = records.getByRole('table', { name: 'Set load recorded values' });
  await expect(history).toHaveCount(1);
  await expect(history.getByRole('row')).toHaveCount(3);
  await expect(history).toContainText('50 kg');
  await expect(history).toContainText('80 kg');
  await records.getByRole('link', { name: /Bench Press/ }).click();
  await expect(page.getByText('50kg × 8', { exact: true })).toBeVisible();
  await expect(page.getByText('80kg × 6', { exact: true })).toBeVisible();
  await expect(page.getByText('Not enough data yet')).toHaveCount(0);
});
