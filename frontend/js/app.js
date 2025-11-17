/**
 * Main Application
 * Orchestrates file upload, parsing, analysis, and visualization
 */

// Create DOM cache for frequently accessed elements
const domCache = createDOMCache();

/**
 * Initialize the application
 */
async function initApp() {
    try {
        // Initialize Cesium renderer
        const renderer = new CesiumRenderer(DOM_IDS.cesiumContainer);
        await renderer.initialize();
        appState.setRenderer(renderer);

        // Initialize altitude chart
        const altitudeChart = new AltitudeChart(DOM_IDS.altitudeChart);
        altitudeChart.onPointClick = handleAltitudeChartClick;
        appState.setAltitudeChart(altitudeChart);

        // Set up file upload handlers
        setupFileUpload();

        // Set up altitude chart and annotation handlers
        setupChartAndAnnotations();

        // Set up bottom bar tabs and controls
        setupBottomBar();

        // Set up entity click handlers
        setupEntityClickHandler();

        // Set up compass
        setupCompass();

        console.log(SUCCESS_MESSAGES.appInitialized);

        // DEV: Auto-load sample track for testing (remove in production)
        if (APP_CONFIG.dev.autoLoadSample) {
            await loadSampleTrack();
        }
    } catch (error) {
        console.error('Failed to initialize application:', error);
        alert(ERROR_MESSAGES.initFailed);
    }
}

/**
 * Load a sample track for testing (DEV only)
 */
async function loadSampleTrack() {
    try {
        const sampleUrl = APP_CONFIG.dev.samplePath;
        console.log(`${LOG_PREFIX.dev} Auto-loading sample track:`, sampleUrl);

        const response = await fetch(sampleUrl);
        if (!response.ok) throw new Error('Failed to fetch sample');

        const content = await response.text();
        const fileName = sampleUrl.split('/').pop();

        // Parse and analyze
        const points = parseTrackFile(content, fileName);
        console.log(`Parsed ${points.length} track points`);

        const analysis = analyze(points);
        console.log('Flight analysis complete:', analysis);

        appState.setCurrentAnalysis(analysis);

        // Render (automatically flies to track after rendering)
        await appState.renderer.render(analysis);

        // Show UI
        setVisible(DOM_IDS.uploadStatus, false);
        setVisible(DOM_IDS.loadedFile, true);
        domCache.get(DOM_IDS.fileName).textContent = fileName + ' (auto-loaded)';

        // Show floating panels
        setVisible(DOM_IDS.coachingPanel, true);
        setVisible(DOM_IDS.legendPanel, true);

        // Switch to Chart tab after loading
        switchToTab(TABS.chart);

        // Ensure bottom bar is expanded
        domCache.get(DOM_IDS.bottomBar).classList.remove(CSS_CLASSES.collapsed);

        updateMetricsPanel(analysis);
        updateCoachingPanel(analysis);
        initializeReplay(analysis);

        setTimeout(() => {
            appState.altitudeChart.resizeCanvas();
            appState.altitudeChart.setData(analysis);
        }, APP_CONFIG.ui.chartInitDelayMs);

        console.log(`${LOG_PREFIX.dev} ${SUCCESS_MESSAGES.sampleLoaded}`);
    } catch (error) {
        console.warn(`${LOG_PREFIX.dev} Failed to auto-load sample track:`, error);
    }
}

/**
 * Set up file upload handlers
 */
function setupFileUpload() {
    const dropZone = domCache.get(DOM_IDS.dropZone);
    const fileInput = domCache.get(DOM_IDS.fileInput);
    const clearBtn = domCache.get(DOM_IDS.clearBtn);

    // Click to upload
    dropZone.addEventListener('click', () => {
        fileInput.click();
    });

    // File input change
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            handleFileUpload(file);
        }
    });

    // Drag and drop
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add(CSS_CLASSES.dragOver);
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove(CSS_CLASSES.dragOver);
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove(CSS_CLASSES.dragOver);

        const file = e.dataTransfer.files[0];
        if (file) {
            handleFileUpload(file);
        }
    });

    // Clear button
    clearBtn.addEventListener('click', () => {
        clearFlight();
    });

    // Close coaching panel
    domCache.get(DOM_IDS.closeCoaching).addEventListener('click', () => {
        setVisible(DOM_IDS.coachingPanel, false);
    });
}

/**
 * Handle file upload
 * @param {File} file - Uploaded file
 */
async function handleFileUpload(file) {
    try {
        // Show loading state
        setVisible(DOM_IDS.uploadStatus, true);
        setVisible(DOM_IDS.loadedFile, false);

        // Read file content
        const content = await readFileContent(file);

        // Parse the file
        const points = parseTrackFile(content, file.name);
        console.log(`Parsed ${points.length} track points`);

        // Analyze the flight
        const analysis = analyze(points);
        console.log('Flight analysis complete:', analysis);

        // Store current analysis
        appState.setCurrentAnalysis(analysis);

        // Render visualization (async - waits for terrain sampling)
        await appState.renderer.render(analysis);

        // Hide loading, show file info
        setVisible(DOM_IDS.uploadStatus, false);
        setVisible(DOM_IDS.loadedFile, true);
        domCache.get(DOM_IDS.fileName).textContent = file.name;

        // Show floating panels
        setVisible(DOM_IDS.coachingPanel, true);
        setVisible(DOM_IDS.legendPanel, true);

        // Switch to Chart tab after loading
        switchToTab(TABS.chart);

        // Ensure bottom bar is expanded
        domCache.get(DOM_IDS.bottomBar).classList.remove(CSS_CLASSES.collapsed);

        // Update UI after panels are visible
        updateMetricsPanel(analysis);
        updateCoachingPanel(analysis);
        initializeReplay(analysis);

        // Update altitude chart (after panel is visible so canvas has dimensions)
        setTimeout(() => {
            appState.altitudeChart.resizeCanvas();
            appState.altitudeChart.setData(analysis);
        }, APP_CONFIG.ui.chartInitDelayMs);

    } catch (error) {
        console.error('Error processing file:', error);
        setVisible(DOM_IDS.uploadStatus, false);
        alert(ERROR_MESSAGES.fileProcessing(error.message));
    }
}

/**
 * Read file content as text
 * @param {File} file - File to read
 * @returns {Promise<string>} - File content
 */
function readFileContent(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => resolve(event.target.result);
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsText(file);
    });
}

/**
 * Update metrics panel with flight data
 * @param {Object} analysis - Flight analysis data
 */
function updateMetricsPanel(analysis) {
    domCache.get(DOM_IDS.metricDuration).textContent = formatTime(analysis.durationTotal);
    domCache.get(DOM_IDS.metricMaxAlt).textContent = analysis.maxAlt ? formatAltitude(analysis.maxAlt) : '-';
    domCache.get(DOM_IDS.metricThermals).textContent = analysis.segments.length;
    domCache.get(DOM_IDS.metricFirstLift).textContent = analysis.timeToFirstThermal ? formatTime(analysis.timeToFirstThermal) : '-';
    updateThermalsList(analysis.segments);
}

