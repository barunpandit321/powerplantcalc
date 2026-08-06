/**
 * High-Precision Interactive Thermodynamic Diagram Engine for Steam & Water (IAPWS-IF97)
 * Renders Mollier (h-s) and Temperature-Entropy (T-s) charts using HTML5 Canvas.
 */

import { solvePx } from 'iapws-if97';

// Pre-computed Saturation Boundary Data (IAPWS-IF97 Saturation Dome)
function generateSaturationDome() {
    const dome = [];
    // Pressures from 0.001 MPa (0.01 bar) up to 22.064 MPa (Critical Point)
    const pressures = [];
    for (let p = 0.001; p < 0.1; p += 0.005) pressures.push(p);
    for (let p = 0.1; p < 1.0; p += 0.05) pressures.push(p);
    for (let p = 1.0; p < 10.0; p += 0.5) pressures.push(p);
    for (let p = 10.0; p <= 22.0; p += 1.0) pressures.push(p);
    pressures.push(22.064); // Critical point

    pressures.forEach(p => {
        try {
            const liquid = solvePx(p, 0); // x = 0 (Saturated Liquid)
            const vapor = solvePx(p, 1);  // x = 1 (Saturated Vapor)
            if (liquid && vapor) {
                dome.push({
                    p: p,
                    T: liquid.temperature - 273.15,
                    hf: liquid.enthalpy,
                    hg: vapor.enthalpy,
                    sf: liquid.entropy,
                    sg: vapor.entropy
                });
            }
        } catch (e) {
            // Ignore near critical point numerical edge cases
        }
    });
    return dome;
}

const saturationDome = generateSaturationDome();

