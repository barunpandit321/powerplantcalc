// Boiler Efficiency Energy Balance & Heat Loss Distribution Canvas Renderer
export class BoilerChart {
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
        this.height = Math.max(300, rect.height || 340);

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

        const eff = data.efficiency || 83.5;
        const losses = [
            { name: "Dry Flue Gas (L1)", val: data.L1 || 7.5, color: "#ef4444" },
            { name: "H₂ in Fuel (L2)", val: data.L2 || 3.8, color: "#f97316" },
            { name: "Moisture in Fuel & Air (L3+L4)", val: (data.L3 || 2.0) + (data.L4 || 0.3), color: "#eab308" },
            { name: "Radiation & Convection (L6)", val: data.L6 || 1.8, color: "#a855f7" },
            { name: "Ash & Incomplete Combustion (L5+L7)", val: (data.L5 || 0.2) + (data.L7 || 0.9), color: "#64748b" }
        ];

        // 1. Title: Total Energy Balance Bar (100% Heat Input)
        this.ctx.font = '600 13px Inter, system-ui, sans-serif';
        this.ctx.fillStyle = textColor;
        this.ctx.fillText("Overall Heat Balance (100% Fuel Input)", padX, padTop + 14);

        // Subtitle efficiency tag
        const effText = `Useful Energy (Efficiency): ${eff.toFixed(1)}%`;
        this.ctx.font = '700 13px Inter, system-ui, sans-serif';
        this.ctx.fillStyle = '#10b981';
        const effW = this.ctx.measureText(effText).width;
        this.ctx.fillText(effText, this.width - padX - effW, padTop + 14);

        // 2. Draw Stacked 100% Energy Bar
        const barY = padTop + 26;
        const barH = 28;
        let curX = padX;

        // Useful energy segment (Efficiency)
        const usefulW = (eff / 100) * availW;
        this.ctx.fillStyle = '#10b981';
        this.drawRoundedRect(this.ctx, curX, barY, usefulW, barH, { tl: 8, bl: 8, tr: 0, br: 0 });
        this.ctx.fill();

        curX += usefulW;

        // Losses segments
        losses.forEach((l, idx) => {
            const segW = (l.val / 100) * availW;
            this.ctx.fillStyle = l.color;
            const isLast = idx === losses.length - 1;
            this.drawRoundedRect(this.ctx, curX, barY, segW, barH, {
                tl: 0, bl: 0,
                tr: isLast ? 8 : 0,
                br: isLast ? 8 : 0
            });
            this.ctx.fill();
            curX += segW;
        });

        // 3. Section Title: Thermal Losses Breakdown
        const breakdownY = barY + barH + 34;
        this.ctx.font = '600 13px Inter, system-ui, sans-serif';
        this.ctx.fillStyle = textColor;
        this.ctx.fillText("Detailed Thermal Losses Breakdown (% Heat Loss)", padX, breakdownY);

        // 4. Horizontal Breakdown Bars
        const startBarY = breakdownY + 16;
        const rowH = isMobile ? 32 : 36;
        const maxLossVal = Math.max(12, ...losses.map(l => l.val));

        losses.forEach((l, idx) => {
            const y = startBarY + (idx * rowH);

            // Label
            this.ctx.font = '500 12px Inter, system-ui, sans-serif';
            this.ctx.fillStyle = textColor;
            const labelText = isMobile ? l.name.split('(')[0].trim() : l.name;
            this.ctx.fillText(labelText, padX, y + 14);

            // Bar background & progress
            const labelOffset = isMobile ? 130 : 210;
            const barStartX = padX + labelOffset;
            const maxBarW = this.width - padX - barStartX - (isMobile ? 55 : 70);
            const valW = Math.max(4, (l.val / maxLossVal) * maxBarW);

            // Background track
            this.ctx.fillStyle = gridColor;
            this.drawRoundedRect(this.ctx, barStartX, y + 4, maxBarW, 14, 6);
            this.ctx.fill();

            // Progress bar
            this.ctx.fillStyle = l.color;
            this.drawRoundedRect(this.ctx, barStartX, y + 4, valW, 14, 6);
            this.ctx.fill();

            // Value text
            this.ctx.font = '700 12px Inter, system-ui, sans-serif';
            this.ctx.fillStyle = l.color;
            const valStr = `${l.val.toFixed(2)}%`;
            this.ctx.fillText(valStr, barStartX + maxBarW + 10, y + 15);
        });
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
        ctx.lineTo(x, y + (r.tl || 0));
        if (r.tl) ctx.quadraticCurveTo(x, y, x + (r.tl || 0), y);
        ctx.closePath();
    }
}