/**
 * Update thermals list
 * @param {Array<ThermalSegment>} thermals - Array of thermal segments
 */
function updateThermalsList(thermals) {
    const container = domCache.get(DOM_IDS.thermalsContainer);
    container.innerHTML = '';

    if (thermals.length === 0) {
        container.innerHTML = '<div class="text-xs text-slate-500">No thermals detected</div>';
        return;
    }

    // Add "Clear selection" option at the top
    const clearItem = document.createElement('div');
    clearItem.className = `${CSS_CLASSES.thermalItem} text-center`;
    clearItem.id = 'clearThermalSelection';
    clearItem.innerHTML = '<div class="text-xs text-slate-500 italic">No thermal selected</div>';
    clearItem.addEventListener('click', clearThermalSelection);
    container.appendChild(clearItem);

    thermals.forEach((thermal, index) => {
        const item = document.createElement('div');
        item.className = CSS_CLASSES.thermalItem;
        item.dataset.thermalIndex = index;
        item.innerHTML = `
            <div class="flex items-center justify-between mb-1">
                <div class="text-xs font-medium text-slate-900">Thermal ${index + 1}</div>
                <div class="text-xs ${thermal.earlyExit ? 'text-orange-500' : 'text-green-600'}">
                    ${thermal.earlyExit ? '⚠️ Early Exit' : '✓'}
                </div>
            </div>
            <div class="text-xs text-slate-600">
                <div class="${CSS_CLASSES.climbPositive}">${formatVario(thermal.maxClimb)} peak</div>
                <div class="text-slate-500">
                    Avg: ${formatVario(thermal.avgClimb)} • ${thermal.circles.toFixed(1)} circles
                </div>
            </div>
        `;

        item.addEventListener('mouseenter', () => highlightThermalTrack(index));
        item.addEventListener('mouseleave', () => {
            appState.hasThermalSelected() ? highlightThermalTrack(appState.selectedThermalIndex) : unhighlightThermalTrack();
        });
        item.addEventListener('click', () => {
            selectThermal(index);
            flyToThermal(thermal);
        });

        container.appendChild(item);
    });
}

/**
 * Select a thermal and persist highlighting
 * @param {number} index - Thermal index
 */
function selectThermal(index) {
    appState.selectThermal(index);
    highlightThermalTrack(index);

    // Update visual selection in list
    document.querySelectorAll(`.${CSS_CLASSES.thermalItem}`).forEach(t => t.classList.remove(CSS_CLASSES.active));
    const selectedItem = document.querySelector(`.${CSS_CLASSES.thermalItem}[${DATA_ATTRS.thermalIndex}="${index}"]`);
    if (selectedItem) {
        selectedItem.classList.add(CSS_CLASSES.active);
    }
}

/**
 * Clear thermal selection
 */
function clearThermalSelection() {
    appState.clearThermalSelection();
    unhighlightThermalTrack();

    // Remove visual selection
    document.querySelectorAll(`.${CSS_CLASSES.thermalItem}`).forEach(t => t.classList.remove(CSS_CLASSES.active));

    // Fly to current replay position (or start if at beginning)
    if (appState.hasFlightData()) {
        const pointIndex = appState.replay.currentPointIndex || 0;
        const point = appState.currentAnalysis.points[pointIndex];
        const height = appState.currentAnalysis.calculatedHeights?.[pointIndex] || point.altM;

        appState.renderer.flyToPosition(point.lon, point.lat, height);
    }
}

/**
 * Fly camera to thermal
 * @param {ThermalSegment} thermal - Thermal segment
 */
function flyToThermal(thermal) {
    if (!appState.hasFlightData()) return;

    const points = appState.currentAnalysis.points;

    // If replay hasn't reached this thermal yet, jump to the end of the thermal
    if (appState.replay.totalDuration > 0 && appState.replay.currentPointIndex < thermal.endIdx) {
        const thermalEndTime = points[thermal.endIdx].timeS - points[0].timeS;
        seekReplay(thermalEndTime);
    }

    // Calculate bounding box of thermal
    let minLat = Infinity, maxLat = -Infinity;
    let minLon = Infinity, maxLon = -Infinity;
    let minAlt = Infinity, maxAlt = -Infinity;

    for (let i = thermal.startIdx; i <= thermal.endIdx; i++) {
        const p = points[i];
        minLat = Math.min(minLat, p.lat);
        maxLat = Math.max(maxLat, p.lat);
        minLon = Math.min(minLon, p.lon);
        maxLon = Math.max(maxLon, p.lon);
        minAlt = Math.min(minAlt, p.altM);
        maxAlt = Math.max(maxAlt, p.altM);
    }

    const centerLat = (minLat + maxLat) / 2;
    const centerLon = (minLon + maxLon) / 2;
    const centerAlt = (minAlt + maxAlt) / 2;
    const horizontalSpan = Math.max(maxLat - minLat, maxLon - minLon);
    const viewDistance = Math.max(APP_CONFIG.camera.defaultRange, horizontalSpan * 111000 * 3);

    appState.renderer.flyToPosition(centerLon, centerLat, centerAlt, {
        range: viewDistance,
        duration: APP_CONFIG.camera.flyDuration
    });
}

/**
 * Highlight thermal track on the 3D map
 * @param {number} index - Thermal index
 */
function highlightThermalTrack(index) {
    if (!appState.renderer) return;

    if (appState.replay.trailCollection && appState.replay.trailPolylines.length > 0) {
        updateTrailThermalHighlight(index);
    } else {
        appState.renderer.highlightThermal(index);
    }
}

/**
 * Remove thermal track highlighting
 */
function unhighlightThermalTrack() {
    if (!appState.renderer) return;

    if (appState.replay.trailCollection && appState.replay.trailPolylines.length > 0) {
        updateTrailThermalHighlight(-1);
    } else {
        appState.renderer.unhighlightAll();
    }
}

/**
 * Update trail colors for thermal highlighting during replay
 * @param {number} thermalIndex - Thermal index to highlight (-1 for no highlight)
 */
function updateTrailThermalHighlight(thermalIndex) {
    if (!appState.replay.trailPolylines || !appState.hasFlightData()) return;

    const segments = appState.currentAnalysis.segments;
    const interpVario = appState.replay.interpolatedVario;
    const factor = appState.replay.interpolationFactor + 1;

    // Map which interpolated indices belong to which thermal
    const interpToThermal = new Array(interpVario.length).fill(-1);
    segments.forEach((thermal, idx) => {
        const startInterp = thermal.startIdx * factor;
        const endInterp = Math.min(thermal.endIdx * factor + factor, interpVario.length - 1);
        for (let i = startInterp; i <= endInterp; i++) {
            interpToThermal[i] = idx;
        }
    });

    // Update each polyline's color based on whether it's in the highlighted thermal
    appState.replay.colorSegments.forEach((seg, idx) => {
        const polyline = appState.replay.trailPolylines[idx];

        // Check if this segment belongs to the highlighted thermal
        const segThermalIdx = interpToThermal[seg.startIdx];

        if (thermalIndex === -1) {
            // No highlight - restore original color and width
            polyline.material = Cesium.Material.fromType('Color', {
                color: seg.color
            });
            polyline.width = 3;
        } else if (segThermalIdx === thermalIndex) {
            // This segment is in the highlighted thermal - show bright
            polyline.material = Cesium.Material.fromType('Color', {
                color: seg.color
            });
            polyline.width = 5;
        } else {
            // Not in highlighted thermal - show grayed out
            polyline.material = Cesium.Material.fromType('Color', {
                color: Cesium.Color.GRAY.withAlpha(0.4)
            });
            polyline.width = 2;
        }
    });
}

