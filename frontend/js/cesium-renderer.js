/**
 * Cesium 3D Renderer
 * Handles 3D visualization of flight tracks using CesiumJS
 */

class CesiumRenderer {
    constructor(containerId) {
        this.containerId = containerId;
        this.viewer = null;
        this.flightEntities = [];
        this.thermalEntities = [];
        this.currentFlight = null;
        this.interpolationFactor = APP_CONFIG.replay.interpolationFactor;
        this.orbitCenter = null; // Current orbit center position
    }

    /**
     * Set camera orbit center to a specific position
     * @param {number} lon - Longitude
     * @param {number} lat - Latitude
     * @param {number} alt - Altitude
     */
    setOrbitCenter(lon, lat, alt) {
        const center = Cesium.Cartesian3.fromDegrees(lon, lat, alt);
        this.orbitCenter = center;

        // Get current camera distance from center
        const currentDistance = Cesium.Cartesian3.distance(
            this.viewer.camera.position,
            center
        );

        // Lock camera to orbit around this center
        const transform = Cesium.Transforms.eastNorthUpToFixedFrame(center);
        this.viewer.camera.lookAtTransform(transform);

        // Store for later use
        this.viewer.scene.screenSpaceCameraController.enableRotate = true;
        this.viewer.scene.screenSpaceCameraController.enableTranslate = true;
        this.viewer.scene.screenSpaceCameraController.enableZoom = true;
        this.viewer.scene.screenSpaceCameraController.enableTilt = true;
        this.viewer.scene.screenSpaceCameraController.enableLook = true;
    }

