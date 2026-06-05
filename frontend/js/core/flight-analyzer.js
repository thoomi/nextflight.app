/**
 * Flight Analyzer
 * Browser-side paragliding flight track analysis
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
    SPEED_SMOOTH_WINDOW: 5,  // points for speed smoothing (reduces GPS noise)

    // Early Exit Detection
    STRONG_CLIMB_THRESHOLD: 1.2,  // m/s - peak climb considered "strong"
    EXIT_CLIMB_THRESHOLD: 0.8,  // m/s - exit climb considered "still good"
    TIME_SINCE_PEAK_THRESHOLD: 12.0,  // seconds - exit too soon after peak
    THERMAL_EXIT_SINK_BADLY: -1.5,  // m/s - severe sink indicating definite thermal exit

    // GPS Quality
    MAX_TIME_GAP: 10.0,  // seconds - max gap before considering it a signal loss
    MAX_SPEED_MPS: 30.0,  // m/s - sanity check for paraglider speed
    MIN_TRACK_POINTS: 10,  // minimum points for valid track
    MIN_MOVEMENT_FOR_HEADING: 0.5,  // meters - minimum movement to calculate heading

    // Analysis
    CENTERING_TIP_DISTANCE: "30-50 m",  // advice distance for centering

    // Glide Detection
    GLIDE_MIN_DURATION: 20.0,  // seconds - minimum duration to qualify as glide
    GLIDE_MAX_TURN_RATE: 2.0,  // deg/s - max turn rate for "straight" glide
    RIDGE_SOARING_MIN_VARIO: -0.3,  // m/s - min vario to consider ridge soaring
    SEARCHING_TURN_THRESHOLD: 5.0,  // deg/s - above this is searching behavior

    // Speedbar Coaching
    HEADWIND_SPEEDBAR_THRESHOLD: 15.0,  // km/h - recommend speedbar in headwind
    SINK_SPEEDBAR_THRESHOLD: 2.0,  // m/s - recommend speedbar in strong sink
    ALTITUDE_MARGIN_MIN: 200.0,  // m - minimum altitude margin for speedbar advice
    TYPICAL_TRIM_SPEED: 38.0,  // km/h - typical paraglider trim groundspeed (no wind)
    TYPICAL_TRIM_SINK: 1.1,  // m/s - typical paraglider sink rate at trim
    TYPICAL_GLIDE_RATIO: 8.0  // typical glide ratio at trim speed
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
 * @param {Array<TrackPoint>} points - Track points with {lat, lon, altM, timeS}
 * @returns {Object} - Object containing:
 *   - dt: time deltas (seconds)
 *   - vario: vertical speed (m/s, positive = climbing)
 *   - heading: bearing (degrees, 0-360)
 *   - turnRate: turn rate (deg/s, positive = right turn)
 *   - speed: horizontal ground speed (m/s, NOT 3D speed)
 *   - gapCount: number of GPS signal gaps detected
 */