/**
 * Update coaching panel with feedback
 * @param {Object} analysis - Flight analysis data
 */
function updateCoachingPanel(analysis) {
    const coaching = generateCoaching(analysis);
    const coachingHTML = generateCoachingHTML(coaching);

    domCache.get(DOM_IDS.coachingContent).innerHTML = coachingHTML;
    domCache.get(DOM_IDS.coachingTabContent).innerHTML = coachingHTML;
}

/**
 * Generate HTML for coaching feedback sections
 * @param {Object} coaching - Coaching data
 * @returns {string} - HTML string
 */
function generateCoachingHTML(coaching) {
    const sections = [
        { title: '✓ What went well', items: coaching.whatWentWell, color: 'green' },
        { title: '↑ What to improve', items: coaching.whatToImprove, color: 'orange' },
        { title: '⚠️ Safety & Mindset', items: coaching.safetyMindset, color: 'red' },
        { title: '🎯 Next-flight plan', items: coaching.nextFlightPlan, color: 'blue' }
    ];

    let html = '';

    sections.forEach(section => {
        if (section.items.length > 0) {
            html += `
                <div class="metric-card">
                    <div class="text-sm font-medium text-slate-900 mb-2">${section.title}</div>
                    <ul class="text-xs text-slate-700 space-y-1 list-disc list-inside">
                        ${section.items.map(item => `<li>${item}</li>`).join('')}
                    </ul>
                </div>
            `;
        }
    });

    if (html === '') {
        html = '<div class="text-sm text-slate-500">No coaching feedback available</div>';
    }

    return html;
}

/**
 * Clear current flight
 */
function clearFlight() {
    // Clear renderer
    if (appState.renderer) {
        appState.renderer.clear();
    }

    // Clear altitude chart
    if (appState.altitudeChart) {
        appState.altitudeChart.flightData = null;
        appState.altitudeChart.clearSelection();
    }

    // Clear annotations
    appState.annotations.forEach(ann => {
        if (ann.entity && appState.renderer) {
            appState.renderer.viewer.entities.remove(ann.entity);
        }
    });
    appState.clearAnnotations();
    updateAnnotationsList();

    // Disable annotation mode if active
    if (appState.annotationMode) {
        toggleAnnotationMode();
    }

    // Reset replay state
    resetReplay();

    // Clear state
    appState.clearCurrentAnalysis();

    // Reset UI
    domCache.get(DOM_IDS.fileInput).value = '';
    setVisible(DOM_IDS.loadedFile, false);
    setVisible(DOM_IDS.coachingPanel, false);
    setVisible(DOM_IDS.legendPanel, false);

    // Switch back to Upload tab
    switchToTab(TABS.upload);

    // Reset thermals list selection
    document.querySelectorAll(`.${CSS_CLASSES.thermalItem}`).forEach(t => t.classList.remove(CSS_CLASSES.active));
}

/**
 * Set up bottom bar tabs and controls
 */
function setupBottomBar() {
    // Tab switching
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabName = btn.dataset.tab;
            if (!tabName) return;
            switchToTab(tabName);
        });
    });

    // Collapse/expand bottom bar
    const collapseBtn = domCache.get(DOM_IDS.collapseBtn);
    collapseBtn.addEventListener('click', () => {
        const bottomBar = domCache.get(DOM_IDS.bottomBar);
        const isCollapsed = bottomBar.classList.toggle('collapsed');

        // Update icon direction (up arrow when collapsed to expand, down arrow when expanded to collapse)
        const svg = collapseBtn.querySelector('svg path');
        if (isCollapsed) {
            svg.setAttribute('d', 'M19 9l-7 7-7-7'); // Down arrow (to expand)
        } else {
            svg.setAttribute('d', 'M5 15l7-7 7 7'); // Up arrow (to collapse)
        }

        // Resize altitude chart after collapse/expand
        setTimeout(() => {
            if (appState.altitudeChart) {
                appState.altitudeChart.resizeCanvas();
            }
        }, APP_CONFIG.ui.chartResizeDelayMs);
    });

    // Resize handle for bottom bar height
    setupBottomBarResize();
}

/**
 * Set up bottom bar resize functionality
 */
function setupBottomBarResize() {
    const resizeHandle = domCache.get(DOM_IDS.resizeHandle);
    const bottomBarContent = document.querySelector(`.${CSS_CLASSES.bottomBarContent}`);
    let isResizing = false;
    let startY = 0;
    let startHeight = 0;

    resizeHandle.addEventListener('mousedown', (e) => {
        isResizing = true;
        startY = e.clientY;
        startHeight = bottomBarContent.offsetHeight;
        document.body.style.cursor = 'ns-resize';
        document.body.style.userSelect = 'none';
        e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
        if (!isResizing) return;

        const deltaY = startY - e.clientY;
        const newHeight = clamp(startHeight + deltaY, APP_CONFIG.ui.bottomBarMinHeight, APP_CONFIG.ui.bottomBarMaxHeight);
        bottomBarContent.style.height = newHeight + 'px';

        // Update chart on resize
        if (appState.altitudeChart) {
            appState.altitudeChart.resizeCanvas();
        }
    });

    document.addEventListener('mouseup', () => {
        if (isResizing) {
            isResizing = false;
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        }
    });
}

/**
 * Switch to a specific tab in the bottom bar
 * @param {string} tabName - Name of the tab ('upload', 'info', 'thermals', 'notes')
 */
function switchToTab(tabName) {
    // Update active tab button
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
        if (btn.dataset.tab === tabName) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    // Show corresponding tab content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    const tabId = 'tab' + tabName.charAt(0).toUpperCase() + tabName.slice(1);
    document.getElementById(tabId).classList.add('active');
}

/**
 * Set up compass to show north direction
 */
function setupCompass() {
    if (!appState.renderer) return;

    const compassArrow = document.querySelector('.compass-arrow');
    if (!compassArrow) return;

    let currentRotation = 0;

    // Update compass rotation based on camera heading
    appState.renderer.viewer.camera.changed.addEventListener(() => {
        updateCompass();
    });

    // Also update on scene render for smooth updates
    appState.renderer.viewer.scene.postRender.addEventListener(() => {
        updateCompass();
    });

    function updateCompass() {
        const heading = appState.renderer.viewer.camera.heading;
        // Convert from radians to degrees and invert (compass shows where north is)
        const targetRotation = -Cesium.Math.toDegrees(heading);

        // Calculate the shortest angular difference to avoid jumping at 0/360 boundary
        let diff = targetRotation - currentRotation;

        // Normalize difference to -180 to 180 range
        while (diff > 180) diff -= 360;
        while (diff < -180) diff += 360;

        // Update cumulative rotation
        currentRotation += diff;

        compassArrow.style.transform = `rotate(${currentRotation}deg)`;
    }
}

