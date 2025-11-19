/**
 * Application Constants
 * DOM selectors, CSS classes, and string literals
 */

// DOM Element IDs
const DOM_IDS = {
    // Containers
    cesiumContainer: 'cesiumContainer',
    bottomBar: 'bottomBar',

    // File Upload
    dropZone: 'dropZone',
    fileInput: 'fileInput',
    clearBtn: 'clearBtn',
    uploadStatus: 'uploadStatus',
    loadedFile: 'loadedFile',
    fileName: 'fileName',

    // Panels
    coachingPanel: 'coachingPanel',
    legendPanel: 'legendPanel',
    closeCoaching: 'closeCoaching',
    coachingContent: 'coachingContent',
    coachingTabContent: 'coachingTabContent',

    // Metrics - Flight Overview
    metricDuration: 'metricDuration',
    metricMaxAlt: 'metricMaxAlt',
    metricThermals: 'metricThermals',
    metricFirstLift: 'metricFirstLift',

    // Metrics - Best Thermal
    metricBestClimb: 'metricBestClimb',
    metricBestAvgClimb: 'metricBestAvgClimb',

    // Metrics - Glide Analysis
    metricGlides: 'metricGlides',
    metricAvgGlideRatio: 'metricAvgGlideRatio',
    metricTotalGlideDist: 'metricTotalGlideDist',

    // Metrics - Wind
    metricWindSpeed: 'metricWindSpeed',
    metricWindDir: 'metricWindDir',

    // Metrics - Speedbar & Quality
    metricSpeedbarOps: 'metricSpeedbarOps',
    metricGpsGaps: 'metricGpsGaps',

    // Lists
    thermalsContainer: 'thermalsContainer',
    glidesContainer: 'glidesContainer',
    annotationsList: 'annotationsList',

    // Chart
    altitudeChart: 'altitudeChart',

    // Replay Controls
    replayPlayBtn: 'replayPlayBtn',
    replayResetBtn: 'replayResetBtn',
    replayEndBtn: 'replayEndBtn',
    replaySpeed: 'replaySpeed',
    replayTimeline: 'replayTimeline',
    replayProgress: 'replayProgress',
    replayHandle: 'replayHandle',
    replayTime: 'replayTime',
    playIcon: 'playIcon',
    pauseIcon: 'pauseIcon',

    // Annotations
    addAnnotationBtn: 'addAnnotationBtn',
    addAnnotationCard: 'addAnnotationCard',

    // Bottom Bar Controls
    collapseBtn: 'collapseBtn',
    resizeHandle: 'resizeHandle'
};

// CSS Class Names
const CSS_CLASSES = {
    hidden: 'hidden',
    active: 'active',
    selected: 'selected',
    collapsed: 'collapsed',
    dragOver: 'drag-over',

    // Component Classes
    tabBtn: 'tab-btn',
    tabContent: 'tab-content',
    thermalItem: 'thermal-item',
    annotationCard: 'annotation-card',
    addCard: 'add-card',
    bottomBarContent: 'bottom-bar-content',
    compassArrow: 'compass-arrow',

    // Utility Classes
    climbPositive: 'climb-positive'
};

// Data Attributes
const DATA_ATTRS = {
    tab: 'data-tab',
    thermalIndex: 'data-thermal-index',
    annotationId: 'data-annotation-id'
};

// Tab Names
const TABS = {
    upload: 'upload',
    chart: 'chart',
    info: 'info',
    thermals: 'thermals',
    notes: 'notes',
    coaching: 'coaching'
};

// Button Text
const BUTTON_TEXT = {
    annotationMode: {
        active: 'Click Track',
        inactive: 'Add Note'
    }
};

// SVG Path Data
const SVG_PATHS = {
    collapse: {
        up: 'M5 15l7-7 7 7',
        down: 'M19 9l-7 7-7-7'
    },
    plus: 'M12 4v16m8-8H4',
    close: 'M6 18L18 6M6 6l12 12'
};

// Error Messages
const ERROR_MESSAGES = {
    initFailed: 'Failed to initialize 3D viewer. Please check your internet connection and refresh the page.',
    fileProcessing: (message) => `Error processing file: ${message}`,
    noTrackFound: 'Click is too far from track',
    noValidTrack: 'No valid track data'
};

// Success Messages
const SUCCESS_MESSAGES = {
    appInitialized: 'Application initialized successfully',
    sampleLoaded: 'Sample track loaded successfully'
};

// Log Prefixes
const LOG_PREFIX = {
    dev: 'DEV:',
    error: 'Error:',
    warn: 'Warning:'
};

// Freeze all constant objects
Object.freeze(DOM_IDS);
Object.freeze(CSS_CLASSES);
Object.freeze(DATA_ATTRS);
Object.freeze(TABS);
Object.freeze(BUTTON_TEXT);
Object.freeze(SVG_PATHS);
Object.freeze(ERROR_MESSAGES);
Object.freeze(SUCCESS_MESSAGES);
Object.freeze(LOG_PREFIX);

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        DOM_IDS,
        CSS_CLASSES,
        DATA_ATTRS,
        TABS,
        BUTTON_TEXT,
        SVG_PATHS,
        ERROR_MESSAGES,
        SUCCESS_MESSAGES,
        LOG_PREFIX
    };
}
