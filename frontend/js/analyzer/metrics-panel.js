function renderMetricsPanel({ analysis, domCache, ids, formatters }) {
    const {
        formatAltitude,
        formatDistance,
        formatGlideRatio,
        formatSpeed,
        formatTime,
        formatTurnRate,
        formatVario
    } = formatters;

    domCache.get(ids.metricDuration).textContent = formatTime(analysis.durationTotal);
    domCache.get(ids.metricMaxAlt).textContent = analysis.maxAlt ? formatAltitude(analysis.maxAlt) : '-';
    domCache.get(ids.metricThermals).textContent = analysis.segments.length;
    domCache.get(ids.metricFirstLift).textContent = analysis.timeToFirstThermal ? formatTime(analysis.timeToFirstThermal) : '-';

    domCache.get(ids.metricTotalThermalTime).textContent = formatTime(analysis.totalThermalTime);
    domCache.get(ids.metricAvgThermalDuration).textContent = formatTime(analysis.avgThermalDuration);
    domCache.get(ids.metricAltGained).textContent = formatAltitude(analysis.totalAltitudeGained);

    if (analysis.best) {
        domCache.get(ids.metricBestClimb).textContent = formatVario(analysis.best.maxClimb);
        domCache.get(ids.metricBestAvgClimb).textContent = formatVario(analysis.best.avgClimb);
        domCache.get(ids.metricCenteringQuality).textContent = getCenteringQuality(analysis.best.centeringStd);
    } else {
        domCache.get(ids.metricBestClimb).textContent = '-';
        domCache.get(ids.metricBestAvgClimb).textContent = '-';
        domCache.get(ids.metricCenteringQuality).textContent = '-';
    }

    if (analysis.thermalDirectionPreference) {
        const pref = analysis.thermalDirectionPreference;
        domCache.get(ids.metricThermalDirection).textContent = `${Math.round(pref.right)}% R / ${Math.round(pref.left)}% L`;
    } else {
        domCache.get(ids.metricThermalDirection).textContent = '-';
    }
    domCache.get(ids.metricAvgTurnRate).textContent = formatTurnRate(analysis.avgThermalTurnRate);

    domCache.get(ids.metricGlides).textContent = analysis.glideCount || 0;
    domCache.get(ids.metricAvgGlideRatio).textContent = analysis.avgGlideRatio ? formatGlideRatio(analysis.avgGlideRatio) : '-';
    domCache.get(ids.metricBestGlideRatio).textContent = analysis.bestGlideRatio ? formatGlideRatio(analysis.bestGlideRatio) : '-';

    domCache.get(ids.metricTotalDistance).textContent = formatDistance(analysis.totalTrackDistance);
    domCache.get(ids.metricStraightDistance).textContent = formatDistance(analysis.straightLineDistance);
    domCache.get(ids.metricAvgSpeed).textContent = formatSpeed(analysis.avgGroundSpeed);
    domCache.get(ids.metricMaxSpeed).textContent = formatSpeed(analysis.maxGroundSpeed);

    domCache.get(ids.metricMinAlt).textContent = formatAltitude(analysis.minAlt);
    domCache.get(ids.metricAvgAlt).textContent = formatAltitude(analysis.avgAlt);
    domCache.get(ids.metricAltRange).textContent = formatAltitude(analysis.altitudeRange);
    domCache.get(ids.metricLowAltWarnings).textContent = analysis.lowAltitudeWarnings > 0 ? `${analysis.lowAltitudeWarnings} ⚠️` : '0';

    const totalTime = analysis.durationTotal;
    const climbPct = totalTime > 0 ? ` (${Math.round((analysis.timeClimbing / totalTime) * 100)}%)` : '';
    const glidePct = totalTime > 0 ? ` (${Math.round((analysis.timeGliding / totalTime) * 100)}%)` : '';
    const searchPct = totalTime > 0 ? ` (${Math.round((analysis.timeSearching / totalTime) * 100)}%)` : '';

    domCache.get(ids.metricTimeClimbing).textContent = formatTime(analysis.timeClimbing) + climbPct;
    domCache.get(ids.metricTimeGliding).textContent = formatTime(analysis.timeGliding) + glidePct;
    domCache.get(ids.metricTimeSearching).textContent = formatTime(analysis.timeSearching) + searchPct;
    domCache.get(ids.metricAltClimbing).textContent = '+' + formatAltitude(analysis.altGainedClimbing);
    domCache.get(ids.metricAltGliding).textContent = '-' + formatAltitude(analysis.altLostGliding);

    domCache.get(ids.metricLongestThermal).textContent = analysis.longestThermal ? formatTime(analysis.longestThermal.durationS) : '-';
    domCache.get(ids.metricLongestGlide).textContent = analysis.longestGlide ? formatDistance(analysis.longestGlide.straightDistance) : '-';

    if (analysis.wind && analysis.wind.confidence > 0.3) {
        domCache.get(ids.metricWindSpeed).textContent = `${Math.round(analysis.wind.speed)} km/h`;
        domCache.get(ids.metricWindDir).textContent = `${analysis.wind.directionCompass} (${Math.round(analysis.wind.confidence * 100)}%)`;
    } else {
        domCache.get(ids.metricWindSpeed).textContent = '-';
        domCache.get(ids.metricWindDir).textContent = '-';
    }

    domCache.get(ids.metricSpeedbarOps).textContent = analysis.speedbarOpportunityCount || 0;
    domCache.get(ids.metricSpeedbarWorthwhile).textContent = analysis.worthwhileSpeedbarCount || 0;
    domCache.get(ids.metricSpeedbarTimeSavings).textContent = formatTime(analysis.totalTimeSavings || 0);
    domCache.get(ids.metricSpeedbarAltCost).textContent = formatAltitude(analysis.totalAltCost || 0);

    domCache.get(ids.metricGpsGaps).textContent = analysis.gpsGaps > 0 ? `${analysis.gpsGaps} ⚠️` : '0';
}

function getCenteringQuality(centeringStd) {
    if (centeringStd < 0.4) return 'Excellent';
    if (centeringStd < 0.6) return 'Good';
    if (centeringStd < 0.8) return 'Fair';
    return 'Needs Work';
}

export {
    renderMetricsPanel,
    getCenteringQuality
};
