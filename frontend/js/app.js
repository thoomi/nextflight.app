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

        // Set up walkthrough listeners
        setupWalkthroughListeners();

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

        const loadedTrack = await loadAnalyzerSampleTrack(sampleUrl);
        console.log(`Parsed ${loadedTrack.points.length} track points`);
        console.log('Flight analysis complete:', loadedTrack.analysis);

        await showLoadedAnalysis({
            analysis: loadedTrack.analysis,
            displayName: `${loadedTrack.fileName} (auto-loaded)`
        });

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

        const loadedTrack = await loadAnalyzerUploadedFile(file);
        console.log(`Parsed ${loadedTrack.points.length} track points`);
        console.log('Flight analysis complete:', loadedTrack.analysis);

        await showLoadedAnalysis({
            analysis: loadedTrack.analysis,
            displayName: loadedTrack.fileName
        });

    } catch (error) {
        console.error('Error processing file:', error);
        setVisible(DOM_IDS.uploadStatus, false);
        alert(ERROR_MESSAGES.fileProcessing(error.message));
    }
}

/**
 * Render loaded analysis and reveal analyzer UI.
 * @param {Object} loaded - Loaded analysis data
 * @param {Object} loaded.analysis - Flight analysis data
 * @param {string} loaded.displayName - Display name for loaded file
 */
async function showLoadedAnalysis({ analysis, displayName }) {
    appState.setCurrentAnalysis(analysis);

    // Render visualization (async - waits for terrain sampling)
    await appState.renderer.render(analysis);

    // Hide loading, show file info
    setVisible(DOM_IDS.uploadStatus, false);
    setVisible(DOM_IDS.loadedFile, true);
    domCache.get(DOM_IDS.fileName).textContent = displayName;

    // Show floating panels
    setVisible(DOM_IDS.legendPanel, true);

    // Switch to Chart tab after loading
    switchToTab(TABS.chart);

    // Ensure bottom bar is expanded
    domCache.get(DOM_IDS.bottomBar).classList.remove(CSS_CLASSES.collapsed);

    // Update UI after panels are visible
    updateMetricsPanel(analysis);
    updateCoachingPanel(analysis);

    // Hide empty states when data is loaded
    const chartEmptyState = document.getElementById('chartEmptyState');
    if (chartEmptyState) chartEmptyState.style.display = 'none';
    initializeReplay(analysis);

    // Update altitude chart (after panel is visible so canvas has dimensions)
    setTimeout(() => {
        appState.altitudeChart.resizeCanvas();
        appState.altitudeChart.setData(analysis);
    }, APP_CONFIG.ui.chartInitDelayMs);
}

/**
 * Update metrics panel with flight data
 * @param {Object} analysis - Flight analysis data
 */
function updateMetricsPanel(analysis) {
    renderMetricsPanel({
        analysis,
        domCache,
        ids: DOM_IDS,
        formatters: {
            formatAltitude,
            formatDistance,
            formatGlideRatio,
            formatSpeed,
            formatTime,
            formatTurnRate,
            formatVario
        }
    });

    // Update detail tabs
    updateThermalsList(analysis.segments);
    updateGlidesList(analysis.glides || []);
}

/**
 * Update thermals list
 * @param {Array<ThermalSegment>} thermals - Array of thermal segments
 */