/**
 * Set up entity click handlers for aircraft marker and annotations
 */
function setupEntityClickHandler() {
    if (!appState.renderer) return;

    const handler = new Cesium.ScreenSpaceEventHandler(appState.renderer.viewer.scene.canvas);

    handler.setInputAction((click) => {
        const pickedObject = appState.renderer.viewer.scene.pick(click.position);

        if (Cesium.defined(pickedObject)) {
            // Check if it's an entity
            if (Cesium.defined(pickedObject.id)) {
                const entity = pickedObject.id;

                // Check if it's the aircraft marker
                if (entity === appState.replay.aircraftEntity) {
                    flyToAircraftMarker();
                    return;
                }

                // Check if it's an annotation
                const annotationIndex = appState.annotations.findIndex(ann => ann.entity === entity);
                if (annotationIndex !== -1) {
                    selectAnnotation(appState.annotations[annotationIndex].id);
                    flyToAnnotation(annotationIndex);
                    switchToTab('notes');
                    return;
                }

                // Check if it's a track segment (static track)
                if (entity.isTrackSegment) {
                    showTrackPointInfo(click.position);
                    return;
                }
            }

            // Check if it's a polyline primitive (replay trail)
            if (pickedObject.primitive && pickedObject.primitive instanceof Cesium.Polyline) {
                showTrackPointInfo(click.position);
                return;
            }
        }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
}

/**
 * Show information about clicked track position
 * @param {Cesium.Cartesian2} screenPosition - Screen position of click
 */
function showTrackPointInfo(screenPosition) {
    if (!appState.hasFlightData() || !appState.renderer) return;

    // Get 3D position from screen position - try pick position first, then globe
    let cartesian = appState.renderer.viewer.scene.pickPosition(screenPosition);

    if (!Cesium.defined(cartesian)) {
        // Fallback to globe pick
        const ray = appState.renderer.viewer.camera.getPickRay(screenPosition);
        cartesian = appState.renderer.viewer.scene.globe.pick(ray, appState.renderer.viewer.scene);
    }

    if (!Cesium.defined(cartesian)) return;

    // Convert to geographic coordinates
    const cartographic = Cesium.Cartographic.fromCartesian(cartesian);
    const clickLon = Cesium.Math.toDegrees(cartographic.longitude);
    const clickLat = Cesium.Math.toDegrees(cartographic.latitude);

    // Find nearest track point
    const points = appState.currentAnalysis.points;
    let nearestIndex = 0;
    let minDistance = Infinity;

    for (let i = 0; i < points.length; i++) {
        const dx = points[i].lon - clickLon;
        const dy = points[i].lat - clickLat;
        const dist = dx * dx + dy * dy;
        if (dist < minDistance) {
            minDistance = dist;
            nearestIndex = i;
        }
    }

    const point = points[nearestIndex];
    const vario = appState.currentAnalysis.vario[nearestIndex];
    const height = appState.currentAnalysis.calculatedHeights
        ? appState.currentAnalysis.calculatedHeights[nearestIndex]
        : point.altM;

    // Show info popup at the actual track point position
    showTrackInfoPopup(point.lon, point.lat, point, vario, height, nearestIndex);
}

/**
 * Show popup with track point information
 */
function showTrackInfoPopup(lon, lat, point, vario, height) {
    // Remove existing popup if any
    if (appState.replay.infoPopupEntity) {
        appState.renderer.removeEntity(appState.replay.infoPopupEntity);
    }

    const labelText = `${formatVario(vario)} | ${formatAltitude(height)} | ${formatTime(point.timeS)}`;
    const entity = appState.renderer.createInfoLabel(lon, lat, height, labelText);
    appState.setInfoPopupEntity(entity);

    // Auto-hide popup
    setTimeout(() => {
        if (appState.replay.infoPopupEntity) {
            appState.renderer.removeEntity(appState.replay.infoPopupEntity);
            appState.setInfoPopupEntity(null);
        }
    }, APP_CONFIG.ui.infoPopupAutoHideMs);
}

/**
 * Fly camera to current aircraft marker position
 */
function flyToAircraftMarker() {
    if (!appState.replay.aircraftEntity || !appState.hasFlightData()) return;

    const pointIndex = appState.replay.currentPointIndex;
    const point = appState.currentAnalysis.points[pointIndex];
    const height = appState.currentAnalysis.calculatedHeights
        ? appState.currentAnalysis.calculatedHeights[pointIndex]
        : point.altM;

    appState.renderer.flyToPosition(point.lon, point.lat, height);
}

/**
 * Set up altitude chart and annotation handlers
 */
function setupChartAndAnnotations() {
    // Annotation buttons
    domCache.get(DOM_IDS.addAnnotationBtn).addEventListener('click', () => {
        toggleAnnotationMode();
    });

    // Setup replay controls
    setupReplayControls();
}

/**
 * Handle altitude chart point click
 * @param {number} pointIndex - Index of clicked point
 * @param {Object} point - Point data
 */
function handleAltitudeChartClick(pointIndex, point) {
    if (!appState.renderer || !appState.hasFlightData()) return;

    // If replay is initialized, seek to the clicked time
    if (appState.replay.totalDuration > 0) {
        const startTime = appState.currentAnalysis.points[0].timeS;
        const clickedTime = point.timeS - startTime;
        seekReplay(clickedTime);

        // Clear the altitude chart's selected point (we're using replay indicator)
        if (appState.altitudeChart) {
            appState.altitudeChart.selectedPoint = null;
        }
        return;
    }

    // Fallback: fly to point if replay not active
    const height = appState.currentAnalysis.calculatedHeights && appState.currentAnalysis.calculatedHeights[pointIndex]
        ? appState.currentAnalysis.calculatedHeights[pointIndex]
        : point.altM;

    appState.renderer.flyToPosition(point.lon, point.lat, height);
}

/**
 * Toggle annotation mode
 */
function toggleAnnotationMode() {
    const newMode = appState.toggleAnnotationMode();
    const btn = domCache.get(DOM_IDS.addAnnotationBtn);

    if (newMode) {
        btn.textContent = BUTTON_TEXT.annotationMode.active;
        btn.classList.add('bg-green-500');
        btn.classList.remove('bg-orange-500');

        // Enable click handler on Cesium viewer
        enableAnnotationClick();
    } else {
        btn.classList.remove('bg-green-500');

        // Disable click handler
        disableAnnotationClick();
    }
}

/**
 * Enable annotation click handler
 */
function enableAnnotationClick() {
    if (!appState.renderer) return;

    const handler = new Cesium.ScreenSpaceEventHandler(appState.renderer.viewer.scene.canvas);
    appState.setAnnotationClickHandler(handler);

    handler.setInputAction((click) => {
        // Try to pick a 3D position in the scene (works with elevated features)
        const cartesian = appState.renderer.viewer.scene.pickPosition(click.position);

        if (Cesium.defined(cartesian)) {
            const cartographic = Cesium.Cartographic.fromCartesian(cartesian);
            const lon = Cesium.Math.toDegrees(cartographic.longitude);
            const lat = Cesium.Math.toDegrees(cartographic.latitude);

            // Find closest point on track
            const closestPoint = findClosestPointOnTrack(lat, lon);

            if (closestPoint) {
                promptForAnnotation(closestPoint);
            }
        } else {
            // Fallback to ellipsoid picking if pickPosition fails
            const ellipsoidCartesian = appState.renderer.viewer.camera.pickEllipsoid(
                click.position,
                appState.renderer.viewer.scene.globe.ellipsoid
            );

            if (ellipsoidCartesian) {
                const cartographic = Cesium.Cartographic.fromCartesian(ellipsoidCartesian);
                const lon = Cesium.Math.toDegrees(cartographic.longitude);
                const lat = Cesium.Math.toDegrees(cartographic.latitude);

                const closestPoint = findClosestPointOnTrack(lat, lon);
                if (closestPoint) {
                    promptForAnnotation(closestPoint);
                }
            }
        }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
}

/**
 * Disable annotation click handler
 */
function disableAnnotationClick() {
    appState.clearAnnotationClickHandler();
}

/**
 * Find closest point on flight track
 * @param {number} lat - Click latitude
 * @param {number} lon - Click longitude
 * @returns {Object|null} - Closest point with index, or null if too far from track
 */
function findClosestPointOnTrack(lat, lon) {
    if (!appState.hasFlightData()) return null;

    const points = appState.currentAnalysis.points;
    let minDist = Infinity;
    let closestIdx = 0;

    // Only search within visible track (up to current replay position)
    const maxIndex = appState.replay.currentPointIndex || points.length - 1;

    for (let i = 0; i <= maxIndex; i++) {
        const point = points[i];
        const dist = Math.sqrt(
            Math.pow(point.lat - lat, 2) +
            Math.pow(point.lon - lon, 2)
        );

        if (dist < minDist) {
            minDist = dist;
            closestIdx = i;
        }
    }

    // Check if click is close enough to the track
    // ~0.0003 degrees ≈ 30 meters at equator
    const maxDistance = APP_CONFIG.interaction.clickToleranceDegrees;

    if (minDist > maxDistance) {
        return null; // Too far from track
    }

    return {
        index: closestIdx,
        point: points[closestIdx]
    };
}

/**
 * Prompt for annotation text
 * @param {Object} pointData - Point data with index and point
 */
function promptForAnnotation(pointData) {
    const text = prompt('Enter annotation:');

    if (text && text.trim()) {
        addAnnotation(pointData.index, pointData.point, text.trim());
        toggleAnnotationMode(); // Exit annotation mode
    }
}

/**
 * Add annotation to the flight
 * @param {number} index - Point index
 * @param {Object} point - Point data
 * @param {string} text - Annotation text
 */
function addAnnotation(index, point, text) {
    const annotation = {
        id: Date.now(),
        index,
        point,
        text,
        timestamp: new Date().toISOString()
    };

    appState.addAnnotation(annotation);

    // Add marker to 3D map
    addAnnotationMarker(annotation);

    // Update annotations list
    updateAnnotationsList();

    // Update altitude chart with annotation markers
    if (appState.altitudeChart) {
        appState.altitudeChart.setAnnotations(appState.annotations);
    }

    // Switch to Notes tab to show the new annotation
    switchToTab(TABS.notes);
}

function makeAnnotationBadge(text, color) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const font = 'bold 14px sans-serif';
  const padX = 10, padY = 10, radius = 3;

  ctx.font = font;
  const w = Math.ceil(ctx.measureText(text).width);
  const h = 14; // font size
  canvas.width = w + padX * 2;
  canvas.height = h + padY * 2;

  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(0, 0, canvas.width, canvas.height, radius); // supported in modern browsers
  ctx.fill();

  ctx.font = font;
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);

  return canvas;
}

/**
 * Add annotation marker to 3D map
 * @param {Object} annotation - Annotation data
 */
function addAnnotationMarker(annotation) {
    if (!appState.renderer) return;

    // Use terrain-sampled height if available for proper positioning
    let markerHeight = annotation.point.altM;
    const analysis = appState.currentAnalysis;
    if (analysis && analysis.calculatedHeights) {
        markerHeight = analysis.calculatedHeights[annotation.index] || annotation.point.altM;
    }

    // Brand color - orange accent
    const markerColor = APP_CONFIG.colors.primaryLight;
    const text = truncateText(annotation.text, APP_CONFIG.ui.annotationMaxTextLength);
    const badge = makeAnnotationBadge(text, markerColor);

    const entity = appState.renderer.createPointMarker(
        annotation.point.lon,
        annotation.point.lat,
        markerHeight,
        {
            name: `Annotation ${annotation.id}`,
            color: markerColor,
            billboard: badge
        }
    );

    annotation.entity = entity;
}

/**
 * Update annotations list UI
 */
function updateAnnotationsList() {
    const container = domCache.get(DOM_IDS.annotationsList);

    // Keep the add card and append annotations after it
    const addCardHTML = `
        <div id="${DOM_IDS.addAnnotationCard}" class="${CSS_CLASSES.annotationCard} ${CSS_CLASSES.addCard}">
            <button id="${DOM_IDS.addAnnotationBtn}" class="add-annotation-btn">
                <svg class="h-6 w-6 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${SVG_PATHS.plus}"/>
                </svg>
                <span class="text-xs font-medium text-slate-600 mt-1">${BUTTON_TEXT.annotationMode.inactive}</span>
            </button>
        </div>
    `;

    const annotationsHTML = appState.annotations.map((ann, i) => `
        <div class="${CSS_CLASSES.annotationCard} ${appState.selectedAnnotationId === ann.id ? CSS_CLASSES.selected : ''}"
             ${DATA_ATTRS.annotationId}="${ann.id}"
             onclick="selectAnnotation(${ann.id}); flyToAnnotation(${i})">
            <div class="flex items-start justify-between">
                <div class="flex-1">
                    <div class="text-xs font-medium text-slate-900">${ann.text}</div>
                    <div class="text-xs text-slate-500 mt-1">
                        ${formatTime(ann.point.timeS)} | ${formatAltitude(ann.point.altM)}
                    </div>
                </div>
                <button onclick="deleteAnnotation(${i}); event.stopPropagation();" class="text-slate-400 hover:text-red-500">
                    <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${SVG_PATHS.close}" />
                    </svg>
                </button>
            </div>
        </div>
    `).join('');

    container.innerHTML = addCardHTML + annotationsHTML;

    // Re-attach event listener for the new add button (clears cache for this element)
    domCache.clear(DOM_IDS.addAnnotationBtn);
    domCache.get(DOM_IDS.addAnnotationBtn).addEventListener('click', () => {
        toggleAnnotationMode();
    });
}

/**
 * Select an annotation and highlight it in both views
 * @param {number} annotationId - Annotation ID
 */
function selectAnnotation(annotationId) {
    appState.selectedAnnotationId = annotationId;

    // Update highlight in bottom bar list
    const cards = document.querySelectorAll('.annotation-card[data-annotation-id]');
    cards.forEach(card => {
        const cardId = parseInt(card.dataset.annotationId);
        if (cardId === annotationId) {
            card.classList.add('selected');
        } else {
            card.classList.remove('selected');
        }
    });
}

/**
 * Clear annotation selection
 */
function clearAnnotationSelection() {
    appState.selectedAnnotationId = null;

    // Remove highlight from all cards
    const cards = document.querySelectorAll('.annotation-card[data-annotation-id]');
    cards.forEach(card => {
        card.classList.remove('selected');
    });
}

/**
 * Fly camera to annotation
 * @param {number} index - Annotation index
 */
function flyToAnnotation(index) {
    const annotation = appState.annotations[index];
    if (!annotation || !appState.renderer) return;

    // Use terrain-sampled height if available
    let height = annotation.point.altM;
    if (appState.currentAnalysis && appState.currentAnalysis.calculatedHeights) {
        height = appState.currentAnalysis.calculatedHeights[annotation.index] || annotation.point.altM;
    }

    appState.renderer.flyToPosition(annotation.point.lon, annotation.point.lat, height, {
        onComplete: () => {
            // Select the entity after flight completes
            appState.renderer.viewer.selectedEntity = annotation.entity;
        }
    });
}

/**
 * Delete annotation
 * @param {number} index - Annotation index
 */
function deleteAnnotation(index) {
    const annotation = appState.annotations[index];

    if (annotation && annotation.entity) {
        appState.renderer.viewer.entities.remove(annotation.entity);
    }

    appState.annotations.splice(index, 1);
    updateAnnotationsList();

    // Update altitude chart
    if (appState.altitudeChart) {
        appState.altitudeChart.setAnnotations(appState.annotations);
    }

    // Clear selection if we deleted the selected annotation
    if (appState.selectedAnnotationId === annotation.id) {
        clearAnnotationSelection();
    }
}

// ========================================
// REPLAY CONTROLS
// ========================================

/**
 * Set up replay control event handlers
 */
function setupReplayControls() {
    domCache.get(DOM_IDS.replayPlayBtn).addEventListener('click', toggleReplayPlayback);

    domCache.get(DOM_IDS.replayResetBtn).addEventListener('click', () => {
        seekReplay(0);
        if (appState.replay.isPlaying) {
            toggleReplayPlayback();
        }
    });

    domCache.get(DOM_IDS.replayEndBtn).addEventListener('click', () => {
        if (appState.replay.totalDuration > 0) {
            seekReplay(appState.replay.totalDuration);
            if (appState.replay.isPlaying) {
                toggleReplayPlayback();
            }
        }
    });

    domCache.get(DOM_IDS.replaySpeed).addEventListener('change', (e) => {
        appState.replay.speed = parseFloat(e.target.value);
    });

    const timeline = domCache.get(DOM_IDS.replayTimeline);
    let isDragging = false;

    timeline.addEventListener('mousedown', (e) => {
        isDragging = true;
        handleTimelineScrub(e);
    });

    document.addEventListener('mousemove', (e) => {
        if (isDragging) {
            handleTimelineScrub(e);
        }
    });

    document.addEventListener('mouseup', () => {
        isDragging = false;
    });

    // Click on timeline
    timeline.addEventListener('click', handleTimelineScrub);
}

/**
 * Handle timeline scrubbing
 * @param {MouseEvent} e - Mouse event
 */
function handleTimelineScrub(e) {
    const timeline = domCache.get(DOM_IDS.replayTimeline);
    const rect = timeline.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, x / rect.width));
    const newTime = percentage * appState.replay.totalDuration;
    seekReplay(newTime);
}

