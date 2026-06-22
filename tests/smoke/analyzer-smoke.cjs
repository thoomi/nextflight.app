const assert = require('node:assert/strict');
const fs = require('node:fs');

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

async function main() {
  const { parseTrackFile } = await import('../../frontend/js/core/igc-parser.js');
  const { analyze, generateCoaching } = await import('../../frontend/js/core/flight-analyzer.js');

  const samplePath = 'frontend/samples/schauinsland_long_flight_many_thermals.igc';
  const sampleContent = fs.readFileSync(samplePath, 'utf8');
  const points = parseTrackFile(sampleContent, 'schauinsland_long_flight_many_thermals.igc');
  const analysis = analyze(points);

  assert.equal(analysis.points.length, 7319);
  assert.equal(analysis.segments.length, 15);
  assert.equal(Math.round(analysis.totalTrackDistance), 65538);
  assert.ok(analysis.durationTotal > 0);
  assert.ok(analysis.maxAlt > analysis.minAlt);
  assert.ok(analysis.timeline.length > analysis.segments.length);
  assert.equal(analysis.segments[0].id, 'thermal-1');
  assert.equal(analysis.glides[0].id, 'glide-1');

  const coaching = generateCoaching(analysis);
  assert.ok(coaching.quickDebrief.whatWentWell);
  assert.ok(coaching.quickDebrief.altitudeCost);
  assert.ok(coaching.quickDebrief.nextAction);
  assert.ok(coaching.whatToImprove.some((item) => item.evidence && item.evidence.length > 0));

  const shortSampleContent = fs.readFileSync('frontend/samples/schauinsland_short_flight_no_real_climb.igc', 'utf8');
  const shortPoints = parseTrackFile(shortSampleContent, 'schauinsland_short_flight_no_real_climb.igc');
  const shortCoaching = generateCoaching(analyze(shortPoints));
  assert.ok(shortCoaching.quickDebrief.nextAction.text.length > 0);
  assert.ok(shortCoaching.quickDebrief.nextAction.evidence.length > 0);
  assert.throws(
    () => analyze(points.slice(0, 2)),
    /Track too short: 2 points/
  );

  console.log(
    [
      analysis.points.length,
      analysis.segments.length,
      Math.round(analysis.totalTrackDistance),
    ].join(' ')
  );
}
