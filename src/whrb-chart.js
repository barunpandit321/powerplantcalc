/**
 * WHRB Live Trend Chart & Q-T Pinch Point Diagram Renderer
 * High-performance canvas-based visualization matching site theme.
 */

export class WhrbChartManager {
    constructor(trendCanvasId, qtCanvasId) {
        this.trendCanvas = document.getElementById(trendCanvasId);
        this.qtCanvas = document.getElementById(qtCanvasId);

        // Historical time-series buffer for live telemetry
        this.historyLength = 40;
        this.history = []; // { time: '14:20:01', steamTh: 21.6, gasTempC: 520, thermalMw: 17.1 }

        // Resize listeners
        window.addEventListener("resize", () => {
            this.renderTrend();
            this.renderQtDiagram(this.lastCalcData);
        });
    }

    addTelemetryPoint(point) {
        const now = new Date();
        const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
        
        this.history.push({
            time: timeStr,
            steamTh: point.steamFlowTh,
            gasTempC: point.gasTempInC,
            stackTempC: point.gasTempStackC,
            thermalMw: point.thermalPowerMw
        });

        if (this.history.length > this.historyLength) {
            this.history.shift();
        }

        this.renderTrend();
    }

    resetHistory() {
        this.history = [];
        this.renderTrend();
    }

    isDarkMode() {
        return document.documentElement.getAttribute("data-theme") === "dark";
    }

    initCanvas(canvas) {
        if (!canvas) return null;
        const rect = canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        const width = rect.width || 500;
        const height = rect.height || 260;

        if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
            canvas.width = width * dpr;
            canvas.height = height * dpr;
        }