/**
 * Initialize replay for a flight
 * @param {Object} analysis - Flight analysis data
 */
function initializeReplay(analysis) {
    if (!analysis || !analysis.points || analysis.points.length === 0) return;

    // Calculate total duration
    const points = analysis.points;
    appState.replay.totalDuration = points[points.length - 1].timeS - points[0].timeS;
    appState.replay.currentTime = 0;
    appState.replay.currentPointIndex = 0;
    appState.replay.isPlaying = false;

    // Compute interpolated points for smooth replay trail
    const heights = analysis.calculatedHeights || points.map(p => p.altM);
    const interpolated = appState.renderer.interpolateTrack(points, heights, analysis.vario, appState.replay.interpolationFactor);
    appState.replay.interpolatedPoints = interpolated.points;
    appState.replay.interpolatedHeights = interpolated.heights;
    appState.replay.interpolatedVario = interpolated.vario;

    // Hide all original track segments - we'll show the replay trail instead
    appState.renderer.flightEntities.forEach(entity => {
        if (entity.isTrackSegment) {
            entity.show = false;
        }
    });

    // Reset initial camera range - will be captured when play is first pressed
    appState.replay.initialCameraRange = null;

    // Create aircraft marker
    createAircraftMarker();

    // Create trail entity with CallbackProperty for dynamic positions
    createReplayTrailEntity();

    // Update UI
    updateReplayUI();
    updateTrackVisibility();
}

