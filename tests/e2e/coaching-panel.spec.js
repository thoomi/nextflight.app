import { expect, test } from '@playwright/test';

test('coaching panel module renders section HTML and counts items', async ({ page }) => {
  await page.goto('/');

  const result = await page.evaluate(async () => {
    const {
      generateCoachingHTML,
      getCoachingItemCount,
    } = await import('/js/analyzer/coaching-panel.js');

    const coaching = {
      quickDebrief: {
        whatWentWell: {
          text: 'Found lift quickly.',
          evidence: [
            {
              label: 'Thermal 1',
              detail: 'Avg 1.2 m/s',
              timeS: 125,
              target: { type: 'thermal', index: 0, timeS: 125, startIdx: 10, endIdx: 20 },
            },
          ],
        },
        altitudeCost: { text: 'Stay with strong climbs.', evidence: [] },
        nextAction: { text: 'Pick one trigger.', evidence: [] },
      },
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
  expect(result.html).toContain('What went well');
  expect(result.html).toContain('Show evidence');
  expect(result.html).toContain('data-target-type="thermal"');
  expect(result.html).toContain('Was this useful?');
  expect(result.html).toContain('Stored locally in this browser only.');
  expect(result.html).toContain('Start Walkthrough');
  expect(result.html).toContain('Found lift quickly.');
  expect(result.emptyHtml).toContain('No coaching feedback available');
});

test('coaching panel wires evidence clicks and local feedback', async ({ page }) => {
  await page.goto('/');

  const result = await page.evaluate(async () => {
    const { parseTrackFile } = await import('/js/core/igc-parser.js');
    const { analyze } = await import('/js/core/flight-analyzer.js');
    const { renderCoachingPanel } = await import('/js/analyzer/coaching-panel.js');

    window.localStorage.clear();

    const sample = await fetch('/samples/schauinsland_long_flight_many_thermals.igc').then((response) => response.text());
    const analysis = analyze(parseTrackFile(sample, 'sample.igc'));
    const container = document.createElement('div');
    const badge = document.createElement('div');
    document.body.append(container, badge);

    const events = [];
    renderCoachingPanel({
      analysis,
      domCache: {
        get(id) {
          return id === 'coachingTabContent' ? container : badge;
        },
      },
      ids: {
        coachingTabContent: 'coachingTabContent',
        coachingBadge: 'coachingBadge',
        startWalkthroughBtn: 'startWalkthroughBtn',
      },
      cssClasses: { hidden: 'hidden' },
      onStartWalkthrough: () => events.push({ type: 'walkthrough' }),
      onEvidenceSelect: (target) => events.push(target),
    });

    await Promise.resolve();
    container.querySelector('[data-evidence-target]').click();
    container.querySelector('[data-feedback-value="yes"]').click();

    return {
      events,
      savedFeedback: JSON.parse(window.localStorage.getItem('nextflight.coachingFeedback.v1')),
      badgeText: badge.textContent,
      hasEvidence: Boolean(container.querySelector('[data-evidence-target]')),
    };
  });

  expect(result.hasEvidence).toBe(true);
  expect(result.events[0]).toMatchObject({ type: expect.any(String), index: expect.any(Number) });
  expect(result.savedFeedback[0]).toMatchObject({ useful: 'yes' });
  expect(Number(result.badgeText)).toBeGreaterThan(0);
});