export function drawThermodynamicChart(canvasId, state, chartType = 'hs', isDarkMode = true) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();

    if (rect.width === 0 || rect.height === 0) return;

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;

    // Theme Color Tokens
    const colors = isDarkMode ? {
        bg: '#151c2c',
        grid: '#2a364f',
        text: '#9ca3af',
        axis: '#475569',
        liquidLine: '#3b82f6',
        vaporLine: '#06b6d4',
        isobar: 'rgba(148, 163, 184, 0.25)',
        marker: '#38bdf8',
        markerGlow: 'rgba(56, 189, 248, 0.4)',
        markerText: '#ffffff'
    } : {
        bg: '#ffffff',
        grid: '#e2e8f0',
        text: '#64748b',
        axis: '#94a3b8',
        liquidLine: '#2563eb',
        vaporLine: '#0284c7',
        isobar: 'rgba(100, 116, 139, 0.25)',
        marker: '#0284c7',
        markerGlow: 'rgba(2, 132, 199, 0.3)',
        markerText: '#0f172a'
    };

    ctx.fillStyle = colors.bg;
    ctx.fillRect(0, 0, width, height);

    const padding = { top: 40, right: 30, bottom: 45, left: 55 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    // Set Coordinate Ranges
    let minX = 0.2, maxX = 9.5; // Entropy s (kJ/kg K)
    let minY, maxY;

    if (chartType === 'hs') {
        minY = 100;
        maxY = 4000; // Enthalpy h (kJ/kg)
    } else {
        minY = 0;
        maxY = 700; // Temperature T (°C)
    }

    // Mapping Functions
    const toCanvasX = (s) => padding.left + ((s - minX) / (maxX - minX)) * chartW;
    const toCanvasY = (v) => padding.top + chartH - ((v - minY) / (maxY - minY)) * chartH;

    // Draw Grid Lines & Axis Labels
    ctx.lineWidth = 1;
    ctx.strokeStyle = colors.grid;
    ctx.fillStyle = colors.text;
    ctx.font = '11px Inter, sans-serif';

    // Vertical X Grid (Entropy)
    const xStep = 1.0;
    for (let s = 1.0; s <= 9.0; s += xStep) {
        const x = toCanvasX(s);
        ctx.beginPath();
        ctx.moveTo(x, padding.top);
        ctx.lineTo(x, padding.top + chartH);
        ctx.stroke();

        ctx.textAlign = 'center';
        ctx.fillText(s.toFixed(1), x, height - padding.bottom + 18);
    }

    // Horizontal Y Grid
    if (chartType === 'hs') {
        for (let h = 500; h <= 3500; h += 500) {
            const y = toCanvasY(h);
            ctx.beginPath();
            ctx.moveTo(padding.left, y);
            ctx.lineTo(padding.left + chartW, y);
            ctx.stroke();

            ctx.textAlign = 'right';
            ctx.fillText(h.toString(), padding.left - 8, y + 4);
        }
    } else {
        for (let t = 100; t <= 600; t += 100) {
            const y = toCanvasY(t);
            ctx.beginPath();
            ctx.moveTo(padding.left, y);
            ctx.lineTo(padding.left + chartW, y);
            ctx.stroke();

            ctx.textAlign = 'right';
            ctx.fillText(t + '°C', padding.left - 8, y + 4);
        }
    }

    // Axis Labels
    ctx.fillStyle = colors.text;
    ctx.font = '600 11px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Specific Entropy s [kJ/(kg·K)]', padding.left + chartW / 2, height - 10);

    ctx.save();
    ctx.translate(15, padding.top + chartH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(chartType === 'hs' ? 'Specific Enthalpy h [kJ/kg]' : 'Temperature T [°C]', 0, 0);
    ctx.restore();

    // Draw Saturation Line (Dome)
    ctx.lineWidth = 2;
    
    // Liquid Saturation Line (x = 0)
    ctx.strokeStyle = colors.liquidLine;
    ctx.beginPath();
    saturationDome.forEach((pt, i) => {
        const x = toCanvasX(pt.sf);
        const y = toCanvasY(chartType === 'hs' ? pt.hf : pt.T);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Vapor Saturation Line (x = 1)
    ctx.strokeStyle = colors.vaporLine;
    ctx.beginPath();
    saturationDome.forEach((pt, i) => {
        const x = toCanvasX(pt.sg);
        const y = toCanvasY(chartType === 'hs' ? pt.hg : pt.T);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Plot User Operating Point (if valid state is available)
    if (state && state.entropy && (state.enthalpy || state.temperature)) {
        const tempC = state.temperature - 273.15;
        const targetX = toCanvasX(state.entropy);
        const targetY = toCanvasY(chartType === 'hs' ? state.enthalpy : tempC);

        // Clip check
        if (targetX >= padding.left && targetX <= padding.left + chartW &&
            targetY >= padding.top && targetY <= padding.top + chartH) {
            
            // Draw Target Crosshair Lines
            ctx.strokeStyle = colors.markerGlow;
            ctx.lineWidth = 1;
            ctx.setLineDash([4, 4]);

            ctx.beginPath();
            ctx.moveTo(targetX, padding.top);
            ctx.lineTo(targetX, padding.top + chartH);
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(padding.left, targetY);
            ctx.lineTo(padding.left + chartW, targetY);
            ctx.stroke();
            ctx.setLineDash([]); // Reset dash

            // Outer Glow Circle
            ctx.fillStyle = colors.markerGlow;
            ctx.beginPath();
            ctx.arc(targetX, targetY, 10, 0, Math.PI * 2);
            ctx.fill();

            // Inner Marker Circle
            ctx.fillStyle = colors.marker;
            ctx.beginPath();
            ctx.arc(targetX, targetY, 5, 0, Math.PI * 2);
            ctx.fill();

            // Label Badge Callout
            const labelText = `State: ${chartType === 'hs' ? state.enthalpy.toFixed(1) + ' kJ/kg' : tempC.toFixed(1) + '°C'}`;
            ctx.font = '600 11px Inter, sans-serif';
            const badgeW = ctx.measureText(labelText).width + 16;
            const badgeH = 22;
            let badgeX = targetX + 12;
            let badgeY = targetY - 28;

            if (badgeX + badgeW > padding.left + chartW) badgeX = targetX - badgeW - 12;
            if (badgeY < padding.top) badgeY = targetY + 12;

            ctx.fillStyle = isDarkMode ? 'rgba(30, 41, 59, 0.9)' : 'rgba(255, 255, 255, 0.9)';
            ctx.strokeStyle = colors.marker;
            ctx.lineWidth = 1;
            ctx.beginPath();
            if (ctx.roundRect) {
                ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 6);
            } else {
                ctx.rect(badgeX, badgeY, badgeW, badgeH);
            }
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = colors.markerText;
            ctx.textAlign = 'left';
            ctx.fillText(labelText, badgeX + 8, badgeY + 15);
        }
    }
}