/**
 * Create replay trail entity using PolylineCollection for performance
 */
function createReplayTrailEntity() {
    if (!appState.renderer) return;

    // Remove old trail if exists
    clearReplayTrail();

    // Pre-calculate color segments from interpolated data
    const interpPoints = appState.replay.interpolatedPoints;
    const interpVario = appState.replay.interpolatedVario;

    if (!interpPoints || interpPoints.length === 0) {
        return;
    }

    // Group interpolated points by color
    const segments = [];
    let currentColor = null;
    let segmentStart = 0;

    for (let i = 0; i < interpPoints.length; i++) {
        const color = appState.renderer.getColorFromVario(interpVario[i]);

        if (currentColor === null) {
            currentColor = color;
            segmentStart = i;
        } else if (!color.equals(currentColor)) {
            segments.push({
                startIdx: segmentStart,
                endIdx: i,
                color: currentColor
            });
            currentColor = color;
            segmentStart = i;
        }
    }
    if (segmentStart < interpPoints.length) {
        segments.push({
            startIdx: segmentStart,
            endIdx: interpPoints.length - 1,
            color: currentColor
        });
    }

    appState.replay.colorSegments = segments;

    // Create a PolylineCollection for performant rendering
    appState.replay.trailCollection = new Cesium.PolylineCollection();
    appState.renderer.viewer.scene.primitives.add(appState.replay.trailCollection);

    // Pre-create all polylines (initially with minimal positions)
    appState.replay.trailPolylines = segments.map(seg => {
        return appState.replay.trailCollection.add({
            positions: [], // Will be updated during playback
            width: 3,
            material: Cesium.Material.fromType('Color', {
                color: seg.color
            }),
            show: false
        });
    });
}

/**
 * Update trail polylines based on current replay position
 */
