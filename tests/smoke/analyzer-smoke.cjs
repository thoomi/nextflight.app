const assert = require('node:assert/strict');
const fs = require('node:fs');

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

async function main() {
  const { parseTrackFile } = await import('../../frontend/js/core/igc-parser.js');
  const { analyze } = await import('../../frontend/js/core/flight-analyzer.js');

  const samplePath = 'frontend/samples/schauinsland_long_flight_many_thermals.igc';
  const sampleContent = fs.readFileSync(samplePath, 'utf8');
  const points = parseTrackFile(sampleContent, 'schauinsland_long_flight_many_thermals.igc');
  const analysis = analyze(points);

  assert.equal(analysis.points.length, 7319);
  assert.equal(analysis.segments.length, 15);
  assert.equal(Math.round(analysis.totalTrackDistance), 65538);
  assert.ok(analysis.durationTotal > 0);
  assert.ok(analysis.maxAlt > analysis.minAlt);
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
