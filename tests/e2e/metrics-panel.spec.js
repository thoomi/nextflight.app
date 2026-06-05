import { expect, test } from '@playwright/test';

test('metrics panel module renders core metric values', async ({ page }) => {
  await page.goto('/');

  const result = await page.evaluate(async () => {
    const {
      getCenteringQuality,
      renderMetricsPanel,
    } = await import('/js/analyzer/metrics-panel.js');

    const ids = {
      metricDuration: 'metricDuration',
      metricMaxAlt: 'metricMaxAlt',
      metricThermals: 'metricThermals',
      metricFirstLift: 'metricFirstLift',
      metricTotalThermalTime: 'metricTotalThermalTime',
      metricAvgThermalDuration: 'metricAvgThermalDuration',
      metricAltGained: 'metricAltGained',
      metricBestClimb: 'metricBestClimb',
      metricBestAvgClimb: 'metricBestAvgClimb',
      metricCenteringQuality: 'metricCenteringQuality',
      metricThermalDirection: 'metricThermalDirection',
      metricAvgTurnRate: 'metricAvgTurnRate',
      metricGlides: 'metricGlides',
      metricAvgGlideRatio: 'metricAvgGlideRatio',
      metricBestGlideRatio: 'metricBestGlideRatio',
      metricTotalDistance: 'metricTotalDistance',
      metricStraightDistance: 'metricStraightDistance',
      metricAvgSpeed: 'metricAvgSpeed',
      metricMaxSpeed: 'metricMaxSpeed',
      metricMinAlt: 'metricMinAlt',
      metricAvgAlt: 'metricAvgAlt',
      metricAltRange: 'metricAltRange',
      metricLowAltWarnings: 'metricLowAltWarnings',
      metricTimeClimbing: 'metricTimeClimbing',
      metricTimeGliding: 'metricTimeGliding',
      metricTimeSearching: 'metricTimeSearching',
      metricAltClimbing: 'metricAltClimbing',
      metricAltGliding: 'metricAltGliding',
      metricLongestThermal: 'metricLongestThermal',
      metricLongestGlide: 'metricLongestGlide',
      metricWindSpeed: 'metricWindSpeed',
      metricWindDir: 'metricWindDir',
      metricSpeedbarOps: 'metricSpeedbarOps',
      metricSpeedbarWorthwhile: 'metricSpeedbarWorthwhile',
      metricSpeedbarTimeSavings: 'metricSpeedbarTimeSavings',
      metricSpeedbarAltCost: 'metricSpeedbarAltCost',
      metricGpsGaps: 'metricGpsGaps',
    };
    const values = {};
    const domCache = {
      get(id) {
        values[id] ||= { textContent: '' };
        return values[id];
      },
    };

    renderMetricsPanel({
      analysis: {
        durationTotal: 600,
        maxAlt: 1234,
        segments: [{ durationS: 120 }],
        timeToFirstThermal: 45,
        totalThermalTime: 120,
        avgThermalDuration: 120,
        totalAltitudeGained: 500,
        best: { maxClimb: 2.4, avgClimb: 1.2, centeringStd: 0.5 },
        thermalDirectionPreference: { right: 70, left: 30 },
        avgThermalTurnRate: 8.5,
        glideCount: 2,
        avgGlideRatio: 7.8,
        bestGlideRatio: 9.2,
        totalTrackDistance: 12345,
        straightLineDistance: 9000,
        avgGroundSpeed: 10,
        maxGroundSpeed: 15,
        minAlt: 900,
        avgAlt: 1050,
        altitudeRange: 334,
        lowAltitudeWarnings: 1,
        timeClimbing: 120,
        timeGliding: 300,
        timeSearching: 180,
        altGainedClimbing: 500,
        altLostGliding: 450,
        longestThermal: { durationS: 120 },
        longestGlide: { straightDistance: 3000 },
        wind: { speed: 12, directionCompass: 'NW', confidence: 0.6 },
        speedbarOpportunityCount: 3,
        worthwhileSpeedbarCount: 2,
        totalTimeSavings: 30,
        totalAltCost: 80,
        gpsGaps: 1,
      },
      domCache,
      ids,
      formatters: {
        formatAltitude: (value) => `${Math.round(value)} m`,
        formatDistance: (value) => `${(value / 1000).toFixed(1)} km`,
        formatGlideRatio: (value) => `${value.toFixed(1)}:1`,
        formatSpeed: (value) => `${(value * 3.6).toFixed(1)} km/h`,
        formatTime: (value) => `${Math.round(value)}s`,
        formatTurnRate: (value) => `${value.toFixed(1)} °/s`,
        formatVario: (value) => `${value >= 0 ? '+' : ''}${value.toFixed(1)} m/s`,
      },
    });

    return {
      duration: values.metricDuration.textContent,
      maxAlt: values.metricMaxAlt.textContent,
      thermals: values.metricThermals.textContent,
      quality: values.metricCenteringQuality.textContent,
      wind: values.metricWindDir.textContent,
      gpsGaps: values.metricGpsGaps.textContent,
      qualityBoundaries: [
        getCenteringQuality(0.3),
        getCenteringQuality(0.5),
        getCenteringQuality(0.7),
        getCenteringQuality(0.9),
      ],
    };
  });

  expect(result.duration).toBe('600s');
  expect(result.maxAlt).toBe('1234 m');
  expect(result.thermals).toBe(1);
  expect(result.quality).toBe('Good');
  expect(result.wind).toBe('NW (60%)');
  expect(result.gpsGaps).toBe('1 ⚠️');
  expect(result.qualityBoundaries).toEqual(['Excellent', 'Good', 'Fair', 'Needs Work']);
});
