/**
 * Altitude Chart
 * Interactive altitude vs time chart for flight visualization
 */

class AltitudeChart {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.flightData = null;
        this.hoveredPoint = null;
        this.selectedPoint = null;
        this.replayPointIndex = null; // Current replay position
        this.onPointClick = null; // Callback when point is clicked
        this.annotations = []; // Annotation markers

        // Bind event handlers
        this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
        this.canvas.addEventListener('click', this.handleClick.bind(this));
        this.canvas.addEventListener('mouseleave', () => {
            this.hoveredPoint = null;
            this.draw();
        });

        // Resize canvas to match display size
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
    }

    /**
     * Resize canvas to match display size with proper DPI scaling
     */
    resizeCanvas() {
        const rect = this.canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;

        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;

        this.ctx.scale(dpr, dpr);
        this.displayWidth = rect.width;
        this.displayHeight = rect.height;

        if (this.flightData) {
            this.draw();
        }
    }

    /**
     * Set flight data and render chart
     * @param {Object} flightData - Analyzed flight data
     */
    setData(flightData) {
        this.flightData = flightData;
        // Ensure canvas is properly sized before drawing
        this.resizeCanvas();
        this.draw();
    }

    /**
     * Draw the altitude chart
     */
    draw() {
        if (!this.flightData) return;

        const { points, segments } = this.flightData;
        const ctx = this.ctx;
        const width = this.displayWidth;
        const height = this.displayHeight;

        // Clear canvas
        ctx.clearRect(0, 0, width, height);

        // Margins
        const margin = { top: 5, right: 10, bottom: 15, left: 40 };
        const chartWidth = width - margin.left - margin.right;
        const chartHeight = height - margin.top - margin.bottom;

        // Calculate scales
        const maxTime = points[points.length - 1].timeS;

        // Include terrain heights in scale calculation if available
        const terrainHeights = this.flightData.terrainHeights || [];
        const hasTerrainData = terrainHeights.length > 0;

        let minAlt = Math.min(...points.map(p => p.altM));
        let maxAlt = Math.max(...points.map(p => p.altM));

        if (hasTerrainData) {
            const minTerrain = Math.min(...terrainHeights);
            const maxTerrain = Math.max(...terrainHeights);
            minAlt = Math.min(minAlt, minTerrain);
            maxAlt = Math.max(maxAlt, maxTerrain);
        }

        const altRange = maxAlt - minAlt;

        const xScale = (time) => margin.left + (time / maxTime) * chartWidth;
        const yScale = (alt) => margin.top + chartHeight - ((alt - minAlt) / altRange) * chartHeight;

        // Draw grid
        this.drawGrid(ctx, margin, chartWidth, chartHeight, minAlt, maxAlt, maxTime);

        // Draw terrain profile (if available)
        if (hasTerrainData) {
            this.drawTerrainProfile(ctx, points, terrainHeights, xScale, yScale, margin, chartHeight);
            // Draw AGL (altitude above ground) fill
            this.drawAGLFill(ctx, points, terrainHeights, xScale, yScale);
        }

        // Draw altitude line
        this.drawAltitudeLine(ctx, points, xScale, yScale);

        // Draw annotation markers
        if (this.annotations.length > 0) {
            this.drawAnnotationMarkers(ctx, xScale, yScale, margin, chartHeight);
        }

        // Draw hover indicator (only if replay is not active)
        if (this.hoveredPoint !== null && this.replayPointIndex === null) {
            this.drawHoverIndicator(ctx, this.hoveredPoint, xScale, yScale, margin, chartHeight);
        }

        // Draw selected point
        if (this.selectedPoint !== null) {
            this.drawSelectedPoint(ctx, this.selectedPoint, xScale, yScale);
        }

        // Draw replay position indicator
        if (this.replayPointIndex !== null) {
            this.drawReplayIndicator(ctx, this.replayPointIndex, xScale, yScale, margin, chartHeight);
        }
    }

    /**
     * Draw thermal segment backgrounds
     */
    drawThermalBackgrounds(ctx, segments, xScale, top, height) {
        segments.forEach(thermal => {
            const x1 = xScale(thermal.startT);
            const x2 = xScale(thermal.endT);

            ctx.fillStyle = thermal.earlyExit
                ? 'rgba(251, 146, 60, 0.1)'  // Orange for early exit
                : 'rgba(34, 197, 94, 0.1)';   // Green for normal thermal

            ctx.fillRect(x1, top, x2 - x1, height);
        });
    }

    /**
     * Draw grid lines and axes
     */
    drawGrid(ctx, margin, width, height, minAlt, maxAlt, maxTime) {
        ctx.strokeStyle = '#e5e7eb';
        ctx.lineWidth = 1;

        // Horizontal grid lines (altitude)
        const altStep = Math.ceil((maxAlt - minAlt) / 5 / 100) * 100; // Round to 100m
        for (let alt = Math.ceil(minAlt / 100) * 100; alt <= maxAlt; alt += altStep) {
            const y = margin.top + height - ((alt - minAlt) / (maxAlt - minAlt)) * height;

            ctx.beginPath();
            ctx.moveTo(margin.left, y);
            ctx.lineTo(margin.left + width, y);
            ctx.stroke();

            // Altitude label
            ctx.fillStyle = '#64748b';
            ctx.font = '10px sans-serif';
            ctx.textAlign = 'right';
            ctx.fillText(`${alt}`, margin.left - 5, y + 3);
        }

        // Vertical grid lines (time)
        const timeStep = Math.ceil(maxTime / 6 / 300) * 300; // Round to 5 minutes
        for (let time = 0; time <= maxTime; time += timeStep) {
            const x = margin.left + (time / maxTime) * width;

            ctx.beginPath();
            ctx.moveTo(x, margin.top);
            ctx.lineTo(x, margin.top + height);
            ctx.stroke();

            // Time label (format as HH:MM using actual time of day)
            const startTimeS = this.flightData.points.startTimeS || 0;
            const actualTimeS = (startTimeS + time) % 86400; // Wrap at 24 hours
            const hours = Math.floor(actualTimeS / 3600);
            const minutes = Math.floor((actualTimeS % 3600) / 60);
            const timeLabel = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
            ctx.fillStyle = '#64748b';
            ctx.font = '10px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(timeLabel, x, margin.top + height + 15);
        }

        // Axes
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 2;

        // Y-axis
        ctx.beginPath();
        ctx.moveTo(margin.left, margin.top);
        ctx.lineTo(margin.left, margin.top + height);
        ctx.stroke();

        // X-axis
        ctx.beginPath();
        ctx.moveTo(margin.left, margin.top + height);
        ctx.lineTo(margin.left + width, margin.top + height);
        ctx.stroke();
    }

    /**
     * Draw terrain profile (ground elevation)
     */
    drawTerrainProfile(ctx, points, terrainHeights, xScale, yScale, margin, chartHeight) {
        const TERRAIN_OFFSET = 50; // Lower terrain by 50m for better visual separation

        ctx.beginPath();

        // Start at bottom left
        const firstX = xScale(points[0].timeS);
        const bottomY = margin.top + chartHeight;
        ctx.moveTo(firstX, bottomY);

        // Draw terrain line from left to right
        // Subtract offset for visual separation and clamp to never exceed aircraft altitude
        points.forEach((point, i) => {
            const x = xScale(point.timeS);
            const offsetTerrain = terrainHeights[i] - TERRAIN_OFFSET;
            const clampedTerrain = Math.min(offsetTerrain, point.altM);
            const y = yScale(clampedTerrain);
            ctx.lineTo(x, y);
        });

        // Close path along bottom
        const lastX = xScale(points[points.length - 1].timeS);
        ctx.lineTo(lastX, bottomY);
        ctx.closePath();

        // Fill terrain area with brown/tan color
        ctx.fillStyle = 'rgba(139, 92, 46, 0.6)'; // Brown with more solid appearance
        ctx.fill();

        // Draw terrain outline
        ctx.strokeStyle = 'rgba(139, 92, 46, 0.8)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        points.forEach((point, i) => {
            const x = xScale(point.timeS);
            const offsetTerrain = terrainHeights[i] - TERRAIN_OFFSET;
            const clampedTerrain = Math.min(offsetTerrain, point.altM);
            const y = yScale(clampedTerrain);
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        ctx.stroke();
    }

    /**
     * Get AGL gradient color based on clearance height
     */
    getAGLColor(aglMeters) {
        // Color based on altitude above ground (AGL)
        // High clearance = green, medium = yellow, low = red/orange
        if (aglMeters > 300) {
            return 'rgba(34, 197, 94, 0.15)'; // Green (safe)
        } else if (aglMeters > 200) {
            return 'rgba(132, 204, 22, 0.15)'; // Lime (good)
        } else if (aglMeters > 100) {
            return 'rgba(234, 179, 8, 0.15)'; // Yellow (caution)
        } else if (aglMeters > 50) {
            return 'rgba(249, 115, 22, 0.15)'; // Orange (warning)
        } else {
            return 'rgba(239, 68, 68, 0.15)'; // Red (danger)
        }
    }

    /**
     * Draw fill between terrain and aircraft (AGL visualization with gradient)
     */
    drawAGLFill(ctx, points, terrainHeights, xScale, yScale) {
        const TERRAIN_OFFSET = 50; // Same offset used in terrain drawing

        // Draw each segment with color based on AGL
        for (let i = 0; i < points.length - 1; i++) {
            const x1 = xScale(points[i].timeS);
            const x2 = xScale(points[i + 1].timeS);

            const y1_aircraft = yScale(points[i].altM);
            const y2_aircraft = yScale(points[i + 1].altM);

            const offsetTerrain1 = terrainHeights[i] - TERRAIN_OFFSET;
            const clampedTerrain1 = Math.min(offsetTerrain1, points[i].altM);
            const y1_terrain = yScale(clampedTerrain1);

            const offsetTerrain2 = terrainHeights[i + 1] - TERRAIN_OFFSET;
            const clampedTerrain2 = Math.min(offsetTerrain2, points[i + 1].altM);
            const y2_terrain = yScale(clampedTerrain2);

            // Calculate AGL at this point
            const agl = points[i].altM - offsetTerrain1;
            const color = this.getAGLColor(agl);

            // Draw quad for this segment
            ctx.beginPath();
            ctx.moveTo(x1, y1_aircraft);
            ctx.lineTo(x2, y2_aircraft);
            ctx.lineTo(x2, y2_terrain);
            ctx.lineTo(x1, y1_terrain);
            ctx.closePath();

            ctx.fillStyle = color;
            ctx.fill();
        }
    }

    /**
     * Get color for vario value (matches 3D track colors)
     */
    getColorFromVario(vario) {
        if (vario >= 5.0) return '#ff0000';      // Extreme lift: Red
        if (vario >= 3.5) return '#ff4500';      // Strong lift: Orange-red
        if (vario >= 2.5) return '#ff8c00';      // Moderate-strong lift: Orange
        if (vario >= 1.5) return '#ffa500';      // Moderate lift: Yellow-orange
        if (vario >= 0.5) return '#ffd700';      // Weak lift: Yellow
        if (vario >= 0.0) return '#ffffe0';      // Neutral lift: Pale yellow
        if (vario >= -1.0) return '#00e5ff';     // Weak sink: Cyan
        if (vario >= -2.5) return '#00bfff';     // Moderate sink: Sky blue
        if (vario >= -5.0) return '#0066ff';     // Strong sink: Blue
        if (vario >= -7.5) return '#0000cc';     // Very strong sink: Dark blue
        return '#cc00ff';                         // Extreme sink: Purple
    }

    /**
     * Draw altitude line with vario-based coloring
     */
    drawAltitudeLine(ctx, points, xScale, yScale) {
        const vario = this.flightData.vario;
        if (!vario || vario.length === 0) {
            // Fallback to solid blue if no vario data
            this.drawSolidAltitudeLine(ctx, points, xScale, yScale);
            return;
        }

        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Draw each segment with its vario color
        for (let i = 0; i < points.length - 1; i++) {
            const x1 = xScale(points[i].timeS);
            const y1 = yScale(points[i].altM);
            const x2 = xScale(points[i + 1].timeS);
            const y2 = yScale(points[i + 1].altM);

            // Use the vario value at the start of the segment
            const color = this.getColorFromVario(vario[i]);
            ctx.strokeStyle = color;

            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
        }
    }

    /**
     * Fallback: Draw solid blue altitude line (when no vario data)
     */
    drawSolidAltitudeLine(ctx, points, xScale, yScale) {
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 2;
        ctx.beginPath();

        points.forEach((point, i) => {
            const x = xScale(point.timeS);
            const y = yScale(point.altM);

            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });

        ctx.stroke();
    }

    /**
     * Draw hover indicator
     */
    drawHoverIndicator(ctx, pointIndex, xScale, yScale, margin, chartHeight) {
        const point = this.flightData.points[pointIndex];
        const x = xScale(point.timeS);
        const y = yScale(point.altM);

        // Vertical line
        ctx.strokeStyle = '#f97316';
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(x, margin.top);
        ctx.lineTo(x, margin.top + chartHeight);
        ctx.stroke();
        ctx.setLineDash([]);

        // Point marker
        ctx.fillStyle = '#f97316';
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fill();
    }

    /**
     * Draw selected point marker
     */
    drawSelectedPoint(ctx, pointIndex, xScale, yScale) {
        const point = this.flightData.points[pointIndex];
        const x = xScale(point.timeS);
        const y = yScale(point.altM);

        ctx.strokeStyle = '#dc2626';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, 7, 0, Math.PI * 2);
        ctx.stroke();
    }

    /**
     * Draw replay position indicator (vertical line and dot)
     */
    drawReplayIndicator(ctx, pointIndex, xScale, yScale, margin, chartHeight) {
        if (!this.flightData || !this.flightData.points || pointIndex >= this.flightData.points.length) {
            return;
        }

        const point = this.flightData.points[pointIndex];
        if (!point) return;

        const x = xScale(point.timeS);
        const y = yScale(point.altM);

        // Draw vertical line
        ctx.strokeStyle = '#f97316';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(x, margin.top);
        ctx.lineTo(x, margin.top + chartHeight);
        ctx.stroke();
        ctx.setLineDash([]);

        // Draw current position dot
        ctx.fillStyle = '#f97316';
        ctx.beginPath();
        ctx.arc(x, y, 6, 0, Math.PI * 2);
        ctx.fill();

        // White outline for visibility
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, 6, 0, Math.PI * 2);
        ctx.stroke();
    }

    /**
     * Set replay position
     * @param {number} pointIndex - Index of current replay point
     */
    setReplayPosition(pointIndex) {
        this.replayPointIndex = pointIndex;
        this.draw();
    }

    /**
     * Clear replay position
     */
    clearReplayPosition() {
        this.replayPointIndex = null;
        this.draw();
    }

    /**
     * Set annotations to display on chart
     * @param {Array} annotations - Array of annotation objects with index property
     */
    setAnnotations(annotations) {
        this.annotations = annotations;
        this.draw();
    }

    /**
     * Draw annotation markers on the chart
     */
    drawAnnotationMarkers(ctx, xScale, yScale, margin, chartHeight) {
        if (!this.flightData) return;

        const points = this.flightData.points;

        this.annotations.forEach(annotation => {
            if (annotation.index >= 0 && annotation.index < points.length) {
                const point = points[annotation.index];
                const x = xScale(point.timeS);

                // Draw triangle indicator at bottom
                ctx.fillStyle = '#fb923c';
                ctx.beginPath();
                ctx.moveTo(x, margin.top + chartHeight - 8);
                ctx.lineTo(x - 6, margin.top + chartHeight);
                ctx.lineTo(x + 6, margin.top + chartHeight);
                ctx.closePath();
                ctx.fill();
            }
        });
    }

    /**
     * Handle mouse move
     */
    handleMouseMove(e) {
        if (!this.flightData) return;

        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Find closest point
        const margin = { left: 50 };
        const chartWidth = this.displayWidth - 70;
        const maxTime = this.flightData.points[this.flightData.points.length - 1].timeS;
        const time = ((x - margin.left) / chartWidth) * maxTime;

        // Binary search for closest point
        let closestIdx = 0;
        let minDist = Infinity;

        this.flightData.points.forEach((point, i) => {
            const dist = Math.abs(point.timeS - time);
            if (dist < minDist) {
                minDist = dist;
                closestIdx = i;
            }
        });

        if (this.hoveredPoint !== closestIdx) {
            this.hoveredPoint = closestIdx;
            this.draw();
        }
    }

    /**
     * Handle click
     */
    handleClick(e) {
        if (!this.flightData || this.hoveredPoint === null) return;

        this.selectedPoint = this.hoveredPoint;
        this.draw();

        // Call callback if set
        if (this.onPointClick) {
            this.onPointClick(this.hoveredPoint, this.flightData.points[this.hoveredPoint]);
        }
    }

    /**
     * Clear selection
     */
    clearSelection() {
        this.selectedPoint = null;
        this.draw();
    }
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AltitudeChart;
}