    /**
     * Release orbit lock and return to free camera
     */
    releaseOrbitCenter() {
        this.viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY);
        this.orbitCenter = null;
    }

    /**
     * Follow a position with the camera (keep target centered)
     * Translates camera by aircraft movement delta
     * @param {number} lon - Longitude
     * @param {number} lat - Latitude
     * @param {number} alt - Altitude
     */
    followPosition(lon, lat, alt) {
        const newCenter = Cesium.Cartesian3.fromDegrees(lon, lat, alt);

        if (this.orbitCenter) {
            // Calculate how much the target moved
            const delta = Cesium.Cartesian3.subtract(
                newCenter,
                this.orbitCenter,
                new Cesium.Cartesian3()
            );

            // Move camera by the same amount (in world coordinates)
            const camera = this.viewer.camera;
            Cesium.Cartesian3.add(camera.positionWC, delta, camera.positionWC);

            // Update orbit center for rotation controls
            this.orbitCenter = newCenter;

            // Re-lock orbit to new center (keeps camera in orbit mode)
            const transform = Cesium.Transforms.eastNorthUpToFixedFrame(newCenter);
            camera.lookAtTransform(transform);
        } else {
            this.orbitCenter = newCenter;
        }
    }

    /**
     * Catmull-Rom spline interpolation for smooth curves
     * @param {Array} points - Array of track points
     * @param {Array} heights - Calculated heights for each point
     * @param {Array} vario - Vario values for each point
     * @param {number} factor - Interpolation factor (points to add between each pair)
     * @returns {Object} - Interpolated points, heights, and vario
     */
    interpolateTrack(points, heights, vario, factor = 3) {
        if (points.length < 4) return { points, heights, vario };

        const newPoints = [];
        const newHeights = [];
        const newVario = [];

        // Catmull-Rom spline interpolation
        for (let i = 0; i < points.length - 1; i++) {
            const p0 = points[Math.max(0, i - 1)];
            const p1 = points[i];
            const p2 = points[i + 1];
            const p3 = points[Math.min(points.length - 1, i + 2)];

            const h0 = heights[Math.max(0, i - 1)];
            const h1 = heights[i];
            const h2 = heights[i + 1];
            const h3 = heights[Math.min(heights.length - 1, i + 2)];

            const v0 = vario[Math.max(0, i - 1)];
            const v1 = vario[i];
            const v2 = vario[i + 1];
            const v3 = vario[Math.min(vario.length - 1, i + 2)];

            // Add the original point
            newPoints.push(p1);
            newHeights.push(h1);
            newVario.push(v1);

            // Add interpolated points
            for (let j = 1; j <= factor; j++) {
                const t = j / (factor + 1);
                const t2 = t * t;
                const t3 = t2 * t;

                // Catmull-Rom coefficients
                const c0 = -0.5 * t3 + t2 - 0.5 * t;
                const c1 = 1.5 * t3 - 2.5 * t2 + 1;
                const c2 = -1.5 * t3 + 2 * t2 + 0.5 * t;
                const c3 = 0.5 * t3 - 0.5 * t2;

                // Interpolate position
                const interpLat = c0 * p0.lat + c1 * p1.lat + c2 * p2.lat + c3 * p3.lat;
                const interpLon = c0 * p0.lon + c1 * p1.lon + c2 * p2.lon + c3 * p3.lon;
                const interpAlt = c0 * p0.altM + c1 * p1.altM + c2 * p2.altM + c3 * p3.altM;
                const interpTime = c0 * p0.timeS + c1 * p1.timeS + c2 * p2.timeS + c3 * p3.timeS;

                // Interpolate height and vario
                const interpHeight = c0 * h0 + c1 * h1 + c2 * h2 + c3 * h3;
                const interpVario = c0 * v0 + c1 * v1 + c2 * v2 + c3 * v3;

                newPoints.push({
                    lat: interpLat,
                    lon: interpLon,
                    altM: interpAlt,
                    timeS: interpTime
                });
                newHeights.push(interpHeight);
                newVario.push(interpVario);
            }
        }

        // Add the last point
        newPoints.push(points[points.length - 1]);
        newHeights.push(heights[heights.length - 1]);
        newVario.push(vario[vario.length - 1]);

        return { points: newPoints, heights: newHeights, vario: newVario };
    }

    /**
     * Initialize the Cesium viewer
     * @param {string} accessToken - Cesium Ion access token (optional)
     */
    async initialize(accessToken = null) {
        // Set Cesium Ion access token if provided
        if (accessToken) {
            Cesium.Ion.defaultAccessToken = accessToken;
        } else {
            // Use default Cesium World Terrain
            Cesium.Ion.defaultAccessToken = APP_CONFIG.cesium.defaultToken;
        }

        // Create the Cesium viewer
        this.viewer = new Cesium.Viewer(this.containerId, {
            terrainProvider: await Cesium.createWorldTerrainAsync({
                requestWaterMask: true,
                requestVertexNormals: true
            }),
            baseLayerPicker: false,  // Disable base layer picker
            geocoder: false,
            homeButton: false,       // Disable home button
            sceneModePicker: false,  // Disable scene mode picker
            navigationHelpButton: false,  // Disable navigation help button
            animation: false,
            timeline: false,
            fullscreenButton: false,  // Disable fullscreen button
            vrButton: false,
            infoBox: false,           // Disable info box on click
            selectionIndicator: false, // Disable selection rectangle
            shouldAnimate: false,
            requestRenderMode: false  // Continuous rendering for smooth animations
        });

        // Add high-resolution satellite imagery
        const imageryLayer = await Cesium.IonImageryProvider.fromAssetId(2);
        this.viewer.imageryLayers.addImageryProvider(imageryLayer);

        this.viewer.resolutionScale = APP_CONFIG.cesium.resolutionScale;

        // Enable depth testing for underground features
        this.viewer.scene.globe.depthTestAgainstTerrain = true;

        // Improve terrain detail
        this.viewer.scene.globe.maximumScreenSpaceError = APP_CONFIG.cesium.maximumScreenSpaceError;

        // Configure camera controls for better flight visualization
        this.configureCameraControls();

        // Set initial camera view - full globe view
        this.viewer.camera.setView({
            destination: Cesium.Cartesian3.fromDegrees(0, 30, 20000000), // View from 20,000 km altitude
            orientation: {
                heading: 0.0,
                pitch: -Math.PI / 2, // Looking straight down
                roll: 0.0
            }
        });
    }

    /**
     * Configure enhanced camera controls for better flight visualization
     */
    configureCameraControls() {
        const scene = this.viewer.scene;
        const camera = this.viewer.camera;

        // Improve mouse control sensitivity
        const controller = scene.screenSpaceCameraController;

        // Zoom settings (mouse wheel)
        controller.zoomEventTypes = [
            Cesium.CameraEventType.WHEEL,
            Cesium.CameraEventType.PINCH
        ];
        controller.minimumZoomDistance = APP_CONFIG.cesium.minimumZoomDistance;
        controller.maximumZoomDistance = APP_CONFIG.cesium.maximumZoomDistance;

        // Rotate settings (left mouse button)
        controller.rotateEventTypes = Cesium.CameraEventType.LEFT_DRAG;
        controller.tiltEventTypes = [
            Cesium.CameraEventType.LEFT_DRAG,
            {
                eventType: Cesium.CameraEventType.LEFT_DRAG,
                modifier: Cesium.KeyboardEventModifier.SHIFT
            }
        ];

        // Pan settings (right mouse button or middle button)
        controller.lookEventTypes = [
            Cesium.CameraEventType.RIGHT_DRAG,
            {
                eventType: Cesium.CameraEventType.LEFT_DRAG,
                modifier: Cesium.KeyboardEventModifier.CTRL
            }
        ];

        // Improved rotation and tilt rates
        controller.rotateRate = APP_CONFIG.camera.rotateRate;
        controller.tiltRate = APP_CONFIG.camera.tiltRate;
        controller.lookRate = APP_CONFIG.camera.lookRate;
        controller.zoomRate = APP_CONFIG.camera.zoomRate;

        // Enable terrain collision (prevents going through the ground)
        controller.enableCollisionDetection = true;

        // Disable the default behavior of picking terrain point as orbit center
        // Force rotation around our set orbit center only
        const self = this;
        this.viewer.scene.preRender.addEventListener(() => {
            if (self.orbitCenter) {
                // Re-apply the lookAtTransform to maintain our orbit center
                const transform = Cesium.Transforms.eastNorthUpToFixedFrame(self.orbitCenter);
                if (!Cesium.Matrix4.equals(camera.transform, transform)) {
                    camera.lookAtTransform(transform);
                }
            }
        });
    }


    /**
     * Get center point of flight
     */
    getFlightCenter(points) {
        if (!points || points.length === 0) return { lon: 0, lat: 0, alt: 0 };

        const avgLat = points.reduce((sum, p) => sum + p.lat, 0) / points.length;
        const avgLon = points.reduce((sum, p) => sum + p.lon, 0) / points.length;
        const avgAlt = points.reduce((sum, p) => sum + p.altM, 0) / points.length;

        return { lon: avgLon, lat: avgLat, alt: avgAlt };
    }

    /**
     * Clear all flight-related entities
     */
    clear() {
        // Remove flight entities
        this.flightEntities.forEach(entity => {
            this.viewer.entities.remove(entity);
        });
        this.flightEntities = [];

        // Remove thermal entities
        this.thermalEntities.forEach(entity => {
            this.viewer.entities.remove(entity);
        });
        this.thermalEntities = [];

        this.currentFlight = null;
    }

    /**
     * Get color based on climb rate
     * 7-color scheme: Dark blues (sink) -> Green (neutral) -> Yellow/Orange/Red (lift)
     * @param {number} vario - Vertical speed in m/s
     * @returns {Cesium.Color} - Color for the given vario
     */
    getColorFromVario(vario) {
        // Burnair-style color scheme
        if (vario >= 5.0) {
            // Very strong lift: Red
            return Cesium.Color.fromCssColorString('#ff0000').withAlpha(0.9);
        } else if (vario >= 3.5) {
            // Strong lift: Orange-red
            return Cesium.Color.fromCssColorString('#ff4500').withAlpha(0.9);
        } else if (vario >= 2.5) {
            // Moderate-strong lift: Orange
            return Cesium.Color.fromCssColorString('#ff8c00').withAlpha(0.9);
        } else if (vario >= 1.5) {
            // Moderate lift: Yellow-orange
            return Cesium.Color.fromCssColorString('#ffa500').withAlpha(0.9);
        } else if (vario >= 0.5) {
            // Weak lift: Yellow
            return Cesium.Color.fromCssColorString('#ffd700').withAlpha(0.9);
        } else if (vario >= 0.0) {
            // Near zero / weak lift: Pale yellow
            return Cesium.Color.fromCssColorString('#ffffe0').withAlpha(0.9);
        } else if (vario >= -1.0) {
            // Weak sink: Cyan/turquoise
            return Cesium.Color.fromCssColorString('#00e5ff').withAlpha(0.9);
        } else if (vario >= -2.5) {
            // Moderate sink: Sky blue
            return Cesium.Color.fromCssColorString('#00bfff').withAlpha(0.9);
        } else if (vario >= -5.0) {
            // Strong sink: Blue
            return Cesium.Color.fromCssColorString('#0066ff').withAlpha(0.9);
        } else if (vario >= -7.5) {
            // Very strong sink: Dark blue
            return Cesium.Color.fromCssColorString('#0000cc').withAlpha(0.9);
        } else {
            // Extreme sink: Purple/Magenta
            return Cesium.Color.fromCssColorString('#cc00ff').withAlpha(0.9);
        }
    }

    /**
     * Render flight track with color coding
     * @param {Object} flightData - Analyzed flight data
     */
    async renderFlightTrack(flightData) {
        this.currentFlight = flightData;
        const { points, vario, segments } = flightData;

        if (!points || points.length === 0) {
            console.error('No points to render');
            return;
        }

        // Height offset to ensure track is always above terrain (in meters)
        const HEIGHT_OFFSET = APP_CONFIG.cesium.heightOffset;

        // Create positions array for terrain sampling
        const cartographicPositions = points.map(p =>
            Cesium.Cartographic.fromDegrees(p.lon, p.lat)
        );

        // Sample terrain heights at all track points
        // This ensures the track is positioned correctly relative to the terrain
        try {
            const sampledPositions = await Cesium.sampleTerrainMostDetailed(
                this.viewer.terrainProvider,
                cartographicPositions
            );

            // Store the calculated heights for use by markers
            const calculatedHeights = points.map((p, i) => {
                const terrainHeight = sampledPositions[i].height || 0;
                return Math.max(p.altM, terrainHeight + HEIGHT_OFFSET);
            });

            // Store heights in currentFlight for markers to use
            this.currentFlight.calculatedHeights = calculatedHeights;

            // Apply spline interpolation for smooth curves
            const interpolated = this.interpolateTrack(points, calculatedHeights, vario, this.interpolationFactor);
            const smoothPoints = interpolated.points;
            const smoothHeights = interpolated.heights;
            const smoothVario = interpolated.vario;

            // Map to track which thermal each segment belongs to (scaled for interpolated points)
            const factor = this.interpolationFactor + 1;
            const segmentToThermal = new Array(smoothPoints.length).fill(-1);
            segments.forEach((thermal, idx) => {
                const startInterp = thermal.startIdx * factor;
                const endInterp = Math.min(thermal.endIdx * factor + factor, smoothPoints.length - 1);
                for (let i = startInterp; i <= endInterp; i++) {
                    segmentToThermal[i] = idx;
                }
            });

            // Use interpolated data for rendering
            const renderPoints = smoothPoints;
            const renderHeights = smoothHeights;
            const renderVario = smoothVario;

            // Group consecutive points by color and thermal for smoother lines
            let currentPositions = [];
            let currentColor = null;
            let currentThermalIdx = null;
            let startIdx = 0;
            let endIdx = 0;

            const createSegment = () => {
                if (currentPositions.length >= 2) {
                    const entity = this.viewer.entities.add({
                        polyline: {
                            positions: currentPositions,
                            width: 3,
                            material: currentColor,
                            clampToGround: false,
                            arcType: Cesium.ArcType.NONE
                        }
                    });

                    entity.thermalIndex = currentThermalIdx;
                    entity.isTrackSegment = true;
                    entity.originalColor = currentColor;
                    entity.originalWidth = 3;
                    entity.startIdx = startIdx;
                    // Map interpolated index back to original point index for replay
                    entity.endPointIndex = Math.floor(endIdx / factor);

                    this.flightEntities.push(entity);
                }
            };

            for (let i = 0; i < renderPoints.length; i++) {
                const p = renderPoints[i];
                const v = renderVario[i];
                const color = this.getColorFromVario(v);
                const thermalIdx = segmentToThermal[i];

                // Check if we need to start a new segment (color or thermal changed)
                if (currentColor === null) {
                    // First point
                    currentColor = color;
                    currentThermalIdx = thermalIdx;
                    startIdx = i;
                    endIdx = i;
                    currentPositions = [Cesium.Cartesian3.fromDegrees(p.lon, p.lat, renderHeights[i])];
                } else if (!color.equals(currentColor) || thermalIdx !== currentThermalIdx) {
                    // Color or thermal changed - finish current segment
                    endIdx = i;
                    currentPositions.push(Cesium.Cartesian3.fromDegrees(p.lon, p.lat, renderHeights[i]));
                    createSegment();

                    // Start new segment (include this point as start)
                    currentColor = color;
                    currentThermalIdx = thermalIdx;
                    startIdx = i;
                    endIdx = i;
                    currentPositions = [Cesium.Cartesian3.fromDegrees(p.lon, p.lat, renderHeights[i])];
                } else {
                    // Same color and thermal - continue current segment
                    endIdx = i;
                    currentPositions.push(Cesium.Cartesian3.fromDegrees(p.lon, p.lat, renderHeights[i]));
                }
            }

            // Don't forget the last segment
            createSegment();
        } catch (error) {
            console.warn('Terrain sampling failed, using simple offset:', error);

            // Store simple offset heights as fallback
            this.currentFlight.calculatedHeights = points.map(p => p.altM + HEIGHT_OFFSET);

            // Fallback: use simple offset if terrain sampling fails
            for (let i = 0; i < points.length - 1; i++) {
                const p1 = points[i];
                const p2 = points[i + 1];
                const avgVario = (vario[i] + vario[i + 1]) / 2;

                const positions = [
                    Cesium.Cartesian3.fromDegrees(p1.lon, p1.lat, p1.altM + HEIGHT_OFFSET),
                    Cesium.Cartesian3.fromDegrees(p2.lon, p2.lat, p2.altM + HEIGHT_OFFSET)
                ];

                const color = this.getColorFromVario(avgVario);

                const entity = this.viewer.entities.add({
                    polyline: {
                        positions: positions,
                        width: 3,
                        material: color,
                        clampToGround: false,
                        arcType: Cesium.ArcType.NONE
                    }
                });

                this.flightEntities.push(entity);
            }
        }

        // Fly to the flight track
        this.flyToTrack(points);
    }

    /**
     * Highlight track segments belonging to a specific thermal
     * @param {number} thermalIndex - Index of thermal to highlight
     */
    highlightThermal(thermalIndex) {
        this.flightEntities.forEach(entity => {
            if (entity.isTrackSegment) {
                if (entity.thermalIndex === thermalIndex) {
                    // Keep thermal section normal - slightly thicker to stand out
                    entity.polyline.width = 5;
                    entity.polyline.material = entity.originalColor;
                } else {
                    // Gray out non-thermal sections
                    entity.polyline.width = 2;
                    entity.polyline.material = Cesium.Color.GRAY.withAlpha(0.4);
                }
            }
        });
    }

    /**
     * Restore original colors and widths to all track segments
     */
    unhighlightAll() {
        this.flightEntities.forEach(entity => {
            if (entity.isTrackSegment) {
                entity.polyline.width = entity.originalWidth || 3;
                entity.polyline.material = entity.originalColor || Cesium.Color.BLUE;
            }
        });
    }

    /**
     * Fly camera to view the flight track
     * @param {Array<TrackPoint>} points - Track points
     */
    flyToTrack(points) {
        if (!points || points.length === 0) return;

        // Center on start point
        const start = points[0];
        const startHeight = this.currentFlight && this.currentFlight.calculatedHeights
            ? this.currentFlight.calculatedHeights[0]
            : start.altM;

        // Release any existing orbit lock before flying
        this.releaseOrbitCenter();

        // Create center position for the start point
        const centerPosition = Cesium.Cartesian3.fromDegrees(start.lon, start.lat, startHeight);
        const boundingSphere = new Cesium.BoundingSphere(centerPosition, 100);

        const self = this;

        // Fly to view the start point centered
        this.viewer.camera.flyToBoundingSphere(boundingSphere, {
            offset: new Cesium.HeadingPitchRange(
                Cesium.Math.toRadians(APP_CONFIG.camera.defaultHeadingDeg),
                Cesium.Math.toRadians(APP_CONFIG.camera.defaultPitchDeg),
                APP_CONFIG.camera.defaultRange
            ),
            duration: APP_CONFIG.camera.flyDuration,
            complete: () => {
                // Set orbit center after fly completes
                self.setOrbitCenter(start.lon, start.lat, startHeight);
            }
        });
    }

    /**
     * Render complete flight visualization
     * @param {Object} flightData - Analyzed flight data
     */
    async render(flightData) {
        this.clear();
        await this.renderFlightTrack(flightData);
    }

    /**
     * Fly camera to a specific position with unified settings
     * @param {number} lon - Longitude
     * @param {number} lat - Latitude
     * @param {number} alt - Altitude
     * @param {Object} [options] - Optional settings
     * @param {number} [options.headingDeg] - Camera heading in degrees
     * @param {number} [options.pitchDeg] - Camera pitch in degrees
     * @param {number} [options.range] - Distance from target
     * @param {number} [options.duration] - Animation duration in seconds
     * @param {boolean} [options.setOrbit] - Whether to set orbit center after flight (default: true)
     * @param {Function} [options.onComplete] - Callback after flight completes
     */
    flyToPosition(lon, lat, alt, options = {}) {
        const {
            headingDeg = APP_CONFIG.camera.defaultHeadingDeg,
            pitchDeg = APP_CONFIG.camera.defaultPitchDeg,
            range = APP_CONFIG.camera.defaultRange,
            duration = APP_CONFIG.camera.flyDuration,
            setOrbit = true,
            onComplete = null
        } = options;

        const targetPosition = Cesium.Cartesian3.fromDegrees(lon, lat, alt);
        const boundingSphere = new Cesium.BoundingSphere(targetPosition, 200);

        this.releaseOrbitCenter();

        const self = this;
        this.viewer.camera.flyToBoundingSphere(boundingSphere, {
            offset: new Cesium.HeadingPitchRange(
                Cesium.Math.toRadians(headingDeg),
                Cesium.Math.toRadians(pitchDeg),
                range
            ),
            duration: duration,
            complete: () => {
                if (setOrbit) {
                    self.setOrbitCenter(lon, lat, alt);
                }
                if (onComplete) onComplete();
            }
        });
    }

    /**
     * Create an info label entity (popup)
     * @param {number} lon - Longitude
     * @param {number} lat - Latitude
     * @param {number} alt - Altitude
     * @param {string} text - Label text
     * @returns {Object} - Cesium entity
     */
    createInfoLabel(lon, lat, alt, text) {
        return this.viewer.entities.add({
            position: Cesium.Cartesian3.fromDegrees(lon, lat, alt + 50),
            label: {
                text: text,
                font: 'bold 16px -apple-system, BlinkMacSystemFont, sans-serif',
                fillColor: Cesium.Color.WHITE,
                outlineColor: Cesium.Color.BLACK,
                outlineWidth: 3,
                style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
                pixelOffset: new Cesium.Cartesian2(0, -15),
                disableDepthTestDistance: Number.POSITIVE_INFINITY,
                showBackground: true,
                backgroundColor: Cesium.Color.fromCssColorString(APP_CONFIG.colors.slate[900]),
                backgroundPadding: new Cesium.Cartesian2(12, 8)
            }
        });
    }

    /**
     * Create a billboard entity (marker with image)
     * @param {number} lon - Longitude
     * @param {number} lat - Latitude
     * @param {number} alt - Altitude
     * @param {HTMLCanvasElement|string} image - Canvas or image URL
     * @param {Object} [options] - Additional options
     * @returns {Object} - Cesium entity
     */
    createBillboardEntity(lon, lat, alt, image, options = {}) {
        const {
            name = 'Billboard',
            verticalOrigin = Cesium.VerticalOrigin.BOTTOM,
            horizontalOrigin = Cesium.HorizontalOrigin.CENTER,
            pixelOffset = new Cesium.Cartesian2(0, 0),
            scaleByDistance = new Cesium.NearFarScalar(100, 1.0, 3000, 0.5)
        } = options;

        return this.viewer.entities.add({
            name: name,
            position: Cesium.Cartesian3.fromDegrees(lon, lat, alt),
            billboard: {
                image: image,
                verticalOrigin: verticalOrigin,
                horizontalOrigin: horizontalOrigin,
                pixelOffset: pixelOffset,
                disableDepthTestDistance: Number.POSITIVE_INFINITY,
                scaleByDistance: scaleByDistance
            }
        });
    }

    /**
     * Create a point marker with optional label
     * @param {number} lon - Longitude
     * @param {number} lat - Latitude
     * @param {number} alt - Altitude
     * @param {Object} [options] - Additional options
     * @returns {Object} - Cesium entity
     */
    createPointMarker(lon, lat, alt, options = {}) {
        const {
            name = 'Point Marker',
            pixelSize = APP_CONFIG.markers.annotationPointSize,
            color = APP_CONFIG.colors.primaryLight,
            outlineWidth = APP_CONFIG.markers.annotationOutlineWidth,
            billboard = null
        } = options;

        const entityOptions = {
            name: name,
            position: Cesium.Cartesian3.fromDegrees(lon, lat, alt),
            point: {
                pixelSize: pixelSize,
                color: Cesium.Color.fromCssColorString(color),
                outlineColor: Cesium.Color.WHITE,
                outlineWidth: outlineWidth,
                disableDepthTestDistance: Number.POSITIVE_INFINITY,
                scaleByDistance: new Cesium.NearFarScalar(100, 1.0, 3000, 0.5)
            }
        };

        if (billboard) {
            entityOptions.billboard = {
                image: billboard,
                horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
                verticalOrigin: Cesium.VerticalOrigin.CENTER,
                pixelOffset: new Cesium.Cartesian2(0, -20),
                disableDepthTestDistance: Number.POSITIVE_INFINITY,
                scaleByDistance: new Cesium.NearFarScalar(100, 1.0, 3000, 0.5)
            };
        }

        return this.viewer.entities.add(entityOptions);
    }

    /**
     * Remove an entity from the viewer
     * @param {Object} entity - Cesium entity to remove
     */
    removeEntity(entity) {
        if (entity) {
            this.viewer.entities.remove(entity);
        }
    }

    /**
     * Get Cesium color from vario value using config
     * @param {number} vario - Vertical speed in m/s
     * @returns {Object} - Cesium Color object
     */
    getColorFromVarioConfig(vario) {
        const thresholds = APP_CONFIG.varioThresholds;
        const colors = APP_CONFIG.colors.vario;
        const alpha = APP_CONFIG.colors.alpha.trail;

        for (const threshold of thresholds) {
            if (vario >= threshold.min) {
                return Cesium.Color.fromCssColorString(colors[threshold.color]).withAlpha(alpha);
            }
        }

        // Fallback
        return Cesium.Color.fromCssColorString(colors.extremeSink).withAlpha(alpha);
    }
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CesiumRenderer;
}
