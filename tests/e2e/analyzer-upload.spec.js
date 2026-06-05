import { expect, test } from '@playwright/test';

test('analyzer upload module loads sample content and reports parse errors', async ({ page }) => {
  await page.goto('/');

  const result = await page.evaluate(async () => {
    const {
      analyzeAnalyzerTrackContent,
      loadAnalyzerSampleTrack,
    } = await import('/js/analyzer/upload.js');

    const loaded = await loadAnalyzerSampleTrack('/samples/schauinsland_short_flight_no_real_climb.igc');

    let errorMessage = '';
    try {
      analyzeAnalyzerTrackContent('plain text', 'bad.txt');
    } catch (error) {
      errorMessage = error.message;
    }

    return {
      fileName: loaded.fileName,
      pointCount: loaded.points.length,
      analysisPointCount: loaded.analysis.points.length,
      distance: Math.round(loaded.analysis.totalTrackDistance),
      errorMessage,
    };
  });

  expect(result.fileName).toBe('schauinsland_short_flight_no_real_climb.igc');
  expect(result.pointCount).toBeGreaterThan(10);
  expect(result.analysisPointCount).toBe(result.pointCount);
  expect(result.distance).toBeGreaterThan(0);
  expect(result.errorMessage).toBe('Unsupported file format. Please upload an IGC or GPX file.');
});
