/**
 * Application State Manager
 * Centralized state management for the flight visualization app
 */

class AppState {
    constructor() {
        this.reset();
    }

    /**
     * Reset all state to initial values
     */
    reset() {
        // Core application state
        this.renderer = null;
        this.currentAnalysis = null;
        this.altitudeChart = null;

        // Selection state
        this.selectedThermalIndex = -1;
        this.selectedAnnotationId = null;

        // Annotation state
        this.annotations = [];
        this.annotationMode = false;
        this.annotationClickHandler = null;

        // Replay state
        this.replay = this.createReplayState();
    }

    /**
     * Create initial replay state object
     * @returns {Object} - Initial replay state
     */
    createReplayState() {
        return {
            // Playback control
            isPlaying: false,
            currentTime: 0,
            speed: APP_CONFIG.replay.defaultSpeed,
            totalDuration: 0,
            animationFrameId: null,
            lastFrameTime: 0,

            // Position tracking
            currentPointIndex: 0,

            // Cesium entities
            aircraftEntity: null,
            trailEntity: null,
            trailSegments: [],
            infoPopupEntity: null,

            // Polyline collection (performant rendering)
            trailCollection: null,
            trailPolylines: [],
            colorSegments: [],

            // Interpolation data
            interpolatedPoints: null,
            interpolatedHeights: null,
            interpolatedVario: null,
            interpolationFactor: APP_CONFIG.replay.interpolationFactor,

            // Camera state
            cameraHeading: null,
            cameraPitch: null,
            cameraRange: null,
            initialCameraRange: null
        };
    }

    /**
     * Reset replay state while preserving other state
     */
    resetReplay() {
        this.replay = this.createReplayState();
    }

    /**
     * Set the renderer instance
     * @param {CesiumRenderer} renderer - Cesium renderer instance
     */
    setRenderer(renderer) {
        this.renderer = renderer;
    }

    /**
     * Set the altitude chart instance
     * @param {AltitudeChart} chart - Altitude chart instance
     */
    setAltitudeChart(chart) {
        this.altitudeChart = chart;
    }

    /**
     * Set the current flight analysis
     * @param {Object} analysis - Flight analysis data
     */
    setCurrentAnalysis(analysis) {
        this.currentAnalysis = analysis;
    }

    /**
     * Clear the current analysis
     */
    clearCurrentAnalysis() {
        this.currentAnalysis = null;
    }

    /**
     * Select a thermal by index
     * @param {number} index - Thermal index (-1 for no selection)
     */
    selectThermal(index) {
        this.selectedThermalIndex = index;
    }

    /**
     * Clear thermal selection
     */
    clearThermalSelection() {
        this.selectedThermalIndex = -1;
    }

    /**
     * Check if a thermal is selected
     * @returns {boolean} - True if a thermal is selected
     */
    hasThermalSelected() {
        return this.selectedThermalIndex !== -1;
    }

    /**
     * Select an annotation by ID
     * @param {number} id - Annotation ID
     */
    selectAnnotation(id) {
        this.selectedAnnotationId = id;
    }

    /**
     * Clear annotation selection
     */
    clearAnnotationSelection() {
        this.selectedAnnotationId = null;
    }

    /**
     * Add an annotation
     * @param {Object} annotation - Annotation object
     */
    addAnnotation(annotation) {
        this.annotations.push(annotation);
    }

    /**
     * Remove an annotation by index
     * @param {number} index - Annotation index
     * @returns {Object|null} - Removed annotation or null
     */
    removeAnnotation(index) {
        if (index >= 0 && index < this.annotations.length) {
            return this.annotations.splice(index, 1)[0];
        }
        return null;
    }

    /**
     * Get annotation by ID
     * @param {number} id - Annotation ID
     * @returns {Object|null} - Annotation object or null
     */
    getAnnotationById(id) {
        return this.annotations.find(ann => ann.id === id) || null;
    }

    /**
     * Clear all annotations
     */
    clearAnnotations() {
        this.annotations = [];
    }

    /**
     * Toggle annotation mode
     * @returns {boolean} - New annotation mode state
     */
    toggleAnnotationMode() {
        this.annotationMode = !this.annotationMode;
        return this.annotationMode;
    }

    /**
     * Set annotation click handler
     * @param {Object} handler - Cesium event handler
     */
    setAnnotationClickHandler(handler) {
        this.annotationClickHandler = handler;
    }

    /**
     * Clear annotation click handler
     */
    clearAnnotationClickHandler() {
        if (this.annotationClickHandler) {
            this.annotationClickHandler.destroy();
            this.annotationClickHandler = null;
        }
    }

