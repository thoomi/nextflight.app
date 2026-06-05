/**
 * IGC File Parser
 * Parses IGC format flight track files
 */

// Constants
const MAX_TIME_GAP = 10.0; // seconds - max gap before considering it a signal loss
const MAX_SPEED_MPS = 30.0; // m/s - sanity check for paraglider speed
const MIN_TRACK_POINTS = 10; // minimum points for valid track

/**
 * Parse IGC latitude/longitude format to decimal degrees
 * @param {string} latStr - Latitude string (DDMMmmm)
 * @param {string} latHem - Hemisphere (N/S)
 * @param {string} lonStr - Longitude string (DDDMMmmm)
 * @param {string} lonHem - Hemisphere (E/W)
 * @returns {{lat: number, lon: number}}
 */
function parseLatLonIGC(latStr, latHem, lonStr, lonHem) {
    // IGC lat: DDMMmmm (deg, minutes*1000), lon: DDDMMmmm
    const dd = parseInt(latStr.substring(0, 2), 10);
    const mmmmm = parseInt(latStr.substring(2, 7), 10);
    let lat = dd + (mmmmm / 1000.0) / 60.0;
    if (latHem.toUpperCase() === 'S') {
        lat = -lat;
    }

    const ddd = parseInt(lonStr.substring(0, 3), 10);
    const mmmmmm = parseInt(lonStr.substring(3, 8), 10);
    let lon = ddd + (mmmmmm / 1000.0) / 60.0;
    if (lonHem.toUpperCase() === 'W') {
        lon = -lon;
    }

    return { lat, lon };
}

/**
 * Parse altitude with validation
 * @param {string} altStr - Altitude string from IGC file
 * @returns {number|null} - Altitude in meters, or null if invalid
 */
function parseAltitude(altStr) {
    try {
        const val = parseInt(altStr, 10);
        // Basic sanity check for altitude (-500m to 10000m)
        return (val >= -500 && val <= 10000) ? val : null;
    } catch (e) {
        return null;
    }
}

/**
 * Parse IGC file content and return list of track points
 * @param {string} content - IGC file content as string
 * @returns {Array<TrackPoint>} - Array of parsed track points
 */
function parseIGC(content) {
    const points = [];
    const lines = content.split(/\r?\n/);

    for (const line of lines) {
        // Only process B-records (fix records)
        if (!line || line[0] !== 'B' || line.length < 35) {
            continue;
        }

        try {
            // Parse time: HHMMSS
            const HH = parseInt(line.substring(1, 3), 10);
            const MM = parseInt(line.substring(3, 5), 10);
            const SS = parseInt(line.substring(5, 7), 10);

            // Parse position
            const latStr = line.substring(7, 14);
            const latHem = line[14];
            const lonStr = line.substring(15, 23);
            const lonHem = line[23];

            // Parse altitudes
            const pAltStr = line.substring(25, 30); // Pressure altitude
            const gAltStr = line.substring(30, 35); // GPS altitude

            const { lat, lon } = parseLatLonIGC(latStr, latHem, lonStr, lonHem);
            const timeS = HH * 3600 + MM * 60 + SS;

            // Prefer pressure altitude (more accurate), fallback to GPS altitude
            const pAlt = parseAltitude(pAltStr);
            const gAlt = parseAltitude(gAltStr);

            let alt, altValid;
            if (pAlt !== null) {
                alt = pAlt;
                altValid = true;
            } else if (gAlt !== null) {
                alt = gAlt;
                altValid = true;
            } else {
                // Skip points with no valid altitude data
                continue;
            }

            points.push({
                timeS,
                lat,
                lon,
                altM: alt,
                altValid
            });

        } catch (e) {
            // Skip malformed lines
            continue;
        }
    }

    if (points.length === 0) {
        throw new Error('No valid IGC B-records found in file');
    }

    // Unwrap midnight crossings
    const unwrappedTimes = [points[0].timeS];
    let wraps = 0;
    for (let i = 1; i < points.length; i++) {
        if (points[i].timeS < points[i - 1].timeS - MAX_TIME_GAP) {
            wraps++;
        }
        unwrappedTimes.push(points[i].timeS + wraps * 24 * 3600);
    }

    // Normalize to t0 = 0
    const t0 = unwrappedTimes[0];
    for (let i = 0; i < points.length; i++) {
        points[i].timeS = unwrappedTimes[i] - t0;
    }

    // Store the start time (seconds since midnight) for display purposes
    points.startTimeS = t0;

    return points;
}

/**
 * Parse GPX file content (basic support for track points)
 * @param {string} content - GPX file content as string
 * @returns {Array<TrackPoint>} - Array of parsed track points
 */
function parseGPX(content) {
    const points = [];
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(content, "text/xml");

    // Check for parsing errors
    const parserError = xmlDoc.querySelector('parsererror');
    if (parserError) {
        throw new Error('Invalid GPX file format');
    }

    // Get all track points (trkpt elements)
    const trkpts = xmlDoc.querySelectorAll('trkpt');

    if (trkpts.length === 0) {
        throw new Error('No track points found in GPX file');
    }

    for (const trkpt of trkpts) {
        try {
            const lat = parseFloat(trkpt.getAttribute('lat'));
            const lon = parseFloat(trkpt.getAttribute('lon'));

            // Get elevation
            const eleElement = trkpt.querySelector('ele');
            const alt = eleElement ? parseFloat(eleElement.textContent) : 0;

            // Get time
            const timeElement = trkpt.querySelector('time');
            if (!timeElement) continue;

            const timeStr = timeElement.textContent;
            const date = new Date(timeStr);
            const timeS = date.getTime() / 1000; // Convert to seconds

            points.push({
                timeS,
                lat,
                lon,
                altM: alt,
                altValid: !!eleElement
            });

        } catch (e) {
            // Skip malformed points
            continue;
        }
    }

    if (points.length === 0) {
        throw new Error('No valid track points found in GPX file');
    }

    // Sort by time (in case points are out of order)
    points.sort((a, b) => a.timeS - b.timeS);

    // Normalize to t0 = 0
    const t0 = points[0].timeS;
    for (let i = 0; i < points.length; i++) {
        points[i].timeS = points[i].timeS - t0;
    }

    return points;
}

/**
 * Detect file type and parse accordingly
 * @param {string} content - File content as string
 * @param {string} filename - Original filename
 * @returns {Array<TrackPoint>} - Array of parsed track points
 */
function parseTrackFile(content, filename) {
    const lowerName = filename.toLowerCase();

    if (lowerName.endsWith('.igc')) {
        return parseIGC(content);
    } else if (lowerName.endsWith('.gpx')) {
        return parseGPX(content);
    } else {
        // Try to auto-detect
        if (content.includes('<gpx')) {
            return parseGPX(content);
        } else if (content.includes('AFLA') || content.includes('HFDTE') || content.startsWith('A')) {
            return parseIGC(content);
        } else {
            throw new Error('Unsupported file format. Please upload an IGC or GPX file.');
        }
    }
}

export {
    parseIGC,
    parseGPX,
    parseTrackFile
};
