/**
 * Flight Analyzer
 * Ported from Python backend - analyzes paragliding flight tracks
 */

// Configuration Constants
const CONFIG = {
    // Thermal Detection
    MIN_CLIMB_RATE: 0.4,  // m/s - minimum average climb to consider thermal
    MIN_TURN_RATE: 3.5,  // deg/s - minimum turn rate to detect circling
    MIN_THERMAL_DURATION: 18.0,  // seconds - minimum time to qualify as thermal
    MIN_THERMAL_CLIMB_CHECK: 0.1,  // m/s - instant climb threshold for thermal entry
    THERMAL_WINDOW_SECONDS: 30.0,  // seconds - rolling window for heading change detection
    MIN_HEADING_CHANGE: 90.0,  // degrees - minimum heading change in window
    EXIT_HEADING_CHANGE: 30.0,  // degrees - heading change below this indicates thermal exit
    EXIT_VARIO_THRESHOLD: -0.5,  // m/s - vario threshold for confirming thermal exit

    // Smoothing
    VARIO_SMOOTH_WINDOW: 5,  // points for vario smoothing
    TURN_SMOOTH_WINDOW: 5,  // points for turn rate smoothing

    // Early Exit Detection
    STRONG_CLIMB_THRESHOLD: 1.2,  // m/s - peak climb considered "strong"
    EXIT_CLIMB_THRESHOLD: 0.8,  // m/s - exit climb considered "still good"
    TIME_SINCE_PEAK_THRESHOLD: 12.0,  // seconds - exit too soon after peak

    // GPS Quality
    MAX_TIME_GAP: 10.0,  // seconds - max gap before considering it a signal loss
    MAX_SPEED_MPS: 30.0,  // m/s - sanity check for paraglider speed
    MIN_TRACK_POINTS: 10,  // minimum points for valid track

    // Analysis
    CENTERING_TIP_DISTANCE: "30-50 m"  // advice distance for centering
};

/**
 * Calculate distance between two points using Haversine formula
 * @param {number} lat1 - Latitude of point 1 (degrees)
 * @param {number} lon1 - Longitude of point 1 (degrees)
 * @param {number} lat2 - Latitude of point 2 (degrees)
 * @param {number} lon2 - Longitude of point 2 (degrees)
 * @returns {number} - Distance in meters
 */
