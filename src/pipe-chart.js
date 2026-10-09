// Steam Pipe Velocity & Hydraulic Performance Canvas Chart Renderer
export class PipeChart {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) return;
        this.ctx = this.canvas.getContext('2d');
        this.resize();
        window.addEventListener('resize', () => this.resize());
    }

    resize() {
        if (!this.canvas) return;
        const rect = this.canvas.parentElement.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        this.width = rect.width;
        const isMobile = this.width < 500;
        this.height = isMobile ? 290 : Math.max(260, rect.height || 260);

        this.canvas.width = Math.round(this.width * dpr);
        this.canvas.height = Math.round(this.height * dpr);
        this.canvas.style.width = `${this.width}px`;
        this.canvas.style.height = `${this.height}px`;

        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        if (this.lastData) this.render(this.lastData);
    }

    render(data) {
        this.lastData = data;
        if (!this.ctx) return;

        const isDark = typeof document !== 'undefined' && document.documentElement?.classList.contains('dark');
        const textColor = isDark ? '#f8fafc' : '#0f172a';
        const mutedColor = isDark ? '#94a3b8' : '#64748b';
        const gridColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)';

        this.ctx.clearRect(0, 0, this.width, this.height);

        const isMobile = this.width < 500;
        const padX = isMobile ? 14 : 24;
        const padTop = 16;
        const availW = Math.max(100, this.width - (padX * 2));

        const vel = Number(data.velocity) || 25;
        const dp = Number(data.dpBar100m) || 0.15;
        const nps = data.nps || "4\"";
        const dn = data.dn || 100;
        const idMm = Number(data.idMm) || 102.3;

        // 1. Header: Sized Pipe Summary & Status Badge
        let statusColor = "#10b981";
        let statusText = "Optimal Velocity";
        if (vel < 15) { statusColor = "#3b82f6"; statusText = "Low Velocity"; }
        else if (vel > 45) { statusColor = "#ef4444"; statusText = "Excessive Velocity"; }
        else if (vel > 30) { statusColor = "#f59e0b"; statusText = "High Velocity"; }

        this.ctx.font = '600 13px Inter, system-ui, sans-serif';
        const fullSizeText = `Selected Size: NPS ${nps} (DN${dn}) — ID ${idMm.toFixed(1)} mm`;
        const mobileSizeText = `Size: NPS ${nps} (DN${dn}) • ID ${idMm.toFixed(1)}mm`;
        const sizeText = isMobile ? mobileSizeText : fullSizeText;
        const sizeW = this.ctx.measureText(sizeText).width;

        this.ctx.font = '700 12px Inter, system-ui, sans-serif';
        const statW = this.ctx.measureText(`● ${statusText}`).width;

        let barY;
        if (isMobile || (sizeW + statW + 24 > availW)) {
            // Adaptive Two-Tier Stacked Layout on Mobile
            // Line 1: Sized pipe details
            this.ctx.font = '600 12.5px Inter, system-ui, sans-serif';
            this.ctx.fillStyle = textColor;
            this.ctx.fillText(sizeText, padX, padTop + 14);

            // Line 2: Velocity Status Indicator Pill
            this.ctx.font = '700 11.5px Inter, system-ui, sans-serif';
            this.ctx.fillStyle = statusColor;
            this.ctx.fillText(`● ${statusText}`, padX, padTop + 32);

            barY = padTop + 68;
        } else {
            // Desktop Inline Header Layout
            this.ctx.font = '600 13px Inter, system-ui, sans-serif';
            this.ctx.fillStyle = textColor;
            this.ctx.fillText(sizeText, padX, padTop + 14);

            this.ctx.font = '700 12px Inter, system-ui, sans-serif';
            this.ctx.fillStyle = statusColor;
            this.ctx.fillText(`● ${statusText}`, this.width - padX - statW, padTop + 14);

            barY = padTop + 54;
        }

        // 2. Velocity Linear Gauge Bar
        const barH = 22;
        const maxGaugeVel = 60; // scale up to 60 m/s

        // Background Track with 4 Velocity Zones:
        // Zone 1: 0 - 15 m/s (Low / Blue)
        const z1W = (15 / maxGaugeVel) * availW;
        this.ctx.fillStyle = "rgba(59, 130, 246, 0.45)";
        this.drawRoundedRect(this.ctx, padX, barY, z1W, barH, { tl: 6, bl: 6, tr: 0, br: 0 });
        this.ctx.fill();

        // Zone 2: 15 - 30 m/s (Optimal / Green)
        const z2W = (15 / maxGaugeVel) * availW;
        this.ctx.fillStyle = "rgba(16, 185, 129, 0.75)";
        this.ctx.fillRect(padX + z1W, barY, z2W, barH);

        // Zone 3: 30 - 45 m/s (High / Amber)
        const z3W = (15 / maxGaugeVel) * availW;
        this.ctx.fillStyle = "rgba(245, 158, 11, 0.7)";
        this.ctx.fillRect(padX + z1W + z2W, barY, z3W, barH);

        // Zone 4: 45 - 60 m/s (Excessive / Red)
        const z4W = Math.max(0, availW - z1W - z2W - z3W);
        this.ctx.fillStyle = "rgba(239, 68, 68, 0.7)";
        this.drawRoundedRect(this.ctx, padX + z1W + z2W + z3W, barY, z4W, barH, { tl: 0, bl: 0, tr: 6, br: 6 });
        this.ctx.fill();

        // Marker for actual velocity
        const clampedVel = Math.min(maxGaugeVel, Math.max(0, vel));
        const markerX = padX + (clampedVel / maxGaugeVel) * availW;

        // Downward pointer arrow
        this.ctx.fillStyle = textColor;
        this.ctx.beginPath();
        this.ctx.moveTo(markerX, barY - 2);
        this.ctx.lineTo(markerX - 5, barY - 10);
        this.ctx.lineTo(markerX + 5, barY - 10);
        this.ctx.closePath();
        this.ctx.fill();

        // Velocity value label above marker
        this.ctx.font = '700 12px Inter, system-ui, sans-serif';
        this.ctx.fillStyle = statusColor;
        const velTag = `${vel.toFixed(1)} m/s`;
        const velTagW = this.ctx.measureText(velTag).width;
        const velTagX = Math.max(padX, Math.min(this.width - padX - velTagW, markerX - (velTagW / 2)));
        this.ctx.fillText(velTag, velTagX, barY - 14);

        // Gauge Ticks below bar
        this.ctx.font = '500 10.5px Inter, system-ui, sans-serif';
        this.ctx.fillStyle = mutedColor;
        const tickY = barY + barH + 15;
        if (isMobile) {
            this.ctx.fillText("0", padX, tickY);
            this.ctx.fillText("15", padX + z1W - 6, tickY);
            this.ctx.fillText("30", padX + z1W + z2W - 6, tickY);
            this.ctx.fillText("45", padX + z1W + z2W + z3W - 6, tickY);
            this.ctx.fillText("60 m/s", Math.max(padX + z1W + z2W + z3W + 10, this.width - padX - 34), tickY);
        } else {
            this.ctx.fillText("0 m/s", padX, tickY);
            this.ctx.fillText("15 (Low)", padX + z1W - 18, tickY);
            this.ctx.fillText("30 (Optimal)", padX + z1W + z2W - 24, tickY);
            this.ctx.fillText("45 (High)", padX + z1W + z2W + z3W - 20, tickY);
            this.ctx.fillText("60 m/s", this.width - padX - 32, tickY);
        }

        // 3. Pressure Drop Indicator Section
        const dpY = tickY + 24;
        this.ctx.font = '600 12.5px Inter, system-ui, sans-serif';
        this.ctx.fillStyle = textColor;
        const dpHeader = isMobile 
            ? "Pressure Drop Gradient:" 
            : "Frictional Pressure Drop Gradient (Darcy-Weisbach):";
        this.ctx.fillText(dpHeader, padX, dpY + 12);

        // Pressure Drop Value Text
        this.ctx.font = '700 12px Inter, system-ui, sans-serif';
        const dpColor = dp > 0.35 ? "#ef4444" : (dp > 0.2 ? "#f59e0b" : "#10b981");
        this.ctx.fillStyle = dpColor;
        const dpValText = `${dp.toFixed(3)} bar/100m (${(dp * 4.421).toFixed(2)} psi/100ft)`;
        const dpValW = this.ctx.measureText(dpValText).width;

        let dpBarY;
        if (isMobile || (this.ctx.measureText(dpHeader).width + dpValW + 20 > availW)) {
            // Adaptive wrap on mobile
            this.ctx.fillText(dpValText, padX, dpY + 28);
            dpBarY = dpY + 38;
        } else {
            this.ctx.fillText(dpValText, this.width - padX - dpValW, dpY + 12);
            dpBarY = dpY + 22;
        }

        // Pressure Drop Bar Track
        const maxDp = 1.0; // scale up to 1.0 bar/100m
        const normDpW = (0.2 / maxDp) * availW;

        // Background Track
        this.ctx.fillStyle = gridColor;
        this.drawRoundedRect(this.ctx, padX, dpBarY, availW, 14, 5);
        this.ctx.fill();

        // Safe/Recommended zone background highlight (0 to 0.2 bar/100m)
        this.ctx.fillStyle = "rgba(16, 185, 129, 0.22)";
        this.ctx.fillRect(padX, dpBarY, normDpW, 14);

        // Actual DP fill
        const actualDpW = Math.min(availW, Math.max(6, (dp / maxDp) * availW));
        this.ctx.fillStyle = dpColor;
        this.drawRoundedRect(this.ctx, padX, dpBarY, actualDpW, 14, 5);
        this.ctx.fill();

        // Safe zone label below bar
        this.ctx.font = '500 10px Inter, system-ui, sans-serif';
        this.ctx.fillStyle = mutedColor;
        this.ctx.fillText("0", padX, dpBarY + 24);
        this.ctx.fillText("0.2 (Optimal Zone)", padX + normDpW - 35, dpBarY + 24);
        this.ctx.fillText("1.0 bar/100m", this.width - padX - 58, dpBarY + 24);
    }

    drawRoundedRect(ctx, x, y, width, height, radii) {
        if (width <= 0 || height <= 0) return;
        if (typeof ctx.roundRect === 'function') {
            ctx.beginPath();
            ctx.roundRect(x, y, width, height, radii);
            return;
        }
        ctx.beginPath();
        const r = typeof radii === 'number'
            ? { tl: radii, tr: radii, br: radii, bl: radii }
            : Object.assign({ tl: 0, tr: 0, br: 0, bl: 0 }, radii);

        ctx.moveTo(x + r.tl, y);
        ctx.lineTo(x + width - r.tr, y);
        if (r.tr) ctx.quadraticCurveTo(x + width, y, x + width, y + r.tr);
        ctx.lineTo(x + width, y + height - r.br);
        if (r.br) ctx.quadraticCurveTo(x + width, y + height, x + width - r.br, y + height);
        ctx.lineTo(x + r.bl, y + height);
        if (r.bl) ctx.quadraticCurveTo(x, y + height, x, y + height - r.bl);
        ctx.lineTo(x, y + r.tl);
        if (r.tl) ctx.quadraticCurveTo(x, y, x + r.tl, y);
        ctx.closePath();
    }
}