    /**
     * Update replay time
     * @param {number} time - New current time in seconds
     */
    setReplayTime(time) {
        this.replay.currentTime = Math.max(0, Math.min(time, this.replay.totalDuration));
    }

    /**
     * Toggle replay playback
     * @returns {boolean} - New playback state
     */
    toggleReplayPlayback() {
        this.replay.isPlaying = !this.replay.isPlaying;
        return this.replay.isPlaying;
    }

    /**
     * Set replay playing state
     * @param {boolean} isPlaying - Playing state
     */
    setReplayPlaying(isPlaying) {
        this.replay.isPlaying = isPlaying;
    }

    /**
     * Set replay speed
     * @param {number} speed - Playback speed multiplier
     */
    setReplaySpeed(speed) {
        this.replay.speed = speed;
    }

    /**
     * Set replay total duration
     * @param {number} duration - Total duration in seconds
     */
    setReplayDuration(duration) {
        this.replay.totalDuration = duration;
    }

    /**
     * Set current point index for replay
     * @param {number} index - Point index
     */
    setReplayPointIndex(index) {
        this.replay.currentPointIndex = index;
    }

    /**
     * Set aircraft entity
     * @param {Object} entity - Cesium entity
     */
    setAircraftEntity(entity) {
        this.replay.aircraftEntity = entity;
    }

    /**
     * Set trail collection
     * @param {Object} collection - Cesium PolylineCollection
     */
    setTrailCollection(collection) {
        this.replay.trailCollection = collection;
    }

    /**
     * Set trail polylines
     * @param {Array} polylines - Array of polylines
     */
    setTrailPolylines(polylines) {
        this.replay.trailPolylines = polylines;
    }

    /**
     * Set color segments
     * @param {Array} segments - Array of color segments
     */
    setColorSegments(segments) {
        this.replay.colorSegments = segments;
    }

    /**
     * Set interpolated track data
     * @param {Object} data - Interpolated data (points, heights, vario)
     */
    setInterpolatedData(data) {
        this.replay.interpolatedPoints = data.points;
        this.replay.interpolatedHeights = data.heights;
        this.replay.interpolatedVario = data.vario;
    }

    /**
     * Set animation frame ID
     * @param {number} id - Animation frame ID
     */
    setAnimationFrameId(id) {
        this.replay.animationFrameId = id;
    }

    /**
     * Clear animation frame ID
     */
    clearAnimationFrameId() {
        if (this.replay.animationFrameId) {
            cancelAnimationFrame(this.replay.animationFrameId);
            this.replay.animationFrameId = null;
        }
    }

    /**
     * Update last frame time
     * @param {number} time - Performance timestamp
     */
    setLastFrameTime(time) {
        this.replay.lastFrameTime = time;
    }

    /**
     * Set info popup entity
     * @param {Object} entity - Cesium entity
     */
    setInfoPopupEntity(entity) {
        this.replay.infoPopupEntity = entity;
    }

    /**
     * Check if flight data is loaded
     * @returns {boolean} - True if flight data is available
     */
    hasFlightData() {
        return this.currentAnalysis !== null &&
               this.currentAnalysis.points &&
               this.currentAnalysis.points.length > 0;
    }

    /**
     * Check if replay is initialized
     * @returns {boolean} - True if replay is ready
     */
    isReplayInitialized() {
        return this.replay.totalDuration > 0;
    }

    /**
     * Get current replay progress as percentage
     * @returns {number} - Progress percentage (0-100)
     */
    getReplayProgress() {
        if (this.replay.totalDuration <= 0) return 0;
        return (this.replay.currentTime / this.replay.totalDuration) * 100;
    }

    /**
     * Check if replay has reached the end
     * @returns {boolean} - True if at end
     */
    isReplayAtEnd() {
        return this.replay.currentTime >= this.replay.totalDuration;
    }

    /**
     * Get current track point based on replay time
     * @returns {Object|null} - Current track point or null
     */
    getCurrentTrackPoint() {
        if (!this.hasFlightData()) return null;
        const points = this.currentAnalysis.points;
        const index = this.replay.currentPointIndex;
        return points[index] || null;
    }

    /**
     * Get calculated height at current replay position
     * @returns {number|null} - Height in meters or null
     */
    getCurrentHeight() {
        if (!this.hasFlightData()) return null;
        const index = this.replay.currentPointIndex;

        if (this.currentAnalysis.calculatedHeights &&
            this.currentAnalysis.calculatedHeights[index]) {
            return this.currentAnalysis.calculatedHeights[index];
        }

        const point = this.getCurrentTrackPoint();
        return point ? point.altM : null;
    }
}

// Create singleton instance
const appState = new AppState();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AppState, appState };
}
