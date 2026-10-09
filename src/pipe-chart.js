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
        this.height = isMobile ? 220 : Math.max(220, rect.height || 250);

        this.canvas.width = this.width * dpr;
        this.canvas.height = this.height * dpr;
        this.canvas.style.width = `${this.width}px`;
        this.canvas.style.height = `${this.height}px`;

        this.ctx.scale(dpr, dpr);
        if (this.lastData) this.render(this.lastData);
    }

    render(data) {
        this.lastData = data;
        if (!this.ctx) return;

        const isDark = document.documentElement.classList.contains('dark');
        const textColor = isDark ? '#f8fafc' : '#0f172a';
        const mutedColor = isDark ? '#94a3b8' : '#64748b';
        const gridColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)';

        this.ctx.clearRect(0, 0, this.width, this.height);

        const isMobile = this.width < 500;
        const padX = isMobile ? 16 : 28;
        const padTop = 20;
        const availW = this.width - (padX * 2);

        const vel = data.velocity || 25;
        const targetVel = data.targetVelocity || 25;
        const dp = data.dpBar100m || 0.15;
        const nps = data.nps || "4\"";
        const dn = data.dn || 100;
        const idMm = data.idMm || 102.3;

        // 1. Header: Sized Pipe Summary
        const sizeText = isMobile ? `Size: NPS ${nps} (DN${dn}) — ID ${idMm.toFixed(1)}mm` : `Selected Size: NPS ${nps} (DN${dn}) — Internal Diameter: ${idMm.toFixed(1)} mm`;
        this.ctx.font = '600 13px Inter, system-ui, sans-serif';
        const sizeW = this.ctx.measureText(sizeText).width;

        // Status pill
        let statusColor = "#10b981";
        let statusText = "Optimal Velocity";
        if (vel < 15) { statusColor = "#3b82f6"; statusText = "Low Velocity (Oversized)"; }
        else if (vel > 45) { statusColor = "#ef4444"; statusText = "Excessive Velocity (Erosion Risk)"; }
        else if (vel > 32) { statusColor = "#f59e0b"; statusText = "High Velocity"; }

        this.ctx.font = '700 12px Inter, system-ui, sans-serif';
        const statW = this.ctx.measureText(statusText).width;

        let barY = padTop + 36;
        if (sizeW + statW + 16 > availW) {
            // Stack header on narrow screens
            this.ctx.font = '600 12px Inter, system-ui, sans-serif';
            this.ctx.fillStyle = textColor;
            this.ctx.fillText(sizeText, padX, padTop + 12);

            this.ctx.font = '700 12px Inter, system-ui, sans-serif';
            this.ctx.fillStyle = statusColor;
            this.ctx.fillText(statusText, padX, padTop + 28);
            barY = padTop + 48;
        } else {
            this.ctx.font = '600 13px Inter, system-ui, sans-serif';
            this.ctx.fillStyle = textColor;
            this.ctx.fillText(sizeText, padX, padTop + 14);

            this.ctx.font = '700 12px Inter, system-ui, sans-serif';
            this.ctx.fillStyle = statusColor;
            this.ctx.fillText(statusText, this.width - padX - statW, padTop + 14);
            barY = padTop + 36;
        }

        // 2. Velocity Linear Gauge Bar
        const barH = 24;
        const maxGaugeVel = 60; // scale up to 60 m/s

        // Background Track with 4 Velocity Zones
        // Zone 1: 0 - 15 m/s (Low / Blue)
        const z1W = (15 / maxGaugeVel) * availW;
        this.ctx.fillStyle = "rgba(59, 130, 246, 0.4)";
        this.drawRoundedRect(this.ctx, padX, barY, z1W, barH, { tl: 6, bl: 6, tr: 0, br: 0 });
        this.ctx.fill();

        // Zone 2: 15 - 30 m/s (Optimal / Green)
        const z2W = (15 / maxGaugeVel) * availW;
        this.ctx.fillStyle = "rgba(16, 185, 129, 0.7)";
        this.ctx.fillRect(padX + z1W, barY, z2W, barH);

        // Zone 3: 30 - 45 m/s (High / Amber)
        const z3W = (15 / maxGaugeVel) * availW;
        this.ctx.fillStyle = "rgba(245, 158, 11, 0.6)";
        this.ctx.fillRect(padX + z1W + z2W, barY, z3W, barH);

        // Zone 4: 45 - 60 m/s (Excessive / Red)
        const z4W = availW - z1W - z2W - z3W;
        this.ctx.fillStyle = "rgba(239, 68, 68, 0.6)";
        this.drawRoundedRect(this.ctx, padX + z1W + z2W + z3W, barY, z4W, barH, { tl: 0, bl: 0, tr: 6, br: 6 });
        this.ctx.fill();

        // Marker for actual velocity
        const markerX = Math.min(this.width - padX, Math.max(padX, padX + (vel / maxGaugeVel) * availW));
        this.ctx.fillStyle = textColor;
        this.ctx.beginPath();
        this.ctx.moveTo(markerX, barY - 4);
        this.ctx.lineTo(markerX - 6, barY - 14);
        this.ctx.lineTo(markerX + 6, barY - 14);
        this.ctx.closePath();
        this.ctx.fill();

        this.ctx.font = '700 12px Inter, system-ui, sans-serif';
        this.ctx.fillStyle = statusColor;
        const velTag = `${vel.toFixed(1)} m/s`;
        const velTagW = this.ctx.measureText(velTag).width;
        this.ctx.fillText(velTag, Math.max(padX, Math.min(this.width - padX - velTagW, markerX - (velTagW / 2))), barY - 18);

        // Gauge Ticks
        this.ctx.font = '500 10px Inter, system-ui, sans-serif';
        this.ctx.fillStyle = mutedColor;
        if (isMobile) {
            this.ctx.fillText("0", padX, barY + barH + 14);
            this.ctx.fillText("15", padX + z1W - 6, barY + barH + 14);
            this.ctx.fillText("30", padX + z1W + z2W - 6, barY + barH + 14);
            this.ctx.fillText("45", padX + z1W + z2W + z3W - 6, barY + barH + 14);
            this.ctx.fillText("60 m/s", this.width - padX - 28, barY + barH + 14);
        } else {
            this.ctx.fillText("0 m/s", padX, barY + barH + 14);
            this.ctx.fillText("15 (Low)", padX + z1W - 18, barY + barH + 14);
            this.ctx.fillText("30 (Optimal)", padX + z1W + z2W - 24, barY + barH + 14);
            this.ctx.fillText("45 (High)", padX + z1W + z2W + z3W - 20, barY + barH + 14);
            this.ctx.fillText("60 m/s", this.width - padX - 30, barY + barH + 14);
        }

        // 3. Pressure Drop Indicator Section
        const dpY = barY + barH + 38;
        this.ctx.font = '600 13px Inter, system-ui, sans-serif';
        this.ctx.fillStyle = textColor;
        const dpHeader = isMobile ? "Pressure Drop Gradient (Darcy-Weisbach)" : "Frictional Pressure Drop Gradient (Darcy-Weisbach)";
        this.ctx.fillText(dpHeader, padX, dpY + 12);

        // Pressure Drop Bar
        const dpBarY = dpY + 24;
        const maxDp = 1.0; // scale up to 1.0 bar/100m
        const normDpW = (0.2 / maxDp) * availW;

        // Track
        this.ctx.fillStyle = gridColor;
        this.drawRoundedRect(this.ctx, padX, dpBarY, availW, 16, 6);
        this.ctx.fill();

        // Normal zone highlight (0 to 0.2 bar/100m)
        this.ctx.fillStyle = "rgba(16, 185, 129, 0.25)";
        this.ctx.fillRect(padX, dpBarY, normDpW, 16);

        // Actual DP fill
        const actualDpW = Math.min(availW, Math.max(4, (dp / maxDp) * availW));
        this.ctx.fillStyle = dp > 0.35 ? "#ef4444" : (dp > 0.2 ? "#f59e0b" : "#10b981");
        this.drawRoundedRect(this.ctx, padX, dpBarY, actualDpW, 16, 6);
        this.ctx.fill();

        // DP value text
        this.ctx.font = '700 12px Inter, system-ui, sans-serif';
        this.ctx.fillStyle = dp > 0.35 ? "#ef4444" : (dp > 0.2 ? "#f59e0b" : "#10b981");
        const dpText = isMobile ? `${dp.toFixed(3)} bar/100m` : `${dp.toFixed(3)} bar / 100m (${(dp * 4.421).toFixed(2)} psi / 100ft)`;
        const dpTextW = this.ctx.measureText(dpText).width;
        let textX = padX + actualDpW + 10;
        if (textX + dpTextW > this.width - padX) {
            textX = Math.max(padX, this.width - padX - dpTextW);
        }
        this.ctx.fillText(dpText, textX, dpBarY + 12);
    }

    drawRoundedRect(ctx, x, y, width, height, radii) {
        if (width <= 0 || height <= 0) return;
        ctx.beginPath();
        let r = typeof radii === 'number' ? { tl: radii, tr: radii, br: radii, bl: radii } : radii;
        ctx.moveTo(x + (r.tl || 0), y);
        ctx.lineTo(x + width - (r.tr || 0), y);
        if (r.tr) ctx.quadraticCurveTo(x + width, y, x + width, y + r.tr);
        ctx.lineTo(x + width, y + height - (r.br || 0));
        if (r.br) ctx.quadraticCurveTo(x + width, y + height, x + width - r.br, y + height);
        ctx.lineTo(x + (r.bl || 0), y + height);
        if (r.bl) ctx.quadraticCurveTo(x, y + height, x, y + height - r.bl);
        ctx.lineTo(x + (r.tl || 0));
        if (r.tl) ctx.quadraticCurveTo(x, y, x + (r.tl || 0), y);
        ctx.closePath();
    }
}