function updateTrailPolylines() {
    if (!appState.replay.trailCollection || !appState.hasFlightData()) return;

    const interpPoints = appState.replay.interpolatedPoints;
    const interpHeights = appState.replay.interpolatedHeights;

    if (!interpPoints || interpPoints.length === 0) return;

    const factor = appState.replay.interpolationFactor + 1;
    const currentInterpIndex = Math.min(
        appState.replay.currentPointIndex * factor,
        interpPoints.length - 1
    );

    // Update each segment's polyline
    appState.replay.colorSegments.forEach((seg, idx) => {
        const polyline = appState.replay.trailPolylines[idx];

        if (currentInterpIndex < seg.startIdx) {
            // Haven't reached this segment yet
            polyline.show = false;
        } else {
            // Calculate visible portion
            const visibleEnd = Math.min(seg.endIdx, currentInterpIndex);
            const positions = [];

            for (let i = seg.startIdx; i <= visibleEnd; i++) {
                const p = interpPoints[i];
                positions.push(Cesium.Cartesian3.fromDegrees(p.lon, p.lat, interpHeights[i]));
            }

            if (positions.length >= 2) {
                polyline.positions = positions;
                polyline.show = true;
            } else {
                polyline.show = false;
            }
        }
    });
}

/**
 * Create aircraft position marker
 */
function createAircraftMarker() {
    if (!appState.renderer || !appState.hasFlightData()) return;

    // Remove existing marker
    if (appState.replay.aircraftEntity) {
        appState.renderer.viewer.entities.remove(appState.replay.aircraftEntity);
    }

    // Get initial position
    const startPoint = appState.currentAnalysis.points[0];
    const startHeight = appState.currentAnalysis.calculatedHeights
        ? appState.currentAnalysis.calculatedHeights[0]
        : startPoint.altM;

    // Pilot name (placeholder - could be extracted from IGC header)
    const pilotName = appState.currentAnalysis.pilotName || 'Pilot';

    // Create vertical ribbon marker with arrow
    appState.replay.aircraftEntity = appState.renderer.viewer.entities.add({
        name: 'Aircraft Position',
        position: Cesium.Cartesian3.fromDegrees(startPoint.lon, startPoint.lat, startHeight),
        billboard: {
            image: createRibbonMarker(pilotName),
            verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
            horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
            scaleByDistance: new Cesium.NearFarScalar(100, 1.0, 3000, 0.5)
        }
    });
}

/**
 * Create a vertical ribbon marker with pilot name and arrow
 * @param {string} pilotName - Name of the pilot
 * @returns {HTMLCanvasElement} - Canvas with ribbon marker
 */
function createRibbonMarker(pilotName) {
    const canvas = document.createElement('canvas');
    const ribbonWidth = APP_CONFIG.markers.aircraftRibbonWidth;
    const ribbonHeight = APP_CONFIG.markers.aircraftRibbonHeight;
    const arrowHeight = APP_CONFIG.markers.aircraftArrowHeight;

    const width = ribbonWidth;
    const height = ribbonHeight + arrowHeight;

    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, width, height);
    ctx.globalAlpha = 0.8;

    const ribbonColor = APP_CONFIG.colors.primary;
    const textColor = '#ffffff';

    // Draw vertical ribbon
    const ribbonX = (width - ribbonWidth) / 2;
    const ribbonTop = 0;

    // Ribbon background
    ctx.fillStyle = ribbonColor;
    ctx.beginPath();
    ctx.roundRect(ribbonX, ribbonTop, ribbonWidth, ribbonHeight, 6);
    ctx.fill();

    // White border
    ctx.strokeStyle = textColor;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Pilot name (vertical text)
    ctx.save();
    ctx.fillStyle = textColor;
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Rotate and draw text vertically
    ctx.translate(width / 2, ribbonTop + ribbonHeight / 2);
    ctx.rotate(-Math.PI / 2);

    // Truncate name if too long
    const displayName = truncateText(pilotName, APP_CONFIG.markers.pilotNameMaxLength).replace('...', '');
    ctx.fillText(displayName, 0, 0);
    ctx.restore();

    // Draw arrow pointing down
    const arrowTop = ribbonTop + ribbonHeight;

    ctx.fillStyle = ribbonColor;
    ctx.beginPath();
    ctx.moveTo(width / 2, arrowTop + arrowHeight); // Tip
    ctx.lineTo(ribbonX, arrowTop); // Left
    ctx.lineTo(ribbonX + ribbonWidth, arrowTop); // Right
    ctx.closePath();
    ctx.fill();

    // Arrow border
    ctx.strokeStyle = textColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(ribbonX, arrowTop);
    ctx.lineTo(width / 2, arrowTop + arrowHeight);
    ctx.lineTo(ribbonX + ribbonWidth, arrowTop);
    ctx.stroke();

    return canvas;
}

/**
 * Toggle replay playback (play/pause)
 */
function toggleReplayPlayback() {
    appState.replay.isPlaying = !appState.replay.isPlaying;

    if (appState.replay.isPlaying) {
        // Initialize orbit center on first play
        if (!appState.renderer.orbitCenter && appState.renderer && appState.replay.aircraftEntity) {
            const aircraftPos = appState.replay.aircraftEntity.position.getValue(Cesium.JulianDate.now());
            if (aircraftPos) {
                appState.renderer.orbitCenter = aircraftPos;
            }
        }

        setVisible(DOM_IDS.playIcon, false);
        setVisible(DOM_IDS.pauseIcon, true);
        appState.replay.lastFrameTime = performance.now();
        replayAnimationLoop();
    } else {
        setVisible(DOM_IDS.playIcon, true);
        setVisible(DOM_IDS.pauseIcon, false);
        if (appState.replay.animationFrameId) {
            cancelAnimationFrame(appState.replay.animationFrameId);
            appState.replay.animationFrameId = null;
        }
    }
}

/**
 * Main replay animation loop
 */
function replayAnimationLoop() {
    if (!appState.replay.isPlaying) return;

    const now = performance.now();
    const deltaTime = (now - appState.replay.lastFrameTime) / 1000; // Convert to seconds
    appState.replay.lastFrameTime = now;

    // Advance time based on speed
    appState.replay.currentTime += deltaTime * appState.replay.speed;

    // Check if reached end
    if (appState.replay.currentTime >= appState.replay.totalDuration) {
        appState.replay.currentTime = appState.replay.totalDuration;
        toggleReplayPlayback(); // Pause at end
    }

    // Update everything
    updateReplayUI();
    updateAircraftPosition();
    updateTrackVisibility();

    // Continue loop
    if (appState.replay.isPlaying) {
        appState.replay.animationFrameId = requestAnimationFrame(replayAnimationLoop);
    }
}

/**
 * Seek to a specific time in the replay
 * @param {number} time - Time in seconds
 */
function seekReplay(time) {
    appState.replay.currentTime = Math.max(0, Math.min(time, appState.replay.totalDuration));
    updateReplayUI();
    updateAircraftPosition();
    updateTrackVisibility();
}

/**
 * Reset replay to initial state
 */
