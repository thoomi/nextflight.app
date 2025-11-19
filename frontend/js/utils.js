/**
 * Shared Utility Functions
 * Common helper functions used across the application
 */

/**
 * Format time in seconds as human-readable string (e.g., "5m 30s")
 * @param {number|null|undefined} seconds - Time in seconds
 * @returns {string} - Formatted time string
 */
function formatTime(seconds) {
    if (seconds === null || seconds === undefined) return '-';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}m ${s}s`;
}

/**
 * Format time for replay display (MM:SS format)
 * @param {number} seconds - Time in seconds
 * @returns {string} - Formatted time string
 */
function formatReplayTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
}

/**
 * Format altitude with unit
 * @param {number|null|undefined} altM - Altitude in meters
 * @returns {string} - Formatted altitude string
 */
function formatAltitude(altM) {
    if (altM === null || altM === undefined) return '-';
    return `${Math.round(altM)} m`;
}

/**
 * Format vario (vertical speed) with sign
 * @param {number} vario - Vertical speed in m/s
 * @param {number} [decimals=1] - Number of decimal places
 * @returns {string} - Formatted vario string
 */
function formatVario(vario, decimals = 1) {
    const sign = vario >= 0 ? '+' : '';
    return `${sign}${vario.toFixed(decimals)} m/s`;
}

/**
 * Format distance in meters to km or m
 * @param {number|null|undefined} meters - Distance in meters
 * @returns {string} - Formatted distance string
 */
function formatDistance(meters) {
    if (meters === null || meters === undefined) return '-';
    if (meters >= 1000) {
        return `${(meters / 1000).toFixed(1)} km`;
    }
    return `${Math.round(meters)} m`;
}

/**
 * Format glide ratio
 * @param {number|null|undefined} ratio - Glide ratio
 * @returns {string} - Formatted glide ratio string
 */
function formatGlideRatio(ratio) {
    if (ratio === null || ratio === undefined) return '-';
    return `${ratio.toFixed(1)}:1`;
}

/**
 * Format wind speed and direction
 * @param {number} speed - Wind speed in km/h
 * @param {string} direction - Compass direction (e.g., "NW")
 * @param {number} [confidence] - Confidence level (0-1)
 * @returns {string} - Formatted wind string
 */
function formatWind(speed, direction, confidence) {
    if (!speed || !direction) return '-';
    const conf = confidence !== undefined ? ` (${Math.round(confidence * 100)}%)` : '';
    return `${Math.round(speed)} km/h ${direction}${conf}`;
}

/**
 * Clamp a number between min and max values
 * @param {number} value - Value to clamp
 * @param {number} min - Minimum allowed value
 * @param {number} max - Maximum allowed value
 * @returns {number} - Clamped value
 */
function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

/**
 * Truncate text to specified length with ellipsis
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} - Truncated text
 */
function truncateText(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

/**
 * Debounce function execution
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} - Debounced function
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Create a simple DOM element cache for frequently accessed elements
 * @returns {Object} - Cache object with get method
 */
function createDOMCache() {
    const cache = new Map();

    return {
        /**
         * Get element by ID, using cache if available
         * @param {string} id - Element ID
         * @returns {HTMLElement|null} - DOM element
         */
        get(id) {
            if (!cache.has(id)) {
                cache.set(id, document.getElementById(id));
            }
            return cache.get(id);
        },

        /**
         * Clear a specific element from cache
         * @param {string} id - Element ID to clear
         */
        clear(id) {
            cache.delete(id);
        },

        /**
         * Clear entire cache
         */
        clearAll() {
            cache.clear();
        }
    };
}

/**
 * Set multiple CSS classes on an element
 * @param {HTMLElement} element - Target element
 * @param {Object} classMap - Object mapping class names to boolean (add/remove)
 */
function setClasses(element, classMap) {
    Object.entries(classMap).forEach(([className, shouldAdd]) => {
        if (shouldAdd) {
            element.classList.add(className);
        } else {
            element.classList.remove(className);
        }
    });
}

/**
 * Show or hide an element using the 'hidden' class
 * @param {HTMLElement|string} element - Element or element ID
 * @param {boolean} visible - Whether to show the element
 */
function setVisible(element, visible) {
    const el = typeof element === 'string' ? document.getElementById(element) : element;
    if (!el) return;

    if (visible) {
        el.classList.remove('hidden');
    } else {
        el.classList.add('hidden');
    }
}

/**
 * Linear interpolation between two values
 * @param {number} a - Start value
 * @param {number} b - End value
 * @param {number} t - Interpolation factor (0-1)
 * @returns {number} - Interpolated value
 */
function lerp(a, b, t) {
    return a + t * (b - a);
}

/**
 * Calculate distance squared between two lat/lon points (fast comparison)
 * @param {number} lat1 - Latitude of point 1
 * @param {number} lon1 - Longitude of point 1
 * @param {number} lat2 - Latitude of point 2
 * @param {number} lon2 - Longitude of point 2
 * @returns {number} - Distance squared in degrees
 */
function distanceSquaredDeg(lat1, lon1, lat2, lon2) {
    const dx = lon2 - lon1;
    const dy = lat2 - lat1;
    return dx * dx + dy * dy;
}

/**
 * Find index of point closest to given lat/lon
 * @param {Array<{lat: number, lon: number}>} points - Array of points
 * @param {number} lat - Target latitude
 * @param {number} lon - Target longitude
 * @param {number} [maxIndex] - Optional maximum index to search
 * @returns {number} - Index of closest point
 */
function findClosestPointIndex(points, lat, lon, maxIndex = null) {
    const searchLimit = maxIndex !== null ? Math.min(maxIndex, points.length - 1) : points.length - 1;
    let minDist = Infinity;
    let closestIdx = 0;

    for (let i = 0; i <= searchLimit; i++) {
        const dist = distanceSquaredDeg(lat, lon, points[i].lat, points[i].lon);
        if (dist < minDist) {
            minDist = dist;
            closestIdx = i;
        }
    }

    return closestIdx;
}

/**
 * Find point index for a given time using binary search
 * @param {Array<{timeS: number}>} points - Array of points with timeS property
 * @param {number} time - Target time in seconds
 * @returns {number} - Index of point at or before the given time
 */
function findPointIndexAtTime(points, time) {
    if (points.length === 0) return 0;
    if (time <= points[0].timeS) return 0;
    if (time >= points[points.length - 1].timeS) return points.length - 1;

    let low = 0;
    let high = points.length - 1;

    while (low < high) {
        const mid = Math.floor((low + high + 1) / 2);
        if (points[mid].timeS <= time) {
            low = mid;
        } else {
            high = mid - 1;
        }
    }

    return low;
}

/**
 * Safely get value from nested object path
 * @param {Object} obj - Source object
 * @param {string} path - Dot-separated path (e.g., 'a.b.c')
 * @param {*} defaultValue - Default value if path not found
 * @returns {*} - Value at path or default
 */
function getNestedValue(obj, path, defaultValue = null) {
    const keys = path.split('.');
    let current = obj;

    for (const key of keys) {
        if (current === null || current === undefined || !Object.prototype.hasOwnProperty.call(current, key)) {
            return defaultValue;
        }
        current = current[key];
    }

    return current;
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        formatTime,
        formatReplayTime,
        formatAltitude,
        formatVario,
        formatDistance,
        formatGlideRatio,
        formatWind,
        clamp,
        truncateText,
        debounce,
        createDOMCache,
        setClasses,
        setVisible,
        lerp,
        distanceSquaredDeg,
        findClosestPointIndex,
        findPointIndexAtTime,
        getNestedValue
    };
}
