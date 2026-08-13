// Cooling Tower Performance Dynamic Chart Renderer
export class CoolingChart {
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
        this.height = Math.max(280, rect.height || 300);

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

        const isMobile = this.width < 480;
        const padLeft = isMobile ? 35 : 50;
        const padRight = isMobile ? 35 : 40;
        const padTop = isMobile ? 45 : 40;
        const padBottom = isMobile ? 45 : 45;

        const chartW = this.width - padLeft - padRight;
        const chartH = this.height - padTop - padBottom;

        const Thot = data.Thot || 40;
        const Tcold = data.Tcold || 32;
        const Twb = data.Twb || 28;

        const minT = Math.floor(Math.min(Twb - 3, 15));
        const maxT = Math.ceil(Math.max(Thot + 5, 50));
        const rangeT = maxT - minT;

        const getX = (t) => padLeft + ((t - minT) / rangeT) * chartW;

        // Draw Temperature Axis Grid Lines & X-Axis Ticks
        this.ctx.lineWidth = 1;
        this.ctx.strokeStyle = gridColor;
        this.ctx.fillStyle = mutedColor;
        this.ctx.font = isMobile ? '10px Inter, sans-serif' : '11px Inter, sans-serif';
        this.ctx.textAlign = 'center';

        const stepCount = isMobile ? 4 : 6;
        const step = Math.ceil(rangeT / stepCount);
        for (let t = minT; t <= maxT; t += step) {
            const x = getX(t);
            this.ctx.beginPath();
            this.ctx.moveTo(x, padTop);
            this.ctx.lineTo(x, padTop + chartH);
            this.ctx.stroke();

            this.ctx.fillText(`${t}°C`, x, padTop + chartH + 20);
        }

        // Positions
        const xHot = getX(Thot);
        const xCold = getX(Tcold);
        const xWb = getX(Twb);

        const baseY = padTop + chartH / 2;
        const barH = isMobile ? 30 : 34;

        // Y-offsets for Bars
        const yBarRange = baseY - (barH + 8);
        const yBarApproach = baseY + 8;

        // 1. Draw Range Bar (Hot to Cold)
        const gradRange = this.ctx.createLinearGradient(xCold, 0, xHot, 0);
        gradRange.addColorStop(0, '#3b82f6');
        gradRange.addColorStop(1, '#ef4444');

        this.ctx.fillStyle = gradRange;
        this.ctx.beginPath();
        this.ctx.roundRect(xCold, yBarRange, Math.max(xHot - xCold, 4), barH, 6);
        this.ctx.fill();

        // 2. Draw Approach Bar (Cold to Wet Bulb)
        const gradApp = this.ctx.createLinearGradient(xWb, 0, xCold, 0);
        gradApp.addColorStop(0, '#06b6d4');
        gradApp.addColorStop(1, '#3b82f6');

        this.ctx.fillStyle = gradApp;
        this.ctx.beginPath();
        this.ctx.roundRect(xWb, yBarApproach, Math.max(xCold - xWb, 4), barH, 6);
        this.ctx.fill();

        // Labels inside Bars (if wide enough)
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = 'bold ' + (isMobile ? '11px' : '12px') + ' Inter, sans-serif';

        if (xHot - xCold > 60) {
            this.ctx.textAlign = 'center';
            const rangeText = isMobile ? `Range: ${(Thot - Tcold).toFixed(1)}°` : `Range: ${(Thot - Tcold).toFixed(1)}°C`;
            this.ctx.fillText(rangeText, (xCold + xHot) / 2, yBarRange + barH / 2 + 4);
        }

        if (xCold - xWb > 60) {
            this.ctx.textAlign = 'center';
            const appText = isMobile ? `App: ${(Tcold - Twb).toFixed(1)}°` : `Approach: ${(Tcold - Twb).toFixed(1)}°C`;
            this.ctx.fillText(appText, (xWb + xCold) / 2, yBarApproach + barH / 2 + 4);
        }

        // Staggered Top / Marker Labels to Avoid Overlaps
        this.ctx.fillStyle = textColor;
        this.ctx.font = 'bold ' + (isMobile ? '10px' : '11px') + ' Inter, sans-serif';

        // Hot Water Inlet Label (Top Above Range Bar)
        const thotStr = isMobile ? `Thot: ${Thot.toFixed(1)}°C` : `Hot Inlet: ${Thot.toFixed(1)}°C`;
        this.ctx.textAlign = (xHot > this.width - 70) ? 'right' : 'center';
        this.ctx.fillText(thotStr, xHot, yBarRange - 6);

        // Cold Water Outlet Label (Staggered Below Range Bar / Above Approach Bar)
        const tcoldStr = isMobile ? `Tcold: ${Tcold.toFixed(1)}°C` : `Cold Outlet: ${Tcold.toFixed(1)}°C`;
        this.ctx.textAlign = 'center';
        // If xHot and xCold are very close, offset Tcold label down
        const tcoldY = (xHot - xCold < 80) ? (yBarRange + barH / 2 + 3) : (yBarRange - 6);
        if (xHot - xCold < 80) {
            // Draw callout tag background for clarity
            this.ctx.fillStyle = isDark ? '#1e293b' : '#e2e8f0';
            const txtWidth = this.ctx.measureText(tcoldStr).width;
            this.ctx.roundRect(xCold - txtWidth / 2 - 4, yBarRange - 18, txtWidth + 8, 16, 4);
            this.ctx.fill();
            this.ctx.fillStyle = textColor;
            this.ctx.fillText(tcoldStr, xCold, yBarRange - 6);
        } else {
            this.ctx.fillText(tcoldStr, xCold, yBarRange - 6);
        }

        // Wet Bulb Label (Below Approach Bar)
        const twbStr = isMobile ? `Twb: ${Twb.toFixed(1)}°C` : `Wet Bulb: ${Twb.toFixed(1)}°C`;
        this.ctx.textAlign = (xWb < 60) ? 'left' : 'center';
        this.ctx.fillText(twbStr, xWb, yBarApproach + barH + 15);
    }
}

