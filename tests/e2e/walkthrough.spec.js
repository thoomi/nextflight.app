import { expect, test } from '@playwright/test';

test('walkthrough module builds items with jump targets', async ({ page }) => {
  await page.goto('/');

  const result = await page.evaluate(async () => {
    const {
      buildWalkthroughItems,
      detectJumpTarget,
    } = await import('/js/analyzer/walkthrough.js');

    const analysis = {
      best: { avgClimb: 1.5, maxClimb: 2.2 },
      segments: [
        { avgClimb: 0.8, maxClimb: 1.2 },
        { avgClimb: 1.5, maxClimb: 2.2 },
      ],
      glides: [
        { speedbarOpportunity: false, efficiency: 0.9 },
        { speedbarOpportunity: true, efficiency: 0.8 },
      ],
    };
    const coaching = {
      whatWentWell: [
        {
          text: 'Found lift quickly near launch.',
          evidence: [{ target: { type: 'thermal', index: 1, timeS: 42 } }],
        },
      ],
      whatToImprove: ['Your strongest climb was left early.', '2 glide(s) were indirect.'],
      safetyMindset: ['Breathe and stay loose.'],
      nextFlightPlan: ['Use speedbar in headwind.'],
    };

    return {
      items: buildWalkthroughItems(coaching, analysis),
      targets: [
        detectJumpTarget('Found first lift quickly.', analysis),
        detectJumpTarget('Best centering was in climb two.', analysis),
        detectJumpTarget('Use speedbar on the next glide.', analysis),
        detectJumpTarget('Your glide efficiency was low.', analysis),
        detectJumpTarget('General mindset tip.', analysis),
      ],
    };
  });

  expect(result.items).toHaveLength(5);
  expect(result.items[0]).toMatchObject({
    type: 'strength',
    icon: '✓',
    jumpTarget: { type: 'thermal', index: 1, timeS: 42 },
  });
  expect(result.items[1].jumpTarget).toEqual({ type: 'thermal', index: 1 });
  expect(result.items[2].jumpTarget).toEqual({ type: 'glide', index: 1 });
  expect(result.items[4].jumpTarget).toEqual({ type: 'glide', index: 1 });
  expect(result.targets).toEqual([
    { type: 'thermal', index: 0 },
    { type: 'thermal', index: 1 },
    { type: 'glide', index: 1 },
    { type: 'glide', index: 1 },
    { type: 'time', ratio: 0.3 },
  ]);
});
