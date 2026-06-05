import { expect, test } from '@playwright/test';

test('replay state module computes progress, point index, and interpolated position', async ({ page }) => {
  await page.goto('/');

  const result = await page.evaluate(async () => {
    const {
      clampReplayTime,
      getAircraftPositionAtReplayTime,
      getCurrentPointIndex,
      getReplayProgressPercent,
      getReplayTimeLabel,
    } = await import('/js/analyzer/replay-state.js');

    const points = [
      { timeS: 100, lon: 7, lat: 47, altM: 1000 },
      { timeS: 110, lon: 8, lat: 48, altM: 1100 },
      { timeS: 120, lon: 9, lat: 49, altM: 1200 },
    ];
    const position = getAircraftPositionAtReplayTime(points, [1000, 1200, 1300], 5);

    return {
      clampedLow: clampReplayTime(-10, 20),
      clampedHigh: clampReplayTime(30, 20),
      indexAt15: getCurrentPointIndex(points, 15),
      label: getReplayTimeLabel(5, 20, (value) => `${value}s`),
      position,
      progress: getReplayProgressPercent(5, 20),
      zeroProgress: getReplayProgressPercent(5, 0),
    };
  });

  expect(result.clampedLow).toBe(0);
  expect(result.clampedHigh).toBe(20);
  expect(result.indexAt15).toBe(1);
  expect(result.label).toBe('5s / 20s');
  expect(result.position).toEqual({
    index: 0,
    lon: 7.5,
    lat: 47.5,
    alt: 1100,
  });
  expect(result.progress).toBe(25);
  expect(result.zeroProgress).toBe(0);
});