function updateThermalsList(thermals) {
    renderThermalsList({
        thermals,
        container: domCache.get(DOM_IDS.thermalsContainer),
        cssClasses: CSS_CLASSES,
        formatters: { formatVario },
        onClearSelection: clearThermalSelection,
        onMouseEnter: highlightThermalTrack,
        onMouseLeave: () => {
            appState.hasThermalSelected() ? highlightThermalTrack(appState.selectedThermalIndex) : unhighlightThermalTrack();
        },
        onSelect: (thermal, index) => {
            selectThermal(index);
            flyToThermal(thermal);
        }
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
 * Update glides list
 * @param {Array<GlideSegment>} glides - Array of glide segments
 */
function updateGlidesList(glides) {
    renderGlidesList({
        glides,
        container: domCache.get(DOM_IDS.glidesContainer),
        cssClasses: CSS_CLASSES,
        formatters: { formatTime, formatVario },
        onClearSelection: clearGlideSelection,
        onMouseEnter: highlightGlideTrack,
        onMouseLeave: () => {
            appState.selectedGlideIndex !== null ? highlightGlideTrack(appState.selectedGlideIndex) : unhighlightGlideTrack();
        },
        onSelect: (glide, index) => {
            selectGlide(index);
            flyToGlide(glide);
        }
    });
}

/**
 * Select a glide and persist highlighting
 * @param {number} index - Glide index
 */
function selectGlide(index) {
    appState.selectedGlideIndex = index;
    highlightGlideTrack(index);

    // Update visual selection in list
    document.querySelectorAll(`[data-glide-index]`).forEach(t => t.classList.remove(CSS_CLASSES.active));
    const selectedItem = document.querySelector(`[data-glide-index="${index}"]`);
    if (selectedItem) {
        selectedItem.classList.add(CSS_CLASSES.active);
    }
}

/**
 * Clear glide selection
 */
function clearGlideSelection() {
    appState.selectedGlideIndex = null;
    unhighlightGlideTrack();

    // Remove visual selection
    document.querySelectorAll(`[data-glide-index]`).forEach(t => t.classList.remove(CSS_CLASSES.active));

    // Fly to current replay position
    if (appState.hasFlightData()) {
        const pointIndex = appState.replay.currentPointIndex || 0;
        const point = appState.currentAnalysis.points[pointIndex];
        const height = appState.currentAnalysis.calculatedHeights?.[pointIndex] || point.altM;

        appState.renderer.flyToPosition(point.lon, point.lat, height);
    }
}

/**
 * Fly camera to glide
 * @param {GlideSegment} glide - Glide segment
 */
function flyToGlide(glide) {
    if (!appState.hasFlightData()) return;

    const points = appState.currentAnalysis.points;

    // If replay hasn't reached this glide yet, jump to the end of the glide
    if (appState.replay.totalDuration > 0 && appState.replay.currentPointIndex < glide.endIdx) {
        const glideEndTime = points[glide.endIdx].timeS - points[0].timeS;
        seekReplay(glideEndTime);
    }

    // Calculate bounding box of glide
    let minLat = Infinity, maxLat = -Infinity;
    let minLon = Infinity, maxLon = -Infinity;
    let minAlt = Infinity, maxAlt = -Infinity;

    for (let i = glide.startIdx; i <= glide.endIdx; i++) {
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
 * Highlight glide track on the 3D map
 * @param {number} index - Glide index
 */
function highlightGlideTrack(index) {
    if (!appState.renderer) return;

    if (appState.replay.trailCollection && appState.replay.trailPolylines.length > 0) {
        updateTrailGlideHighlight(index);
    } else {
        appState.renderer.highlightGlide(index);
    }
}

/**
 * Remove glide track highlighting
 */
function unhighlightGlideTrack() {
    if (!appState.renderer) return;

    if (appState.replay.trailCollection && appState.replay.trailPolylines.length > 0) {
        updateTrailGlideHighlight(-1);
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
 * Update trail colors for glide highlighting during replay
 * @param {number} glideIndex - Glide index to highlight (-1 for no highlight)
 */
function updateTrailGlideHighlight(glideIndex) {
    if (!appState.replay.trailPolylines || !appState.hasFlightData()) return;

    const glides = appState.currentAnalysis.glides;
    if (!glides || glides.length === 0) return;

    const interpVario = appState.replay.interpolatedVario;
    const factor = appState.replay.interpolationFactor + 1;

    // Map which interpolated indices belong to which glide
    const interpToGlide = new Array(interpVario.length).fill(-1);
    glides.forEach((glide, idx) => {
        const startInterp = glide.startIdx * factor;
        const endInterp = Math.min(glide.endIdx * factor + factor, interpVario.length - 1);
        for (let i = startInterp; i <= endInterp; i++) {
            interpToGlide[i] = idx;
        }
    });

    // Update each polyline's color based on whether it's in the highlighted glide
    appState.replay.colorSegments.forEach((seg, idx) => {
        const polyline = appState.replay.trailPolylines[idx];

        // Check if this segment belongs to the highlighted glide
        const segGlideIdx = interpToGlide[seg.startIdx];

        if (glideIndex === -1) {
            // No highlight - restore original color and width
            polyline.material = Cesium.Material.fromType('Color', {
                color: seg.color
            });
            polyline.width = 3;
        } else if (segGlideIdx === glideIndex) {
            // This segment is in the highlighted glide - show bright
            polyline.material = Cesium.Material.fromType('Color', {
                color: seg.color
            });
            polyline.width = 5;
        } else {
            // Not in highlighted glide - show grayed out
            polyline.material = Cesium.Material.fromType('Color', {
                color: Cesium.Color.GRAY.withAlpha(0.4)
            });
            polyline.width = 2;
        }
    });
}

/**
 * Update coaching tab with feedback
 * @param {Object} analysis - Flight analysis data
 */
function updateCoachingPanel(analysis) {
    renderCoachingPanel({
        analysis,
        domCache,
        ids: DOM_IDS,
        cssClasses: CSS_CLASSES,
        onStartWalkthrough: startWalkthrough
    });
}

/**
 * Start walkthrough mode
 * @param {Object} coaching - Coaching data
 */
function startWalkthrough(coaching) {
    if (!appState.hasFlightData()) {
        alert('No flight data available');
        return;
    }

    const analysis = appState.currentAnalysis;
    const items = buildWalkthroughItems(coaching, analysis);

    if (items.length === 0) {
        alert('No coaching items to show in walkthrough');
        return;
    }

    // Set walkthrough state
    appState.walkthrough.items = items;
    appState.walkthrough.currentIndex = 0;
    appState.walkthrough.active = true;

    // Show walkthrough bar
    setVisible(DOM_IDS.walkthroughBar, true);

    // Switch to Chart tab for better visibility
    switchToTab(TABS.chart);

    // Show first item
    updateWalkthroughDisplay();
}

/**
 * Update walkthrough display with current item
 */
function updateWalkthroughDisplay() {
    const { items, currentIndex } = appState.walkthrough;

    if (items.length === 0) return;

    const item = items[currentIndex];
    const total = items.length;

    // Update progress
    domCache.get(DOM_IDS.walkthroughProgress).textContent = `${currentIndex + 1} / ${total}`;

    // Update icon and text
    const iconEl = domCache.get(DOM_IDS.walkthroughItemIcon);
    iconEl.textContent = item.icon;
    iconEl.className = `walkthrough-item-icon ${item.color}`;

    domCache.get(DOM_IDS.walkthroughItemText).textContent = item.text;

    // Update button states
    domCache.get(DOM_IDS.walkthroughPrevBtn).disabled = currentIndex === 0;
    domCache.get(DOM_IDS.walkthroughNextBtn).disabled = currentIndex === total - 1;

    // Auto-jump to relevant moment
    if (item.jumpTarget) {
        performWalkthroughJump(item.jumpTarget);
    }
}

/**
 * Jump to a specific moment based on walkthrough target
 * @param {Object} target - Jump target with type and data
 */
function performWalkthroughJump(target) {
    if (!appState.hasFlightData()) return;

    const analysis = appState.currentAnalysis;
    const points = analysis.points;

    switch (target.type) {
        case 'thermal': {
            // Jump to specific thermal
            if (analysis.segments && target.index < analysis.segments.length) {
                const thermal = analysis.segments[target.index];
                const endTime = points[thermal.endIdx].timeS - points[0].timeS;

                // Seek to the end of the thermal (where you can see the full context)
                seekReplay(endTime);

                // Highlight on chart if available
                if (appState.altitudeChart) {
                    appState.altitudeChart.highlightSegment(thermal.startIdx, thermal.endIdx);
                }
            }
            break;
        }

        case 'glide': {
            // Jump to specific glide
            if (analysis.glides && target.index < analysis.glides.length) {
                const glide = analysis.glides[target.index];
                const midPoint = Math.floor((glide.startIdx + glide.endIdx) / 2);
                const midTime = points[midPoint].timeS - points[0].timeS;

                seekReplay(midTime);

                // Highlight on chart
                if (appState.altitudeChart) {
                    appState.altitudeChart.highlightSegment(glide.startIdx, glide.endIdx);
                }
            }
            break;
        }

        case 'time': {
            // Jump to specific time ratio
            const totalDuration = points[points.length - 1].timeS - points[0].timeS;
            const targetTime = totalDuration * target.ratio;

            seekReplay(targetTime);

            // Clear any chart highlights
            if (appState.altitudeChart) {
                appState.altitudeChart.clearSelection();
            }
            break;
        }

        case 'point': {
            // Jump to specific point index
            if (target.index < points.length) {
                const targetTime = points[target.index].timeS - points[0].timeS;
                seekReplay(targetTime);
            }
            break;
        }
    }
}

/**
 * Navigate to previous walkthrough item
 */
function previousWalkthroughItem() {
    if (appState.walkthrough.currentIndex > 0) {
        appState.walkthrough.currentIndex--;
        updateWalkthroughDisplay();
    }
}

/**
 * Navigate to next walkthrough item
 */
function nextWalkthroughItem() {
    const { items, currentIndex } = appState.walkthrough;
    if (currentIndex < items.length - 1) {
        appState.walkthrough.currentIndex++;
        updateWalkthroughDisplay();
    }
}

/**
 * Exit walkthrough mode
 */
function exitWalkthrough() {
    appState.walkthrough.active = false;
    appState.walkthrough.items = [];
    appState.walkthrough.currentIndex = 0;

    // Clear chart highlight
    if (appState.altitudeChart) {
        appState.altitudeChart.clearHighlight();
    }

    setVisible(DOM_IDS.walkthroughBar, false);
}

/**
 * Setup walkthrough event listeners
 */
function setupWalkthroughListeners() {
    // Start walkthrough button - needs to be attached after coaching HTML is rendered
    // This will be handled dynamically after coaching tab is populated

    // Navigation buttons
    domCache.get(DOM_IDS.walkthroughPrevBtn).addEventListener('click', previousWalkthroughItem);
    domCache.get(DOM_IDS.walkthroughNextBtn).addEventListener('click', nextWalkthroughItem);
    domCache.get(DOM_IDS.walkthroughExitBtn).addEventListener('click', exitWalkthrough);

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
        if (!appState.walkthrough.active) return;

        if (e.key === 'ArrowLeft') {
            e.preventDefault();
            previousWalkthroughItem();
        } else if (e.key === 'ArrowRight') {
            e.preventDefault();
            nextWalkthroughItem();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            exitWalkthrough();
        }
    });
}

/**
 * Clear current flight
 */
function clearFlight() {
    // Exit walkthrough if active
    if (appState.walkthrough.active) {
        exitWalkthrough();
    }

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
    setVisible(DOM_IDS.legendPanel, false);

    // Switch back to Upload tab
    switchToTab(TABS.upload);

    // Reset thermals list selection
    document.querySelectorAll(`.${CSS_CLASSES.thermalItem}`).forEach(t => t.classList.remove(CSS_CLASSES.active));

    // Show empty states again
    const chartEmptyState = document.getElementById('chartEmptyState');
    if (chartEmptyState) chartEmptyState.style.display = 'flex';
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
            if (appState.altitudeChart && appState.hasFlightData()) {
                appState.altitudeChart.resizeCanvas();
                appState.altitudeChart.draw();
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

            // Redraw chart after resize completes
            if (appState.altitudeChart && appState.hasFlightData()) {
                appState.altitudeChart.draw();
            }
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

    // Resize altitude chart when switching to Chart tab
    if (tabName === TABS.chart && appState.altitudeChart && appState.hasFlightData()) {
        setTimeout(() => {
            appState.altitudeChart.resizeCanvas();
            appState.altitudeChart.draw();
        }, 50);
    }
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
    const infoBadge = makeInfoBadge(labelText);

    // Create entity with custom canvas badge (no visible point marker)
    const entity = appState.renderer.createPointMarker(
        lon,
        lat,
        height + 20, // Small altitude offset in world space (20m above track)
        {
            name: 'Track Info',
            pixelSize: 0, // Hide the point marker, only show the billboard
            billboard: infoBadge,
            pixelOffset: new Cesium.Cartesian2(0, 0) // No screen-space offset to keep it at exact track position
        }
    );

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
 * Prompt for annotation text using custom modal
 * @param {Object} pointData - Point data with index and point
 */
function promptForAnnotation(pointData) {
    const modal = document.getElementById('annotationModal');
    const input = document.getElementById('annotationInput');
    const confirmBtn = document.getElementById('annotationConfirmBtn');
    const cancelBtn = document.getElementById('annotationCancelBtn');

    // Show modal
    modal.classList.add('active');
    input.value = '';

    // Focus with delay for mobile compatibility
    setTimeout(() => {
        input.focus();
    }, 100);

    // Handle confirm
    const handleConfirm = () => {
        const text = input.value.trim();
        if (text) {
            addAnnotation(pointData.index, pointData.point, text);
            toggleAnnotationMode(); // Exit annotation mode after adding
            switchToTab('notes'); // Switch to notes tab to see the annotation
        }
        cleanup();
    };

    // Handle cancel
    const handleCancel = () => {
        toggleAnnotationMode(); // Exit annotation mode
        cleanup();
    };

    // Cleanup function
    const cleanup = () => {
        modal.classList.remove('active');
        confirmBtn.removeEventListener('click', handleConfirm);
        cancelBtn.removeEventListener('click', handleCancel);
        modal.removeEventListener('click', handleOverlayClick);
        input.removeEventListener('keydown', handleKeydown);
    };

    // Handle overlay click (close on backdrop click)
    const handleOverlayClick = (e) => {
        if (e.target === modal) {
            handleCancel();
        }
    };

    // Handle keyboard shortcuts
    const handleKeydown = (e) => {
        if (e.key === 'Enter') {
            handleConfirm();
        } else if (e.key === 'Escape') {
            handleCancel();
        }
    };

    // Add event listeners
    confirmBtn.addEventListener('click', handleConfirm);
    cancelBtn.addEventListener('click', handleCancel);
    input.addEventListener('keydown', handleKeydown);

    // Add overlay click handler with a delay to prevent immediate closure
    // This prevents the click that opened the modal from closing it
    setTimeout(() => {
        modal.addEventListener('click', handleOverlayClick);
    }, 200);
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
 * Create info badge (similar to annotations but with different styling)
 * @param {string} text - Badge text
 * @returns {HTMLCanvasElement} - Canvas element with badge
 */
function makeInfoBadge(text) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const font = 'bold 16px -apple-system, BlinkMacSystemFont, sans-serif';
  const padX = 12, padY = 8, radius = 4;

  ctx.font = font;
  const w = Math.ceil(ctx.measureText(text).width);
  const h = 16; // font size
  canvas.width = w + padX * 2;
  canvas.height = h + padY * 2;

  // Draw background - use slate-900 like the original label
  ctx.fillStyle = APP_CONFIG.colors.slate[900];
  ctx.beginPath();
  ctx.roundRect(0, 0, canvas.width, canvas.height, radius);
  ctx.fill();

  // Draw text
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
    renderAnnotationsList({
        annotations: appState.annotations,
        selectedAnnotationId: appState.selectedAnnotationId,
        container: domCache.get(DOM_IDS.annotationsList),
        ids: DOM_IDS,
        cssClasses: CSS_CLASSES,
        svgPaths: SVG_PATHS,
        buttonText: BUTTON_TEXT,
        formatters: {
            formatAltitude,
            formatTime
        },
        onAdd: toggleAnnotationMode,
        onDelete: (_annotation, index) => deleteAnnotation(index),
        onSelect: (annotation, index) => {
            selectAnnotation(annotation.id);
            flyToAnnotation(index);
        }
    });

    // Clear cache for the recreated add button.
    domCache.clear(DOM_IDS.addAnnotationBtn);
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

    // Glide visualization toggle button - disabled, use Glides tab instead
    const toggleGlidesBtn = document.getElementById('toggleGlidesBtn');
    if (toggleGlidesBtn) {
        // Hide the button since glides are now controlled via the Glides tab
        toggleGlidesBtn.style.display = 'none';
    }

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
    appState.replay.currentTime = clampReplayTime(time, appState.replay.totalDuration);
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
    const progress = getReplayProgressPercent(appState.replay.currentTime, appState.replay.totalDuration);

    domCache.get(DOM_IDS.replayProgress).style.width = `${progress}%`;
    domCache.get(DOM_IDS.replayHandle).style.left = `${progress}%`;

    domCache.get(DOM_IDS.replayTime).textContent = getReplayTimeLabel(
        appState.replay.currentTime,
        appState.replay.totalDuration,
        formatReplayTime
    );
}

/**
 * Update aircraft marker position based on current time
 */
function updateAircraftPosition() {
    if (!appState.replay.aircraftEntity || !appState.hasFlightData()) return;

    const points = appState.currentAnalysis.points;
    const position = getAircraftPositionAtReplayTime(
        points,
        appState.currentAnalysis.calculatedHeights,
        appState.replay.currentTime
    );

    // Update marker position
    appState.replay.aircraftEntity.position = Cesium.Cartesian3.fromDegrees(position.lon, position.lat, position.alt);

    // Update altitude chart replay position
    if (appState.altitudeChart) {
        appState.altitudeChart.setReplayPosition(position.index);
    }

    // Update annotation visibility based on current replay position
    updateAnnotationVisibility(position.index);

    // Follow aircraft with camera (if no thermal is selected)
    if (appState.selectedThermalIndex === -1 && appState.renderer && appState.renderer.orbitCenter) {
        appState.renderer.followPosition(position.lon, position.lat, position.alt);
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
    const currentPointIndex = getCurrentReplayPointIndex(points, appState.replay.currentTime);

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