function computeDerivedMetrics(points) {
    const n = points.length;
    const dt = new Array(n).fill(0);        // seconds
    const vario = new Array(n).fill(0);     // m/s
    const heading = new Array(n).fill(0);   // degrees (0-360)
    const turnRate = new Array(n).fill(0);  // deg/s
    const speed = new Array(n).fill(0);     // m/s (horizontal ground speed)
    let gapCount = 0;

    for (let i = 1; i < n; i++) {
        const dti = Math.max(1e-6, points[i].timeS - points[i - 1].timeS);
        dt[i] = dti;

        // Detect GPS gaps
        if (dti > CONFIG.MAX_TIME_GAP) {
            gapCount++;
        }

        // Vario (vertical speed) calculation
        const dh = points[i].altM - points[i - 1].altM;
        vario[i] = dh / dti;  // m/s

        // Horizontal ground speed calculation
        // Uses 2D distance (ignoring altitude change) - this is intentional for paragliding
        // where ground speed is more useful than 3D speed (vertical component is negligible)
        const dist = haversineM(
            points[i - 1].lat, points[i - 1].lon,
            points[i].lat, points[i].lon
        );
        speed[i] = dist / dti;  // m/s

        // Sanity check for speed (GPS glitch detection)
        if (speed[i] > CONFIG.MAX_SPEED_MPS) {
            // Likely GPS glitch; replace with previous values to avoid corrupting heading
            // i > 1 checks if we have a previously calculated value (heading[0] is never calculated)
            speed[i] = i > 1 ? speed[i - 1] : 0.0;
            heading[i] = i > 1 ? heading[i - 1] : 0.0;
            turnRate[i] = 0.0;
            continue;  // Skip heading calculation for this glitched point
        }

        // Heading calculation (only if moved significantly to avoid noise)
        if (dist > CONFIG.MIN_MOVEMENT_FOR_HEADING) {
            const hCurr = bearingDeg(
                points[i - 1].lat, points[i - 1].lon,
                points[i].lat, points[i].lon
            );
            heading[i] = hCurr;

            // Turn rate calculation (requires at least 2 calculated headings)
            if (i > 1) {
                // We have heading[i-1] from previous movement, can calculate turn rate
                const hPrev = heading[i - 1];
                const dhead = unwrapAngleDeg(hPrev, hCurr);
                turnRate[i] = dhead / dti;  // deg/s
            } else {
                // i=1: first movement, no previous heading to compare
                turnRate[i] = 0.0;
            }
        } else {
            // Movement too small (< 0.5m), likely GPS noise - keep previous heading
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

        // Check if actually turning and climbing (use same threshold as entry for consistency)
        const turningAndClimbing = (idx) =>
            Math.abs(turnS[idx]) > CONFIG.MIN_TURN_RATE && varioS[idx] >= CONFIG.MIN_THERMAL_CLIMB_CHECK;

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

        // Entry condition: must be turning AND actually climbing (even if slightly)
        const turning = headingChange >= CONFIG.MIN_HEADING_CHANGE;
        const climbing = avgVario >= CONFIG.MIN_THERMAL_CLIMB_CHECK;

        if (!inThermal && turning && climbing) {
            inThermal = true;
            startIdx = i;
        }

        // Exit conditions
        if (inThermal) {
            const notTurningWindow = headingChange < CONFIG.EXIT_HEADING_CHANGE;
            const sinkingBadly = avgVario < CONFIG.THERMAL_EXIT_SINK_BADLY;
            const notTurningInstant = Math.abs(turnS[i]) < CONFIG.MIN_TURN_RATE;
            const sinkingInstant = varioS[i] < CONFIG.EXIT_VARIO_THRESHOLD;
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
 * Detect and classify glide segments between thermals
 * @param {Array<TrackPoint>} points - Track points
 * @param {Array<ThermalSegment>} thermals - Detected thermal segments
 * @param {Array<number>} varioS - Smoothed vario (m/s)
 * @param {Array<number>} turnS - Smoothed turn rate (deg/s)
 * @param {Array<number>} heading - Heading values (degrees)
 * @param {Array<number>} speed - Speed values (m/s)
 * @returns {Array<GlideSegment>} - Detected glide segments
 */
function detectGlideSegments(points, thermals, varioS, turnS, heading, speed) {
    const n = points.length;
    const glides = [];

    // Build thermal occupancy map for quick lookup
    const inThermal = new Array(n).fill(false);
    for (const thermal of thermals) {
        for (let i = thermal.startIdx; i <= thermal.endIdx; i++) {
            inThermal[i] = true;
        }
    }

    // Find gaps between thermals
    let glideStart = null;

    for (let i = 0; i < n; i++) {
        if (!inThermal[i] && glideStart === null) {
            // Start of potential glide segment
            glideStart = i;
        } else if ((inThermal[i] || i === n - 1) && glideStart !== null) {
            // End of glide segment
            const glideEnd = i === n - 1 && !inThermal[i] ? i : i - 1;
            const duration = points[glideEnd].timeS - points[glideStart].timeS;

            // Only consider segments longer than minimum duration
            if (duration >= CONFIG.GLIDE_MIN_DURATION) {
                const segment = analyzeGlideSegment(
                    points, varioS, turnS, speed,
                    glideStart, glideEnd
                );
                glides.push(segment);
            }

            glideStart = null;
        }
    }

    return glides;
}

/**
 * Analyze a single glide segment in detail
 * @param {Array<TrackPoint>} points - Track points
 * @param {Array<number>} varioS - Smoothed vario
 * @param {Array<number>} turnS - Smoothed turn rate
 * @param {Array<number>} speed - Speed values (m/s)
 * @param {number} startIdx - Start index
 * @param {number} endIdx - End index
 * @returns {GlideSegment} - Analyzed glide segment
 */
function analyzeGlideSegment(points, varioS, turnS, speed, startIdx, endIdx) {
    const segVario = varioS.slice(startIdx, endIdx + 1);
    const segTurn = turnS.slice(startIdx, endIdx + 1);
    const segSpeed = speed.slice(startIdx, endIdx + 1);

    // Basic metrics
    const durationS = points[endIdx].timeS - points[startIdx].timeS;
    const startAlt = points[startIdx].altM;
    const endAlt = points[endIdx].altM;
    const altChange = endAlt - startAlt;

    // Calculate total distance covered
    let totalDistance = 0;
    for (let i = startIdx; i < endIdx; i++) {
        totalDistance += haversineM(
            points[i].lat, points[i].lon,
            points[i + 1].lat, points[i + 1].lon
        );
    }

    // Straight-line distance (as the crow flies)
    const straightDistance = haversineM(
        points[startIdx].lat, points[startIdx].lon,
        points[endIdx].lat, points[endIdx].lon
    );

    // Average metrics
    const avgVario = segVario.reduce((a, b) => a + b, 0) / segVario.length;
    const avgSpeed = segSpeed.reduce((a, b) => a + b, 0) / segSpeed.length;
    const avgTurnAbs = segTurn.reduce((a, b) => a + Math.abs(b), 0) / segTurn.length;

    // Glide ratio (only meaningful if losing altitude)
    const glideRatio = altChange < -10 ? straightDistance / Math.abs(altChange) : null;

    // Classify glide type
    let glideType;
    if (avgTurnAbs < CONFIG.GLIDE_MAX_TURN_RATE && avgVario < 0) {
        glideType = 'straight';  // Straight glide with sink
    } else if (avgTurnAbs < CONFIG.GLIDE_MAX_TURN_RATE && avgVario >= CONFIG.RIDGE_SOARING_MIN_VARIO) {
        glideType = 'soaring';  // Low turn rate, neutral/positive lift (ridge soaring)
    } else if (avgTurnAbs >= CONFIG.SEARCHING_TURN_THRESHOLD) {
        glideType = 'searching';  // High turn rate, exploring for lift
    } else {
        glideType = 'mixed';  // Doesn't fit clean categories
    }

    // Bearing of glide direction
    const glideBearing = bearingDeg(
        points[startIdx].lat, points[startIdx].lon,
        points[endIdx].lat, points[endIdx].lon
    );
    const glideDirection = compassDirFromBearing(glideBearing);

    // Efficiency (how direct was the route)
    const efficiency = totalDistance > 0 ? straightDistance / totalDistance : 1.0;

    return {
        startIdx,
        endIdx,
        startT: points[startIdx].timeS,
        endT: points[endIdx].timeS,
        durationS,
        startAlt,
        endAlt,
        altChange,
        distance: totalDistance,
        straightDistance,
        avgVario,
        avgSpeed: avgSpeed * 3.6,  // Convert m/s to km/h
        avgTurnRate: avgTurnAbs,
        glideRatio,
        glideType,
        bearing: glideBearing,
        direction: glideDirection,
        efficiency
    };
}

/**
 * Estimate wind from thermal drift patterns
 * @param {Array<TrackPoint>} points - Track points
 * @param {Array<ThermalSegment>} thermals - Detected thermals
 * @returns {Object|null} - Wind estimate {speed: km/h, direction: degrees, confidence: 0-1}
 */
function estimateWind(points, thermals) {
    if (thermals.length === 0) {
        return null;  // Need at least one thermal to estimate wind
    }

    const windEstimates = [];

    // Analyze each thermal for drift
    for (const thermal of thermals) {
        // Need at least 2 full circles for reliable drift measurement
        if (thermal.circles < 1.5) continue;

        const thermalPoints = points.slice(thermal.startIdx, thermal.endIdx + 1);

        // Split thermal into thirds for better measurement
        const thirdIdx = Math.floor(thermalPoints.length / 3);
        const firstThird = thermalPoints.slice(0, thirdIdx);
        const lastThird = thermalPoints.slice(-thirdIdx);

        // Calculate center of mass for first and last third
        const center1Lat = firstThird.reduce((a, p) => a + p.lat, 0) / firstThird.length;
        const center1Lon = firstThird.reduce((a, p) => a + p.lon, 0) / firstThird.length;
        const center2Lat = lastThird.reduce((a, p) => a + p.lat, 0) / lastThird.length;
        const center2Lon = lastThird.reduce((a, p) => a + p.lon, 0) / lastThird.length;

        // Calculate actual time difference between center-of-mass times
        const avgTime1 = firstThird.reduce((a, p) => a + p.timeS, 0) / firstThird.length;
        const avgTime2 = lastThird.reduce((a, p) => a + p.timeS, 0) / lastThird.length;
        const driftDuration = avgTime2 - avgTime1;

        if (driftDuration <= 0) continue;  // Sanity check

        // Calculate drift distance and direction
        const driftDistance = haversineM(center1Lat, center1Lon, center2Lat, center2Lon);
        const driftBearing = bearingDeg(center1Lat, center1Lon, center2Lat, center2Lon);

        // If thermal drifts East (90°), wind is from West (270°)
        const windDirection = (driftBearing + 180) % 360;

        // Wind speed = drift rate
        const windSpeedMps = driftDistance / driftDuration;
        const windSpeedKmh = windSpeedMps * 3.6;

        // Only consider reasonable wind speeds (0-60 km/h)
        if (windSpeedKmh >= 0 && windSpeedKmh <= 60) {
            windEstimates.push({
                speed: windSpeedKmh,
                direction: windDirection,
                thermal: thermal,
                confidence: Math.min(thermal.circles / 3.0, 1.0)  // More circles = higher confidence
            });
        }
    }

    if (windEstimates.length === 0) {
        return null;
    }

    // Average wind estimates, weighted by confidence
    let totalWeight = 0;
    let weightedSpeedSum = 0;
    let windVectorX = 0;
    let windVectorY = 0;

    for (const est of windEstimates) {
        const weight = est.confidence;
        totalWeight += weight;
        weightedSpeedSum += est.speed * weight;

        // Convert to vector components for averaging direction
        const rad = est.direction * Math.PI / 180;
        windVectorX += Math.sin(rad) * est.speed * weight;
        windVectorY += Math.cos(rad) * est.speed * weight;
    }

    const avgSpeed = weightedSpeedSum / totalWeight;
    const avgDirection = (Math.atan2(windVectorX, windVectorY) * 180 / Math.PI + 360) % 360;
    const avgConfidence = totalWeight / windEstimates.length;

    return {
        speed: avgSpeed,
        direction: avgDirection,
        directionCompass: compassDirFromBearing(avgDirection),
        confidence: avgConfidence,
        samples: windEstimates.length
    };
}

/**
 * Detect speedbar opportunities in glide segments
 * @param {Array<GlideSegment>} glides - Glide segments
 * @param {Object|null} wind - Wind estimate
 * @returns {Array<SpeedbarOpportunity>} - Speedbar opportunities
 */
function detectSpeedbarOpportunities(glides, wind) {
    const opportunities = [];

    for (const glide of glides) {
        const reasons = [];
        let shouldUseSpeedbar = false;

        // Only analyze straight glides (not searching or soaring)
        if (glide.glideType !== 'straight' && glide.glideType !== 'mixed') {
            continue;
        }

        // Minimum altitude margin for safety
        const hasAltitudeMargin = glide.startAlt > CONFIG.ALTITUDE_MARGIN_MIN;

        // Check 1: Headwind situation
        if (wind && wind.confidence > 0.3 && hasAltitudeMargin) {
            const glideBearing = glide.bearing;
            const windBearing = wind.direction;

            // Calculate headwind component
            const bearingDiff = Math.abs(unwrapAngleDeg(glideBearing, windBearing));
            const headwindFactor = Math.cos(bearingDiff * Math.PI / 180);
            const headwindComponent = wind.speed * headwindFactor;

            if (headwindComponent > CONFIG.HEADWIND_SPEEDBAR_THRESHOLD) {
                shouldUseSpeedbar = true;
                reasons.push(`headwind ~${Math.round(headwindComponent)} km/h`);
            }
        }

        // Check 2: Strong sink situation
        if (glide.avgVario < -CONFIG.SINK_SPEEDBAR_THRESHOLD && hasAltitudeMargin) {
            shouldUseSpeedbar = true;
            reasons.push(`strong sink ${glide.avgVario.toFixed(1)} m/s`);
        }

        // Check 3: Poor glide ratio (might benefit from speedbar)
        if (glide.glideRatio && glide.glideRatio < CONFIG.TYPICAL_GLIDE_RATIO - 1 && hasAltitudeMargin) {
            shouldUseSpeedbar = true;
            reasons.push(`poor glide ratio ${glide.glideRatio.toFixed(1)}:1`);
        }

        // Check 4: Low altitude without margin (DON'T use speedbar)
        if (!hasAltitudeMargin) {
            reasons.push(`low altitude - maintain best glide`);
            shouldUseSpeedbar = false;
        }

        // Create opportunity if speedbar recommended
        if (shouldUseSpeedbar && hasAltitudeMargin) {
            opportunities.push({
                glide,
                reasons,
                startT: glide.startT,
                endT: glide.endT,
                altitudeMargin: glide.startAlt,
                estimatedBenefit: calculateSpeedbarBenefit(glide, wind)
            });
        }
    }

    return opportunities;
}

/**
 * Tag glide segments with speedbar opportunity information for visualization
 * @param {Array<GlideSegment>} glides - Glide segments
 * @param {Array<SpeedbarOpportunity>} opportunities - Speedbar opportunities
 */
function tagGlidesWithSpeedbarInfo(glides, opportunities) {
    // Create lookup map by glide start time (unique identifier)
    const opportunityMap = new Map();
    for (const opp of opportunities) {
        opportunityMap.set(opp.glide.startT, opp);
    }

    // Tag each glide with speedbar opportunity info
    for (const glide of glides) {
        const opp = opportunityMap.get(glide.startT);
        if (opp) {
            glide.speedbarOpportunity = true;
            glide.speedbarReasons = opp.reasons;
            glide.speedbarBenefit = opp.estimatedBenefit;
            glide.speedbarWorthwhile = opp.estimatedBenefit.worthIt;
        } else {
            glide.speedbarOpportunity = false;
            glide.speedbarReasons = [];
            glide.speedbarBenefit = null;
            glide.speedbarWorthwhile = false;
        }
    }
}

/**
 * Calculate estimated benefit of using speedbar
 * @param {GlideSegment} glide - Glide segment
 * @param {Object|null} wind - Wind estimate
 * @returns {Object} - Estimated time/altitude savings
 */
function calculateSpeedbarBenefit(glide, wind) {
    // Assumptions:
    // - Trim: 38 km/h airspeed, 1.1 m/s sink, glide ratio ~8:1
    // - Speedbar: 50 km/h airspeed (+30%), 1.8 m/s sink (+60%), glide ratio ~6.5:1

    const trimAirspeed = CONFIG.TYPICAL_TRIM_SPEED / 3.6;  // Convert to m/s
    const trimSink = CONFIG.TYPICAL_TRIM_SINK;
    const barAirspeed = trimAirspeed * 1.3;  // +30% airspeed
    const barSink = trimSink * 1.6;          // +60% sink

    const distance = glide.straightDistance;  // meters

    // Calculate wind component along glide direction
    let windComponent = 0;  // m/s, positive = headwind, negative = tailwind
    if (wind && wind.confidence > 0.3) {
        const glideBearing = glide.bearing;
        const windBearing = wind.direction;  // Direction wind is FROM

        // Calculate angle between glide direction and wind direction
        const bearingDiff = unwrapAngleDeg(glideBearing, windBearing);

        // Wind component: positive for headwind, negative for tailwind
        // cos(0°) = 1 (direct headwind), cos(180°) = -1 (direct tailwind)
        windComponent = (wind.speed / 3.6) * Math.cos(bearingDiff * Math.PI / 180);
    }

    // Calculate groundspeed = airspeed - headwind_component
    // (headwind is positive, so we subtract; tailwind is negative, so subtracting adds it)
    const trimGroundspeed = trimAirspeed - windComponent;
    const barGroundspeed = barAirspeed - windComponent;

    // Sanity check: if groundspeed is too low or negative (extreme headwind), use airspeed
    const trimGS = trimGroundspeed > 1.0 ? trimGroundspeed : trimAirspeed;
    const barGS = barGroundspeed > 1.0 ? barGroundspeed : barAirspeed;

    // Time to cover distance
    const timeAtTrim = distance / trimGS;    // seconds
    const timeAtBar = distance / barGS;      // seconds
    const timeSaved = timeAtTrim - timeAtBar;

    // Altitude cost
    const altCostTrim = trimSink * timeAtTrim;
    const altCostBar = barSink * timeAtBar;
    const altDifference = altCostBar - altCostTrim;  // Positive = costs more altitude

    // Enhanced worthiness calculation
    // - In headwinds, speedbar is more valuable (more time savings)
    // - Be more lenient with altitude cost in strong headwinds
    const headwindFactor = windComponent > 0 ? Math.min(windComponent / 3.0, 1.5) : 1.0;
    const minTimeSaving = 30 / headwindFactor;  // Lower threshold in headwinds
    const maxAltCost = 100 * headwindFactor;     // Higher tolerance in headwinds

    return {
        timeSavedSeconds: timeSaved,
        altitudeCostMeters: altDifference,
        windComponent: windComponent * 3.6,  // Convert back to km/h for display
        worthIt: timeSaved > minTimeSaving && altDifference < maxAltCost
    };
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
    const speedS = movingAvg(speed, CONFIG.SPEED_SMOOTH_WINDOW);

    // Detect thermals
    const segments = detectThermals(points, dt, varioS, turnS, heading);

    // Detect glide segments
    const glides = detectGlideSegments(points, segments, varioS, turnS, heading, speedS);

    // Estimate wind from thermal drift
    const wind = estimateWind(points, segments);

    // Detect speedbar opportunities and tag glides
    const speedbarOpportunities = detectSpeedbarOpportunities(glides, wind);

    // Tag glide segments with speedbar opportunity info for visualization
    tagGlidesWithSpeedbarInfo(glides, speedbarOpportunities);

    // Summary statistics
    const durationTotal = points[n - 1].timeS - points[0].timeS;
    const maxAlt = Math.max(...points.map(p => p.altM));
    const minAlt = Math.min(...points.map(p => p.altM));
    const avgAlt = points.reduce((sum, p) => sum + p.altM, 0) / n;
    const altitudeRange = maxAlt - minAlt;

    const timeToFirst = segments.length > 0 ? segments[0].startT : null;
    const best = segments.length > 0
        ? segments.reduce((a, b) =>
            (a.avgClimb + a.maxClimb) > (b.avgClimb + b.maxClimb) ? a : b
          )
        : null;

    // Thermal statistics
    const totalThermalTime = segments.reduce((sum, t) => sum + t.durationS, 0);
    const avgThermalDuration = segments.length > 0 ? totalThermalTime / segments.length : 0;
    const totalAltitudeGained = segments.reduce((sum, t) => {
        const startAlt = points[t.startIdx].altM;
        const endAlt = points[t.endIdx].altM;
        return sum + Math.max(0, endAlt - startAlt);
    }, 0);

    // Thermal turning analysis
    let leftTurns = 0;
    let rightTurns = 0;
    let totalTurnRate = 0;
    let turnRateSamples = 0;

    for (const thermal of segments) {
        for (let i = thermal.startIdx; i <= thermal.endIdx; i++) {
            if (Math.abs(turnS[i]) > CONFIG.MIN_TURN_RATE) {
                if (turnS[i] > 0) rightTurns++;
                else leftTurns++;
                totalTurnRate += Math.abs(turnS[i]);
                turnRateSamples++;
            }
        }
    }

    const totalTurns = leftTurns + rightTurns;
    const thermalDirectionPreference = totalTurns > 0 ? {
        right: (rightTurns / totalTurns) * 100,
        left: (leftTurns / totalTurns) * 100,
        predominant: rightTurns > leftTurns ? 'right' : 'left'
    } : null;
    const avgThermalTurnRate = turnRateSamples > 0 ? totalTurnRate / turnRateSamples : 0;

    // Glide statistics
    const totalGlideDistance = glides.reduce((sum, g) => sum + g.straightDistance, 0);
    const avgGlideRatio = glides.filter(g => g.glideRatio).length > 0
        ? glides.filter(g => g.glideRatio).reduce((sum, g) => sum + g.glideRatio, 0) / glides.filter(g => g.glideRatio).length
        : null;
    const bestGlideRatio = glides.filter(g => g.glideRatio).length > 0
        ? Math.max(...glides.filter(g => g.glideRatio).map(g => g.glideRatio))
        : null;
    const worstGlideRatio = glides.filter(g => g.glideRatio).length > 0
        ? Math.min(...glides.filter(g => g.glideRatio).map(g => g.glideRatio))
        : null;

    // Total track distance (entire flight path)
    let totalTrackDistance = 0;
    for (let i = 1; i < n; i++) {
        totalTrackDistance += haversineM(
            points[i - 1].lat, points[i - 1].lon,
            points[i].lat, points[i].lon
        );
    }

    // Straight-line distance (start to end)
    const straightLineDistance = haversineM(
        points[0].lat, points[0].lon,
        points[n - 1].lat, points[n - 1].lon
    );
    const trackEfficiency = totalTrackDistance > 0 ? (straightLineDistance / totalTrackDistance) * 100 : 0;

    // Speed statistics
    const avgGroundSpeed = speedS.reduce((sum, s) => sum + s, 0) / n; // m/s
    const maxGroundSpeed = Math.max(...speedS); // m/s

    // Flight phases (climbing, gliding, searching)
    const totalGlideTime = glides.reduce((sum, g) => sum + g.durationS, 0);
    const searchingGlides = glides.filter(g => g.glideType === 'searching');
    const timeSearching = searchingGlides.reduce((sum, g) => sum + g.durationS, 0);
    const timeGliding = totalGlideTime - timeSearching;

    const altLostGliding = glides.filter(g => g.glideType !== 'searching')
        .reduce((sum, g) => sum + Math.abs(Math.min(0, g.altChange)), 0);
    const altLostSearching = searchingGlides
        .reduce((sum, g) => sum + Math.abs(Math.min(0, g.altChange)), 0);

    // Personal bests
    const longestThermal = segments.length > 0
        ? segments.reduce((a, b) => a.durationS > b.durationS ? a : b)
        : null;
    const longestGlide = glides.length > 0
        ? glides.reduce((a, b) => a.straightDistance > b.straightDistance ? a : b)
        : null;

    // Speedbar analysis details
    const worthwhileSpeedbarOps = speedbarOpportunities.filter(op => op.estimatedBenefit.worthIt);
    const totalTimeSavings = worthwhileSpeedbarOps.reduce((sum, op) => sum + op.estimatedBenefit.timeSavedSeconds, 0);
    const totalAltCost = worthwhileSpeedbarOps.reduce((sum, op) => sum + op.estimatedBenefit.altitudeCostMeters, 0);

    // Low altitude warnings (below 400m AGL - assuming launch alt is first point)
    const launchAlt = points[0].altM;
    let lowAltitudeWarnings = 0;
    const LOW_ALT_THRESHOLD = 400; // meters AGL
    for (const point of points) {
        if (point.altM - launchAlt < LOW_ALT_THRESHOLD && point.altM > launchAlt) {
            lowAltitudeWarnings++;
            break; // Count as one warning event per flight for simplicity
        }
    }

    return {
        // Basic flight stats
        durationTotal,
        maxAlt,
        minAlt,
        avgAlt,
        altitudeRange,
        segments,
        timeToFirstThermal: timeToFirst,
        best,
        gpsGaps: gapCount,
        lowAltitudeWarnings,

        // Thermal performance
        totalThermalTime,
        avgThermalDuration,
        totalAltitudeGained,
        thermalDirectionPreference,
        avgThermalTurnRate,

        // Glide analysis
        glides,
        glideCount: glides.length,
        totalGlideDistance,
        avgGlideRatio,
        bestGlideRatio,
        worstGlideRatio,

        // Track & speed
        totalTrackDistance,
        straightLineDistance,
        trackEfficiency,
        avgGroundSpeed,  // m/s
        maxGroundSpeed,  // m/s

        // Flight phases
        timeClimbing: totalThermalTime,
        timeGliding,
        timeSearching,
        altGainedClimbing: totalAltitudeGained,
        altLostGliding,
        altLostSearching,

        // Personal bests
        longestThermal,
        longestGlide,

        // Wind analysis
        wind,

        // Speedbar coaching
        speedbarOpportunities,
        speedbarOpportunityCount: speedbarOpportunities.length,
        worthwhileSpeedbarCount: worthwhileSpeedbarOps.length,
        totalTimeSavings,
        totalAltCost,

        // Raw data for visualization
        points,
        vario: varioS,
        turnRate: turnS,
        heading,
        speed
    };
}

/**
 * Generate coaching feedback based on analysis
 * Generates coaching sections from the browser-side flight summary
 * @param {FlightSummary} summary - Flight analysis summary
 * @returns {Object} - Coaching feedback sections with arrays for extensibility
 */
function generateCoaching(summary) {
    const best = summary.best;
    const ttf = summary.timeToFirstThermal;
    const glides = summary.glides || [];
    const wind = summary.wind;
    const speedbarOps = summary.speedbarOpportunities || [];

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

    // Glide performance feedback
    if (summary.avgGlideRatio && summary.avgGlideRatio >= CONFIG.TYPICAL_GLIDE_RATIO) {
        coaching.whatWentWell.push(`Good glide performance (avg ${summary.avgGlideRatio.toFixed(1)}:1).`);
    }

    // Ridge soaring detection
    const soaringGlides = glides.filter(g => g.glideType === 'soaring');
    if (soaringGlides.length > 0) {
        const totalSoaringTime = soaringGlides.reduce((sum, g) => sum + g.durationS, 0);
        if (totalSoaringTime > 60) {
            coaching.whatWentWell.push(`Good ridge soaring skills (${Math.round(totalSoaringTime / 60)} min in lift).`);
        }
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

    // Speedbar coaching
    if (speedbarOps.length > 0) {
        const worthwhileOps = speedbarOps.filter(op => op.estimatedBenefit.worthIt);
        if (worthwhileOps.length > 0) {
            const totalTimeSaved = worthwhileOps.reduce((sum, op) => sum + op.estimatedBenefit.timeSavedSeconds, 0);
            const firstOp = worthwhileOps[0];
            const reasonsStr = firstOp.reasons.join(', ');
            coaching.whatToImprove.push(
                `${worthwhileOps.length} glide(s) where speedbar would help (${reasonsStr}). ` +
                `Potential time savings: ~${Math.round(totalTimeSaved / 60)} min.`
            );
        }
    }

    // Glide efficiency coaching
    const inefficientGlides = glides.filter(g => g.efficiency < 0.85 && g.glideType === 'straight');
    if (inefficientGlides.length > 0) {
        coaching.whatToImprove.push(
            `${inefficientGlides.length} glide(s) were indirect (efficiency <85%). Fly straighter lines to save altitude.`
        );
    }

    // Poor glide ratio feedback
    if (summary.avgGlideRatio && summary.avgGlideRatio < CONFIG.TYPICAL_GLIDE_RATIO - 2) {
        coaching.whatToImprove.push(
            `Average glide ratio ${summary.avgGlideRatio.toFixed(1)}:1 is below typical. Check wing trim and avoid flying too slow.`
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

    // Wind awareness for next flight
    if (wind && wind.confidence > 0.4) {
        coaching.nextFlightPlan.push(
            `Estimated wind: ${Math.round(wind.speed)} km/h from ${wind.directionCompass} ` +
            `(confidence: ${Math.round(wind.confidence * 100)}%). Consider headwind when planning glides.`
        );
    }

    // Speedbar practice recommendation
    if (speedbarOps.length > 2) {
        coaching.nextFlightPlan.push(
            'Practice using speedbar in headwinds and sink - it could significantly improve your glide efficiency.'
        );
    }

    return coaching;
}

export {
    analyze,
    generateCoaching,
    CONFIG
};
