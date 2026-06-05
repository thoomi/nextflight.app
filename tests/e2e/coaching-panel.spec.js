import { expect, test } from '@playwright/test';

test('coaching panel module renders section HTML and counts items', async ({ page }) => {
  await page.goto('/');

  const result = await page.evaluate(async () => {
    const {
      generateCoachingHTML,
      getCoachingItemCount,
    } = await import('/js/analyzer/coaching-panel.js');

    const coaching = {
      whatWentWell: ['Found lift quickly.'],
      whatToImprove: ['Stay with strong climbs.'],
      safetyMindset: ['Keep terrain clearance.'],
      nextFlightPlan: ['Pick one trigger.'],
    };

    return {
      count: getCoachingItemCount(coaching),
      html: generateCoachingHTML(coaching),
      emptyHtml: generateCoachingHTML({
        whatWentWell: [],
        whatToImprove: [],
        safetyMindset: [],
        nextFlightPlan: [],
      }),
    };
  });

  expect(result.count).toBe(4);
  expect(result.html).toContain('Flight Debrief');
  expect(result.html).toContain('Start Walkthrough');
  expect(result.html).toContain('Found lift quickly.');
  expect(result.emptyHtml).toContain('No coaching feedback available');
});