function haversineM(lat1, lon1, lat2, lon2) {
    const R = 6371000.0; // Earth radius in meters
    const phi1 = lat1 * Math.PI / 180;
    const phi2 = lat2 * Math.PI / 180;
    const dphi = (lat2 - lat1) * Math.PI / 180;
    const dlambda = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(dphi / 2) ** 2 +
              Math.cos(phi1) * Math.cos(phi2) * Math.sin(dlambda / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Calculate bearing from point 1 to point 2
 * @param {number} lat1 - Latitude of point 1 (degrees)
 * @param {number} lon1 - Longitude of point 1 (degrees)
 * @param {number} lat2 - Latitude of point 2 (degrees)
 * @param {number} lon2 - Longitude of point 2 (degrees)
 * @returns {number} - Bearing in degrees (0-360)
 */
function bearingDeg(lat1, lon1, lat2, lon2) {
    const phi1 = lat1 * Math.PI / 180;
    const phi2 = lat2 * Math.PI / 180;
    const dl = (lon2 - lon1) * Math.PI / 180;

    const y = Math.sin(dl) * Math.cos(phi2);
    const x = Math.cos(phi1) * Math.sin(phi2) -
              Math.sin(phi1) * Math.cos(phi2) * Math.cos(dl);
    return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}

/**
 * Unwrap angle difference to handle 360/0 discontinuity
 * @param {number} prev - Previous angle (degrees)
 * @param {number} curr - Current angle (degrees)
 * @returns {number} - Unwrapped angle difference (-180 to 180)
 */
function unwrapAngleDeg(prev, curr) {
    return ((curr - prev + 540) % 360) - 180;
}

/**
 * Calculate moving average with improved edge handling
 * @param {Array<number>} seq - Input sequence
 * @param {number} window - Window size
 * @returns {Array<number>} - Smoothed sequence
 */
function movingAvg(seq, window) {
    const n = seq.length;
    if (window <= 1 || window > n) {
        return [...seq];
    }

    const out = new Array(n).fill(0);

    // Handle leading edge with expanding window
    for (let i = 0; i < Math.min(window, n); i++) {
        let sum = 0;
        for (let j = 0; j <= i; j++) {
            sum += seq[j];
        }
        out[i] = sum / (i + 1);
    }

    // Full window for middle section
    if (n >= window) {
        let sum = 0;
        for (let i = 0; i < window; i++) {
            sum += seq[i];
        }
        for (let i = window; i < n; i++) {
            sum += seq[i] - seq[i - window];
            out[i] = sum / window;
        }
    }

    return out;
}

/**
 * Convert bearing (0-360) to 8-point compass direction
 * @param {number} bearing - Bearing in degrees
 * @returns {string} - Compass direction (N, NE, E, etc.)
 */
function compassDirFromBearing(bearing) {
    const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
    const idx = Math.floor((bearing + 22.5) / 45) % 8;
    return dirs[idx];
}

/**
 * Calculate total heading change within a time window
 * @param {Array<TrackPoint>} points - Track points
 * @param {Array<number>} heading - Heading values
 * @param {number} index - Current index
 * @param {number} windowSeconds - Time window in seconds
 * @returns {number} - Total heading change in degrees
 */
function calculateHeadingChangeWindow(points, heading, index, windowSeconds) {
    if (index < 1) return 0.0;

    const currentTime = points[index].timeS;
    const windowStartTime = currentTime - windowSeconds;

    let totalChange = 0.0;
    let i = index;

    // Walk backwards through points within the time window
    while (i > 0 && points[i].timeS >= windowStartTime) {
        const headingDiff = unwrapAngleDeg(heading[i - 1], heading[i]);
        totalChange += Math.abs(headingDiff);
        i--;
    }

    return totalChange;
}

/**
 * Calculate average vario within a time window
 * @param {Array<TrackPoint>} points - Track points
 * @param {Array<number>} vario - Vario values
 * @param {number} index - Current index
 * @param {number} windowSeconds - Time window in seconds
 * @returns {number} - Average vario in m/s
 */
function calculateAvgVarioWindow(points, vario, index, windowSeconds) {
    if (index < 1) {
        return index === 0 ? vario[index] : 0.0;
    }

    const currentTime = points[index].timeS;
    const windowStartTime = currentTime - windowSeconds;

    let varioSum = 0.0;
    let count = 0;
    let i = index;

    // Walk backwards through points within the time window
    while (i >= 0 && points[i].timeS >= windowStartTime) {
        varioSum += vario[i];
        count++;
        i--;
    }

    return count > 0 ? varioSum / count : 0.0;
}

/**
 * Calculate standard deviation (population)
 * @param {Array<number>} values - Array of numbers
 * @returns {number} - Standard deviation
 */
function pstdev(values) {
    if (values.length === 0) return 0.0;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + (val - mean) ** 2, 0) / values.length;
    return Math.sqrt(variance);
}

/**
 * Compute derived metrics from track points
 * @param {Array<TrackPoint>} points - Track points
 * @returns {Object} - Object containing dt, vario, heading, turnRate, speed, gapCount
 */
function computeDerivedMetrics(points) {
    const n = points.length;
    const dt = new Array(n).fill(0);
    const vario = new Array(n).fill(0);
    const heading = new Array(n).fill(0);
    const turnRate = new Array(n).fill(0);
    const speed = new Array(n).fill(0);
    let gapCount = 0;

    for (let i = 1; i < n; i++) {
        const dti = Math.max(1e-6, points[i].timeS - points[i - 1].timeS);
        dt[i] = dti;

        // Detect GPS gaps
        if (dti > CONFIG.MAX_TIME_GAP) {
            gapCount++;
        }

        // Vario calculation
        const dh = points[i].altM - points[i - 1].altM;
        vario[i] = dh / dti;

        // Speed calculation
        const dist = haversineM(
            points[i - 1].lat, points[i - 1].lon,
            points[i].lat, points[i].lon
        );
        speed[i] = dist / dti;

        // Sanity check for speed
        if (speed[i] > CONFIG.MAX_SPEED_MPS) {
            // Likely GPS glitch; don't update heading
            speed[i] = i > 1 ? speed[i - 1] : 0.0;
            heading[i] = i > 1 ? heading[i - 1] : 0.0;
            turnRate[i] = 0.0;
            continue;
        }

        // Heading calculation (only if moved significantly)
        if (dist > 0.5) {
            const hCurr = bearingDeg(
                points[i - 1].lat, points[i - 1].lon,
                points[i].lat, points[i].lon
            );
            heading[i] = hCurr;

            // Turn rate calculation
            if (i > 1) {
                const hPrev = heading[i - 1];
                const dhead = unwrapAngleDeg(hPrev, hCurr);
                turnRate[i] = dhead / dti;
            } else {
                turnRate[i] = 0.0;
            }
        } else {
            // Not enough movement, keep previous heading
            heading[i] = i > 1 ? heading[i - 1] : 0.0;
            turnRate[i] = 0.0;
        }
    }

    return { dt, vario, heading, turnRate, speed, gapCount };
}

/**
 * Detect thermal segments using rolling window approach
 * @param {Array<TrackPoint>} points - Track points
 * @param {Array<number>} dt - Time deltas
 * @param {Array<number>} varioS - Smoothed vario
 * @param {Array<number>} turnS - Smoothed turn rate
 * @param {Array<number>} heading - Heading values
 * @returns {Array<ThermalSegment>} - Detected thermals
 */
function detectThermals(points, dt, varioS, turnS, heading) {
    const n = points.length;
    const segments = [];

    let inThermal = false;
    let startIdx = 0;

    /**
     * Finalize the current thermal candidate
     */
    function finalizeCurrentThermal(endLimit) {
        if (!inThermal) return;

        let actualEndIdx = Math.min(endLimit, n - 1);
        if (actualEndIdx <= startIdx) {
            inThermal = false;
            return;
        }

        // Check if actually turning and climbing
        const turningAndClimbing = (idx) =>
            Math.abs(turnS[idx]) > CONFIG.MIN_TURN_RATE && varioS[idx] > 0;

        if (!turningAndClimbing(actualEndIdx)) {
            // Trim back to last good point
            for (let j = actualEndIdx - 1; j > startIdx; j--) {
                if (turningAndClimbing(j)) {
                    actualEndIdx = j;
                    break;
                }
            }
        }

        const dur = points[actualEndIdx].timeS - points[startIdx].timeS;

        if (dur >= CONFIG.MIN_THERMAL_DURATION) {
            const segVario = varioS.slice(startIdx, actualEndIdx + 1);
            const segTurn = turnS.slice(startIdx, actualEndIdx + 1);

            if (segVario.length === 0) {
                inThermal = false;
                return;
            }

            const avgVario = segVario.reduce((a, b) => a + b, 0) / segVario.length;
            const avgTurnAbs = segTurn.reduce((a, b) => a + Math.abs(b), 0) / segTurn.length;

            if (avgVario >= CONFIG.MIN_CLIMB_RATE && avgTurnAbs >= CONFIG.MIN_TURN_RATE) {
                // Find peak
                let peakIdx = startIdx;
                let peakV = varioS[startIdx];
                for (let k = startIdx; k <= actualEndIdx; k++) {
                    if (varioS[k] > peakV) {
                        peakV = varioS[k];
                        peakIdx = k;
                    }
                }
                const peakT = points[peakIdx].timeS;

                // Calculate circles
                let totalTurn = 0;
                for (let k = startIdx; k <= actualEndIdx; k++) {
                    totalTurn += Math.abs(turnS[k]) * dt[k];
                }
                const circles = totalTurn / 360.0;

                // Calculate center and bearing to peak
                const segPoints = points.slice(startIdx, actualEndIdx + 1);
                const latC = segPoints.reduce((a, p) => a + p.lat, 0) / segPoints.length;
                const lonC = segPoints.reduce((a, p) => a + p.lon, 0) / segPoints.length;
                const brgPeak = bearingDeg(latC, lonC, points[peakIdx].lat, points[peakIdx].lon);
                const dirLabel = compassDirFromBearing(brgPeak);

                // Centering quality
                const centeringStd = pstdev(segVario);

                // Direction changes
                let dirChanges = 0;
                for (let k = startIdx + 1; k <= actualEndIdx; k++) {
                    if ((turnS[k] > 0) !== (turnS[k - 1] > 0)) {
                        dirChanges++;
                    }
                }

                // Early exit detection
                const endV = varioS[actualEndIdx];
                const timeSincePeak = points[actualEndIdx].timeS - peakT;
                const earlyExit = peakV >= CONFIG.STRONG_CLIMB_THRESHOLD && (
                    endV >= CONFIG.EXIT_CLIMB_THRESHOLD ||
                    timeSincePeak < CONFIG.TIME_SINCE_PEAK_THRESHOLD
                );
                const earlyExitT = earlyExit ? points[actualEndIdx].timeS : null;

                segments.push({
                    startIdx,
                    endIdx: actualEndIdx,
                    startT: points[startIdx].timeS,
                    endT: points[actualEndIdx].timeS,
                    durationS: dur,
                    avgClimb: avgVario,
                    maxClimb: peakV,
                    peakT,
                    circles,
                    dirChanges,
                    centeringStd,
                    centerTipBearing: brgPeak,
                    centerTipDir: dirLabel,
                    earlyExit,
                    earlyExitT
                });
            }
        }

        inThermal = false;
    }

    // Main detection loop
    for (let i = 1; i < n; i++) {
        // Rolling window calculations
        const headingChange = calculateHeadingChangeWindow(
            points, heading, i, CONFIG.THERMAL_WINDOW_SECONDS
        );
        const avgVario = calculateAvgVarioWindow(
            points, varioS, i, CONFIG.THERMAL_WINDOW_SECONDS
        );

        // Entry condition
        const turning = headingChange >= CONFIG.MIN_HEADING_CHANGE;
        const climbing = avgVario >= CONFIG.EXIT_VARIO_THRESHOLD;

        if (!inThermal && turning && climbing) {
            inThermal = true;
            startIdx = i;
        }

        // Exit conditions
        if (inThermal) {
            const notTurningWindow = headingChange < CONFIG.EXIT_HEADING_CHANGE;
            const sinkingBadly = avgVario < -1.5;
            const notTurningInstant = Math.abs(turnS[i]) < CONFIG.MIN_TURN_RATE;
            const sinkingInstant = varioS[i] < 0;
            const immediateExit = notTurningInstant && sinkingInstant;
            const leaving = notTurningWindow || sinkingBadly || immediateExit;

            if (leaving) {
                finalizeCurrentThermal(i);
            }
        }
    }

    // Flush final thermal if the flight ended mid-climb
    if (inThermal) {
        finalizeCurrentThermal(n - 1);
    }

    return segments;
}

/**
 * Perform complete flight analysis
 * @param {Array<TrackPoint>} points - Track points
 * @returns {FlightSummary} - Complete flight analysis
 */
function analyze(points) {
    const n = points.length;
    if (n < CONFIG.MIN_TRACK_POINTS) {
        throw new Error(`Track too short: ${n} points (minimum ${CONFIG.MIN_TRACK_POINTS})`);
    }

    // Compute derived metrics
    const { dt, vario, heading, turnRate, speed, gapCount } = computeDerivedMetrics(points);

    // Smooth signals
    const varioS = movingAvg(vario, CONFIG.VARIO_SMOOTH_WINDOW);
    const turnS = movingAvg(turnRate, CONFIG.TURN_SMOOTH_WINDOW);

    // Detect thermals
    const segments = detectThermals(points, dt, varioS, turnS, heading);

    // Summary statistics
    const durationTotal = points[n - 1].timeS - points[0].timeS;
    const maxAlt = Math.max(...points.map(p => p.altM));
    const timeToFirst = segments.length > 0 ? segments[0].startT : null;
    const best = segments.length > 0
        ? segments.reduce((a, b) =>
            (a.avgClimb + a.maxClimb) > (b.avgClimb + b.maxClimb) ? a : b
          )
        : null;

    return {
        durationTotal,
        maxAlt,
        segments,
        timeToFirstThermal: timeToFirst,
        best,
        gpsGaps: gapCount,
        // Also include raw data for visualization
        points,
        vario: varioS,
        turnRate: turnS,
        heading,
        speed
    };
}

/**
 * Generate coaching feedback based on analysis
 * Matches the sophisticated logic from Python backend implementation
 * @param {FlightSummary} summary - Flight analysis summary
 * @returns {Object} - Coaching feedback sections with arrays for extensibility
 */
function generateCoaching(summary) {
    const best = summary.best;
    const ttf = summary.timeToFirstThermal;

    const coaching = {
        whatWentWell: [],
        whatToImprove: [],
        safetyMindset: [],
        nextFlightPlan: []
    };

    // What went well - prioritized logic matching Python
    if (best && best.avgClimb > 0.6) {
        coaching.whatWentWell.push('You found usable lift and maintained a solid average climb.');
    } else if (ttf !== null && ttf < 300) {
        coaching.whatWentWell.push('You found lift quickly after launch — good scanning and line choice.');
    } else {
        coaching.whatWentWell.push('You kept the flight smooth; building airtime matters.');
    }

    // Additional positive observations
    if (best && best.centeringStd < 0.4) {
        coaching.whatWentWell.push('Good centering consistency.');
    }

    // What to improve - specific scenarios matching Python
    if (best && best.maxClimb >= 1.5 && best.durationS < 70) {
        coaching.whatToImprove.push(
            'You likely exited your strongest climb early. Commit to ~2 more circles when vario ≥ +1.5 m/s.'
        );
    } else if (best && best.centeringStd > 0.6 && best.circles >= 1.5) {
        coaching.whatToImprove.push(
            `Centering consistency can improve. Drift ~30 m toward ${best.centerTipDir} where lift peaked.`
        );
    } else if (ttf !== null && ttf > 600) {
        coaching.whatToImprove.push(
            'It took a while to find first lift. Probe windward edges of terrain triggers earlier.'
        );
    } else {
        coaching.whatToImprove.push(
            'During climbs, widen slightly when it feels rough; reassess after one calm circle instead of bailing.'
        );
    }

    // Safety/Mindset - core message with additional context
    coaching.safetyMindset.push(
        'Turbulence discomfort is normal. Breathe, loosen grip, and re-center before leaving lift.'
    );
    if (summary.gpsGaps > 0) {
        coaching.safetyMindset.push(`⚠ GPS signal gaps detected (${summary.gpsGaps}).`);
    }

    // Next-flight plan - actionable based on performance
    if (best && best.maxClimb >= 1.2) {
        coaching.nextFlightPlan.push('When climb ≥ +1.2 m/s, stay for two additional circles before leaving.');
    } else {
        coaching.nextFlightPlan.push('Pick one strong trigger; explore thoroughly before moving on.');
    }

    return coaching;
}

// Export functions
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        analyze,
        formatTime,
        generateCoaching,
        CONFIG
    };
}
