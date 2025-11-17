/**
 * Centralized Configuration
 * All application configuration values in one place
 */

const APP_CONFIG = {
    // Cesium Ion Configuration
    cesium: {
        defaultToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJiMWYxZGE4NS1lOWFmLTRmNTItYmMzZS0xNDc1YTU1MDMwYTkiLCJpZCI6MzYwNjk2LCJpYXQiOjE3NjMyMjc0NTd9.9PzqlKxs3Qay-NNoWWYvGVJZJ8Fi0M86Ra0QG5wT22g',
        resolutionScale: 2,
        maximumScreenSpaceError: 1.0,
        minimumZoomDistance: 10,
        maximumZoomDistance: 50000000,
        heightOffset: 5
    },

    // Camera Controls
    camera: {
        defaultHeadingDeg: 35,
        defaultPitchDeg: -35,
        defaultRange: 800,
        initialHeadingDeg: 0,
        initialPitchDeg: -90,
        flyDuration: 1.5,
        quickFlyDuration: 1.0,
        rotateRate: 1.0,
        tiltRate: 1.0,
        lookRate: 1.0,
        zoomRate: 2.0,
        initialViewDistance: 2000000
    },

    // Replay Settings
    replay: {
        defaultSpeed: 16,
        interpolationFactor: 3,
        speeds: [1, 2, 4, 8, 16, 32, 64]
    },

    // UI Configuration
    ui: {
        bottomBarMinHeight: 100,
        bottomBarMaxHeight: 600,
        infoPopupAutoHideMs: 3000,
        chartResizeDelayMs: 350,
        chartInitDelayMs: 100,
        annotationMaxTextLength: 25
    },

    // Interaction Thresholds
    interaction: {
        clickToleranceDegrees: 0.0005, // ~50 meters
        minMovementDistanceM: 0.5
    },

    // Color Scheme (Tailwind-inspired)
    colors: {
        primary: '#f97316',        // Orange-500
        primaryLight: '#fb923c',   // Orange-400
        primaryAlpha: 'rgba(251, 146, 60, 0.1)',
        success: '#22c55e',        // Green-500
        successAlpha: 'rgba(34, 197, 94, 0.1)',
        danger: '#dc2626',         // Red-600
        info: '#3b82f6',           // Blue-500
        infoAlpha: 'rgba(59, 130, 246, 0.1)',
        slate: {
            900: '#0f172a',
            800: '#1e293b',
            700: '#334155',
            600: '#475569',
            500: '#64748b',
            400: '#94a3b8',
            300: '#cbd5e1',
            200: '#e5e7eb'
        },
        vario: {
            extremeLift: '#ff0000',
            strongLift: '#ff4500',
            moderateStrongLift: '#ff8c00',
            moderateLift: '#ffa500',
            weakLift: '#ffd700',
            neutralLift: '#ffffe0',
            weakSink: '#00e5ff',
            moderateSink: '#00bfff',
            strongSink: '#0066ff',
            veryStrongSink: '#0000cc',
            extremeSink: '#cc00ff'
        },
        alpha: {
            trail: 0.9,
            highlight: 0.4
        }
    },

    // Vario Thresholds (m/s)
    varioThresholds: [
        { min: 5.0, color: 'extremeLift' },
        { min: 3.5, color: 'strongLift' },
        { min: 2.5, color: 'moderateStrongLift' },
        { min: 1.5, color: 'moderateLift' },
        { min: 0.5, color: 'weakLift' },
        { min: 0.0, color: 'neutralLift' },
        { min: -1.0, color: 'weakSink' },
        { min: -2.5, color: 'moderateSink' },
        { min: -5.0, color: 'strongSink' },
        { min: -7.5, color: 'veryStrongSink' },
        { min: -Infinity, color: 'extremeSink' }
    ],

    // Chart Configuration
    chart: {
        margins: { top: 20, right: 20, bottom: 30, left: 50 },
        lineWidth: 2,
        gridColor: '#e5e7eb',
        axisColor: '#94a3b8',
        labelColor: '#64748b',
        titleColor: '#475569',
        hoverPointRadius: 5,
        selectedPointRadius: 7,
        replayIndicatorRadius: 6
    },

    // Marker Configuration
    markers: {
        aircraftRibbonWidth: 20,
        aircraftRibbonHeight: 100,
        aircraftArrowHeight: 15,
        annotationPointSize: 7,
        annotationOutlineWidth: 2,
        pilotNameMaxLength: 10
    },

    // Development Settings
    dev: {
        autoLoadSample: false,
        samplePath: '/samples/schauinsland_long_flight_many_thermals.igc'
    }
};

// Freeze config to prevent accidental modifications
Object.freeze(APP_CONFIG);
Object.freeze(APP_CONFIG.cesium);
Object.freeze(APP_CONFIG.camera);
Object.freeze(APP_CONFIG.replay);
Object.freeze(APP_CONFIG.ui);
Object.freeze(APP_CONFIG.interaction);
Object.freeze(APP_CONFIG.colors);
Object.freeze(APP_CONFIG.colors.slate);
Object.freeze(APP_CONFIG.colors.vario);
Object.freeze(APP_CONFIG.colors.alpha);
Object.freeze(APP_CONFIG.chart);
Object.freeze(APP_CONFIG.markers);
Object.freeze(APP_CONFIG.dev);

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = APP_CONFIG;
}