function resetReplay() {
    // Stop playback
    if (appState.replay.isPlaying) {
        toggleReplayPlayback();
    }

    // Cancel animation frame
    if (appState.replay.animationFrameId) {
        cancelAnimationFrame(appState.replay.animationFrameId);
        appState.replay.animationFrameId = null;
    }

    // Remove aircraft marker
    if (appState.replay.aircraftEntity && appState.renderer) {
        appState.renderer.viewer.entities.remove(appState.replay.aircraftEntity);
        appState.replay.aircraftEntity = null;
    }

    // Clear replay trail and show original track
    clearReplayTrail();
    if (appState.renderer) {
        appState.renderer.flightEntities.forEach(entity => {
            if (entity.isTrackSegment) {
                entity.show = true;
            }
        });
    }

    // Clear altitude chart replay position
    if (appState.altitudeChart) {
        appState.altitudeChart.clearReplayPosition();
    }

    // Reset state
    appState.replay.currentTime = 0;
    appState.replay.totalDuration = 0;
    appState.replay.currentPointIndex = 0;
    appState.replay.isPlaying = false;

    // Reset UI
    setVisible(DOM_IDS.playIcon, true);
    setVisible(DOM_IDS.pauseIcon, false);
    updateReplayUI();
}

/**
 * Update replay UI (progress bar and time display)
 */
function updateReplayUI() {
    const progress = appState.replay.totalDuration > 0
        ? (appState.replay.currentTime / appState.replay.totalDuration) * 100
        : 0;

    domCache.get(DOM_IDS.replayProgress).style.width = `${progress}%`;
    domCache.get(DOM_IDS.replayHandle).style.left = `${progress}%`;

    const currentTimeStr = formatReplayTime(appState.replay.currentTime);
    const totalTimeStr = formatReplayTime(appState.replay.totalDuration);
    domCache.get(DOM_IDS.replayTime).textContent = `${currentTimeStr} / ${totalTimeStr}`;
}

/**
 * Update aircraft marker position based on current time
 */
function updateAircraftPosition() {
    if (!appState.replay.aircraftEntity || !appState.hasFlightData()) return;

    const points = appState.currentAnalysis.points;
    const startTime = points[0].timeS;
    const currentAbsTime = startTime + appState.replay.currentTime;

    // Find the two points surrounding the current time
    let prevIndex = 0;
    for (let i = 0; i < points.length - 1; i++) {
        if (points[i].timeS <= currentAbsTime && points[i + 1].timeS > currentAbsTime) {
            prevIndex = i;
            break;
        }
        if (i === points.length - 2) {
            prevIndex = points.length - 1;
        }
    }

    const nextIndex = Math.min(prevIndex + 1, points.length - 1);

    // Interpolate position
    let lon, lat, alt;

    if (prevIndex === nextIndex) {
        // At the last point
        lon = points[prevIndex].lon;
        lat = points[prevIndex].lat;
        alt = appState.currentAnalysis.calculatedHeights
            ? appState.currentAnalysis.calculatedHeights[prevIndex]
            : points[prevIndex].altM;
    } else {
        // Linear interpolation between points
        const t1 = points[prevIndex].timeS;
        const t2 = points[nextIndex].timeS;
        const t = (currentAbsTime - t1) / (t2 - t1);

        lon = points[prevIndex].lon + t * (points[nextIndex].lon - points[prevIndex].lon);
        lat = points[prevIndex].lat + t * (points[nextIndex].lat - points[prevIndex].lat);

        const alt1 = appState.currentAnalysis.calculatedHeights
            ? appState.currentAnalysis.calculatedHeights[prevIndex]
            : points[prevIndex].altM;
        const alt2 = appState.currentAnalysis.calculatedHeights
            ? appState.currentAnalysis.calculatedHeights[nextIndex]
            : points[nextIndex].altM;
        alt = alt1 + t * (alt2 - alt1);
    }

    // Update marker position
    appState.replay.aircraftEntity.position = Cesium.Cartesian3.fromDegrees(lon, lat, alt);

    // Update altitude chart replay position
    if (appState.altitudeChart) {
        appState.altitudeChart.setReplayPosition(prevIndex);
    }

    // Update annotation visibility based on current replay position
    updateAnnotationVisibility(prevIndex);

    // Follow aircraft with camera (if no thermal is selected)
    if (appState.selectedThermalIndex === -1 && appState.renderer && appState.renderer.orbitCenter) {
        appState.renderer.followPosition(lon, lat, alt);
    }
}

/**
 * Update annotation visibility based on replay position
 * Annotations are only shown when replay has reached their time
 * @param {number} currentIndex - Current replay point index
 */
function updateAnnotationVisibility(currentIndex) {
    appState.annotations.forEach(annotation => {
        if (annotation.entity) {
            // Show annotation only if replay has reached or passed its point
            const shouldShow = currentIndex >= annotation.index;
            annotation.entity.show = shouldShow;
        }
    });
}

/**
 * Update track visibility based on current replay time
 * Shows only the portion of the track up to the current time
 */
function updateTrackVisibility() {
    if (!appState.renderer || !appState.hasFlightData()) return;

    const points = appState.currentAnalysis.points;
    const startTime = points[0].timeS;
    const currentAbsTime = startTime + appState.replay.currentTime;

    // Find the current point index
    let currentPointIndex = 0;
    for (let i = 0; i < points.length; i++) {
        if (points[i].timeS <= currentAbsTime) {
            currentPointIndex = i;
        } else {
            break;
        }
    }

    // Store current point index for use by other functions
    appState.replay.currentPointIndex = currentPointIndex;

    // Build the entire trail dynamically from original points
    // This gives smooth, continuous trail without gaps
    updateDynamicTrail(currentPointIndex);

    // Force Cesium to render immediately
    appState.renderer.viewer.scene.requestRender();
}

/**
 * Update the dynamic trail polyline to show track up to current position
 */
function updateDynamicTrail(currentPointIndex) {
    // Ensure trail collection exists
    if (!appState.replay.trailCollection && currentPointIndex > 0) {
        createReplayTrailEntity();
    }
    // Update the polyline positions based on current time
    updateTrailPolylines();
}

/**
 * Clear all replay trail segments
 */
function clearReplayTrail() {
    if (!appState.renderer) return;

    // Remove the PolylineCollection (performant rendering)
    if (appState.replay.trailCollection) {
        appState.renderer.viewer.scene.primitives.remove(appState.replay.trailCollection);
        appState.replay.trailCollection = null;
        appState.replay.trailPolylines = [];
        appState.replay.colorSegments = [];
    }

    // Remove the single trail entity (fallback)
    if (appState.replay.trailEntity) {
        appState.renderer.viewer.entities.remove(appState.replay.trailEntity);
        appState.replay.trailEntity = null;
    }

    // Remove all segment entities (old approach)
    if (appState.replay.trailSegments && appState.replay.trailSegments.length > 0) {
        appState.replay.trailSegments.forEach(entity => {
            appState.renderer.viewer.entities.remove(entity);
        });
        appState.replay.trailSegments = [];
    }

    // Remove any other replay trail entities (cleanup)
    const toRemove = [];
    appState.renderer.viewer.entities.values.forEach(entity => {
        if (entity.isReplayTrail) {
            toRemove.push(entity);
        }
    });
    toRemove.forEach(entity => appState.renderer.viewer.entities.remove(entity));
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}
