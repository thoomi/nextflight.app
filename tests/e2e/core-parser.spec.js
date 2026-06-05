import { expect, test } from '@playwright/test';

test('core parser module parses IGC and GPX tracks and reports common errors', async ({ page }) => {
  await page.goto('/');

  const result = await page.evaluate(async () => {
    const { parseTrackFile } = await import('/js/core/igc-parser.js');

    const igcResponse = await fetch('/samples/schauinsland_short_flight_no_real_climb.igc');
    const igcContent = await igcResponse.text();
    const igcPoints = parseTrackFile(igcContent, 'sample.igc');

    const gpxContent = `<?xml version="1.0" encoding="UTF-8"?>
      <gpx version="1.1" creator="NextFlight test">
        <trk>
          <trkseg>
            <trkpt lat="47.0000" lon="7.0000">
              <ele>1000</ele>
              <time>2026-06-05T08:00:00Z</time>
            </trkpt>
            <trkpt lat="47.0001" lon="7.0002">
              <ele>1015</ele>
              <time>2026-06-05T08:00:10Z</time>
            </trkpt>
          </trkseg>
        </trk>
      </gpx>`;
    const gpxPoints = parseTrackFile(gpxContent, 'sample.gpx');

    const errors = [];
    for (const [content, filename] of [
      ['plain text', 'sample.txt'],
      ['<gpx><trk></gpx>', 'broken.gpx'],
    ]) {
      try {
        parseTrackFile(content, filename);
      } catch (error) {
        errors.push(error.message);
      }
    }

    return {
      igcPointCount: igcPoints.length,
      gpxPointCount: gpxPoints.length,
      gpxSecondTime: gpxPoints[1].timeS,
      errors,
    };
  });

  expect(result.igcPointCount).toBeGreaterThan(10);
  expect(result.gpxPointCount).toBe(2);
  expect(result.gpxSecondTime).toBe(10);
  expect(result.errors).toEqual([
    'Unsupported file format. Please upload an IGC or GPX file.',
    'Invalid GPX file format',
  ]);
});