        const ctx = canvas.getContext("2d");
        ctx.resetTransform();
        ctx.scale(dpr, dpr);
        return { ctx, width, height };
    }

    /**
     * Render Live Rolling Telemetry Trend Chart
     */
    renderTrend(unitSystem = "METRIC") {
        if (!this.trendCanvas) return;
        const setup = this.initCanvas(this.trendCanvas);
        if (!setup) return;
        const { ctx, width, height } = setup;
        const isDark = this.isDarkMode();

        // Colors
        const textColor = isDark ? "#9ca3af" : "#64748b";
        const gridColor = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)";
        const steamColor = "#06b6d4"; // Cyan
        const gasColor = "#f97316"; // Orange

        ctx.clearRect(0, 0, width, height);

        const padLeft = 50;
        const padRight = 50;
        const padTop = 30;
        const padBottom = 35;
        const plotW = width - padLeft - padRight;
        const plotH = height - padTop - padBottom;

        if (plotW <= 0 || plotH <= 0) return;

        // Draw Background & Grid
        ctx.strokeStyle = gridColor;
        ctx.lineWidth = 1;

        const numYLines = 4;
        for (let i = 0; i <= numYLines; i++) {
            const y = padTop + (plotH / numYLines) * i;
            ctx.beginPath();
            ctx.moveTo(padLeft, y);
            ctx.lineTo(width - padRight, y);
            ctx.stroke();
        }

        if (this.history.length < 2) {
            ctx.fillStyle = textColor;
            ctx.font = "13px Inter, sans-serif";
            ctx.textAlign = "center";
            ctx.fillText("Gathering live telemetry data points...", width / 2, height / 2);
            return;
        }

        // Determine Min & Max scales
        const isUS = unitSystem === "US";
        const steamValues = this.history.map(d => isUS ? d.steamTh * 2.20462 : d.steamTh);
        const gasValues = this.history.map(d => isUS ? d.gasTempC * 1.8 + 32 : d.gasTempC);

        const minSteam = Math.max(0, Math.min(...steamValues) * 0.85);
        const maxSteam = Math.max(5, Math.max(...steamValues) * 1.15);

        const minGas = Math.min(...gasValues) * 0.9;
        const maxGas = Math.max(...gasValues) * 1.08;

        // Draw Left Y-Axis (Steam Flow)
        ctx.fillStyle = steamColor;
        ctx.font = "11px Inter, sans-serif";
        ctx.textAlign = "right";
        for (let i = 0; i <= numYLines; i++) {
            const val = maxSteam - (i / numYLines) * (maxSteam - minSteam);
            const y = padTop + (plotH / numYLines) * i;
            ctx.fillText(val.toFixed(1), padLeft - 6, y + 4);
        }
        ctx.save();
        ctx.translate(14, padTop + plotH / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.textAlign = "center";
        ctx.fillText(`Steam (${isUS ? 'klb/h' : 't/h'})`, 0, 0);
        ctx.restore();

        // Draw Right Y-Axis (Flue Gas Temp)
        ctx.fillStyle = gasColor;
        ctx.font = "11px Inter, sans-serif";
        ctx.textAlign = "left";
        for (let i = 0; i <= numYLines; i++) {
            const val = maxGas - (i / numYLines) * (maxGas - minGas);
            const y = padTop + (plotH / numYLines) * i;
            ctx.fillText(Math.round(val), width - padRight + 6, y + 4);
        }
        ctx.save();
        ctx.translate(width - 12, padTop + plotH / 2);
        ctx.rotate(Math.PI / 2);
        ctx.textAlign = "center";
        ctx.fillText(`Flue Gas (${isUS ? '°F' : '°C'})`, 0, 0);
        ctx.restore();

        // Helper to project X & Y
        const getX = index => padLeft + (index / (this.historyLength - 1)) * plotW;
        const getSteamY = val => padTop + plotH - ((val - minSteam) / (maxSteam - minSteam || 1)) * plotH;
        const getGasY = val => padTop + plotH - ((val - minGas) / (maxGas - minGas || 1)) * plotH;

        const offsetIndex = this.historyLength - this.history.length;

        // Plot Gas Temp Line (Orange)
        ctx.strokeStyle = gasColor;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        gasValues.forEach((val, i) => {
            const x = getX(offsetIndex + i);
            const y = getGasY(val);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.stroke();

        // Plot Steam Flow Line with Gradient Fill (Cyan)
        ctx.strokeStyle = steamColor;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        steamValues.forEach((val, i) => {
            const x = getX(offsetIndex + i);
            const y = getSteamY(val);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.stroke();

        // Gradient under steam curve
        const grad = ctx.createLinearGradient(0, padTop, 0, padTop + plotH);
        grad.addColorStop(0, "rgba(6, 182, 212, 0.25)");
        grad.addColorStop(1, "rgba(6, 182, 212, 0.0)");
        ctx.fillStyle = grad;
        ctx.beginPath();
        const startX = getX(offsetIndex);
        ctx.moveTo(startX, padTop + plotH);
        steamValues.forEach((val, i) => {
            ctx.lineTo(getX(offsetIndex + i), getSteamY(val));
        });
        const lastX = getX(offsetIndex + steamValues.length - 1);
        ctx.lineTo(lastX, padTop + plotH);
        ctx.closePath();
        ctx.fill();

        // Highlight Latest Data Points
        const latestIdx = this.history.length - 1;
        const latestX = getX(offsetIndex + latestIdx);
        const latestSteamY = getSteamY(steamValues[latestIdx]);
        const latestGasY = getGasY(gasValues[latestIdx]);

        // Draw dot for steam
        ctx.fillStyle = steamColor;
        ctx.beginPath();
        ctx.arc(latestX, latestSteamY, 5, 0, Math.PI * 2);
        ctx.fill();

        // Draw dot for gas
        ctx.fillStyle = gasColor;
        ctx.beginPath();
        ctx.arc(latestX, latestGasY, 5, 0, Math.PI * 2);
        ctx.fill();

        // Legend at top
        ctx.font = "11px Inter, sans-serif";
        ctx.textAlign = "left";
        ctx.fillStyle = steamColor;
        ctx.fillRect(padLeft + 10, 10, 12, 4);
        ctx.fillText(`Steam Rate (${steamValues[latestIdx].toFixed(2)} ${isUS ? 'klb/h' : 't/h'})`, padLeft + 28, 15);

        ctx.fillStyle = gasColor;
        ctx.fillRect(padLeft + 220, 10, 12, 4);
        ctx.fillText(`Gas Temp (${Math.round(gasValues[latestIdx])} ${isUS ? '°F' : '°C'})`, padLeft + 238, 15);
    }

    /**
     * Render Q-T Diagram (Flue Gas Cooling Curve vs Water/Steam Heating Curve)
     * Highlights Pinch Point and Approach Point.
     */
    renderQtDiagram(data, unitSystem = "METRIC") {
        if (!this.qtCanvas || !data) return;
        this.lastCalcData = data;
        const setup = this.initCanvas(this.qtCanvas);
        if (!setup) return;
        const { ctx, width, height } = setup;
        const isDark = this.isDarkMode();
        const isUS = unitSystem === "US";

        const textColor = isDark ? "#9ca3af" : "#64748b";
        const titleColor = isDark ? "#f3f4f6" : "#1f2937";
        const gridColor = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)";

        ctx.clearRect(0, 0, width, height);

        const padLeft = 60;
        const padRight = 30;
        const padTop = 35;
        const padBottom = 40;
        const plotW = width - padLeft - padRight;
        const plotH = height - padTop - padBottom;

        if (plotW <= 0 || plotH <= 0) return;

        // Temperatures in display unit
        const toDisplayTemp = c => isUS ? (c * 1.8 + 32) : c;
        const tempUnitStr = isUS ? "°F" : "°C";

        const tGasIn = toDisplayTemp(data.gasTempInC);
        const tGasAfterSh = toDisplayTemp(data.gasTempAfterShC);
        const tGasEvapOut = toDisplayTemp(data.gasTempEvapOutC);
        const tGasStack = toDisplayTemp(data.gasTempStackC);

        const tSteamOut = toDisplayTemp(data.steamTempC);
        const tSat = toDisplayTemp(data.tSatC);
        const tEconOut = toDisplayTemp(data.econOutTempC);
        const tFw = toDisplayTemp(data.feedwaterTempC);

        const minT = Math.max(0, Math.min(tGasStack, tFw) * 0.85);
        const maxT = Math.max(tGasIn, tSteamOut) * 1.08;

        // Heat duty percentages (X-axis from 0% at stack to 100% at inlet)
        // Normalized cumulative heat:
        const qTotal = data.totalHeatRecoveredKw || 1;
        const qEconPct = (data.econDutyKw / qTotal);
        const qEvapPct = (data.evapDutyKw / qTotal);
        const qShPct = (data.shDutyKw / qTotal);

        const x0 = padLeft; // 0% heat (stack / FW inlet)
        const xEconEnd = padLeft + qEconPct * plotW; // after Economizer / entering Evap
        const xEvapEnd = xEconEnd + qEvapPct * plotW; // after Evap / entering Superheater
        const x100 = padLeft + plotW; // 100% heat (gas inlet / final steam outlet)

        const getY = t => padTop + plotH - ((t - minT) / (maxT - minT || 1)) * plotH;

        // Draw Grid Lines
        ctx.strokeStyle = gridColor;
        ctx.lineWidth = 1;
        const numY = 4;
        for (let i = 0; i <= numY; i++) {
            const y = padTop + (plotH / numY) * i;
            ctx.beginPath();
            ctx.moveTo(padLeft, y);
            ctx.lineTo(width - padRight, y);
            ctx.stroke();

            const tVal = maxT - (i / numY) * (maxT - minT);
            ctx.fillStyle = textColor;
            ctx.font = "11px Inter, sans-serif";
            ctx.textAlign = "right";
            ctx.fillText(`${Math.round(tVal)} ${tempUnitStr}`, padLeft - 8, y + 4);
        }

        // Draw Gas Cooling Curve (Red/Orange Line)
        // Gas enters at x100 (tGasIn), cools to xEvapEnd (tGasAfterSh), cools to xEconEnd (tGasEvapOut), exits at x0 (tGasStack)
        ctx.strokeStyle = "#ef4444";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(x0, getY(tGasStack));
        ctx.lineTo(xEconEnd, getY(tGasEvapOut));
        ctx.lineTo(xEvapEnd, getY(tGasAfterSh));
        ctx.lineTo(x100, getY(tGasIn));
        ctx.stroke();

        // Draw Water/Steam Heating Curve (Blue/Cyan Line)
        // FW enters at x0 (tFw), heats in Econ to xEconEnd (tEconOut), evaporates isothermally to xEvapEnd (tSat), superheats to x100 (tSteamOut)
        ctx.strokeStyle = "#0284c7";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(x0, getY(tFw));
        ctx.lineTo(xEconEnd, getY(tEconOut));
        ctx.lineTo(xEvapEnd, getY(tSat));
        ctx.lineTo(x100, getY(tSteamOut));
        ctx.stroke();

        // Draw Pinch Point Line (at xEconEnd, between tGasEvapOut and tSat)
        const yPinchGas = getY(tGasEvapOut);
        const yPinchSteam = getY(tSat);
        ctx.strokeStyle = "#eab308"; // Yellow dashed line
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(xEconEnd, yPinchGas);
        ctx.lineTo(xEconEnd, yPinchSteam);
        ctx.stroke();
        ctx.setLineDash([]);

        // Label Pinch Point
        const pinchDeltaVal = isUS ? (data.actualPinchPointC * 1.8).toFixed(1) : data.actualPinchPointC.toFixed(1);
        ctx.fillStyle = "#eab308";
        ctx.font = "bold 11px Inter, sans-serif";
        ctx.textAlign = "center";
        const midY = (yPinchGas + yPinchSteam) / 2;
        ctx.fillText(`ΔT Pinch: ${pinchDeltaVal} ${tempUnitStr}`, xEconEnd + 65, midY);

        // Draw points on key coordinates
        const drawDot = (x, y, color) => {
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(x, y, 4.5, 0, Math.PI * 2);
            ctx.fill();
        };

        drawDot(x100, getY(tGasIn), "#ef4444");
        drawDot(x0, getY(tGasStack), "#ef4444");
        drawDot(x100, getY(tSteamOut), "#0284c7");
        drawDot(x0, getY(tFw), "#0284c7");
        drawDot(xEconEnd, getY(tGasEvapOut), "#eab308");
        drawDot(xEconEnd, getY(tEconOut), "#0284c7");

        // Axis Titles
        ctx.fillStyle = textColor;
        ctx.font = "11px Inter, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("Heat Exchanged (Q) → [ Economizer | Evaporator | Superheater ]", padLeft + plotW / 2, height - 12);

        // Legend at top
        ctx.textAlign = "left";
        ctx.fillStyle = "#ef4444";
        ctx.fillRect(padLeft + 10, 10, 12, 4);
        ctx.fillText("Flue Gas Cooling Line", padLeft + 28, 15);

        ctx.fillStyle = "#0284c7";
        ctx.fillRect(padLeft + 190, 10, 12, 4);
        ctx.fillText("Water / Steam Heating Line", padLeft + 208, 15);
    }
}
