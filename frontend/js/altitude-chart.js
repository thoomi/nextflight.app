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
        const margin = { top: 20, right: 20, bottom: 30, left: 50 };
        const chartWidth = width - margin.left - margin.right;
        const chartHeight = height - margin.top - margin.bottom;

        // Calculate scales
        const maxTime = points[points.length - 1].timeS;
        const minAlt = Math.min(...points.map(p => p.altM));
        const maxAlt = Math.max(...points.map(p => p.altM));
        const altRange = maxAlt - minAlt;

        const xScale = (time) => margin.left + (time / maxTime) * chartWidth;
        const yScale = (alt) => margin.top + chartHeight - ((alt - minAlt) / altRange) * chartHeight;

        // Draw thermal backgrounds
        this.drawThermalBackgrounds(ctx, segments, xScale, margin.top, chartHeight);

        // Draw grid
        this.drawGrid(ctx, margin, chartWidth, chartHeight, minAlt, maxAlt, maxTime);

        // Draw altitude line
        this.drawAltitudeLine(ctx, points, xScale, yScale);

        // Draw annotation markers
        if (this.annotations.length > 0) {
            this.drawAnnotationMarkers(ctx, xScale, yScale, margin, chartHeight);
        }

        // Draw hover indicator
        if (this.hoveredPoint !== null) {
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
            ctx.fillText(`${alt}m`, margin.left - 5, y + 3);
        }

        // Vertical grid lines (time)
        const timeStep = Math.ceil(maxTime / 6 / 300) * 300; // Round to 5 minutes
        for (let time = 0; time <= maxTime; time += timeStep) {
            const x = margin.left + (time / maxTime) * width;

            ctx.beginPath();
            ctx.moveTo(x, margin.top);
            ctx.lineTo(x, margin.top + height);
            ctx.stroke();

            // Time label
            const minutes = Math.floor(time / 60);
            ctx.fillStyle = '#64748b';
            ctx.font = '10px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(`${minutes}m`, x, margin.top + height + 15);
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

        // Labels
        ctx.fillStyle = '#475569';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Time', margin.left + width / 2, margin.top + height + 28);

        ctx.save();
        ctx.translate(15, margin.top + height / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText('Altitude (m)', 0, 0);
        ctx.restore();
    }

    /**
     * Draw altitude line
     */
    drawAltitudeLine(ctx, points, xScale, yScale) {
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

        // Fill area under line
        ctx.lineTo(xScale(points[points.length - 1].timeS), yScale(Math.min(...points.map(p => p.altM))));
        ctx.lineTo(xScale(points[0].timeS), yScale(Math.min(...points.map(p => p.altM))));
        ctx.closePath();
        ctx.fillStyle = 'rgba(59, 130, 246, 0.1)';
        ctx.fill();
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

        // Tooltip
        const vario = this.flightData.vario[pointIndex];
        const speed = this.flightData.speed[pointIndex];
        const minutes = Math.floor(point.timeS / 60);
        const seconds = Math.floor(point.timeS % 60);

        const tooltip = `${minutes}m ${seconds}s | ${Math.round(point.altM)}m | ${vario >= 0 ? '+' : ''}${vario.toFixed(1)} m/s | ${speed.toFixed(1)} km/h`;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.font = '11px sans-serif';
        const textWidth = ctx.measureText(tooltip).width;
        const tooltipX = Math.min(x, this.displayWidth - textWidth - 15);
        const tooltipY = Math.max(20, y - 25);

        ctx.fillRect(tooltipX - 5, tooltipY - 15, textWidth + 10, 20);
        ctx.fillStyle = 'white';
        ctx.fillText(tooltip, tooltipX, tooltipY);
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
