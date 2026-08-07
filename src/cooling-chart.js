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

        const padLeft = 60;
        const padRight = 30;
        const padTop = 40;
        const padBottom = 50;

        const chartW = this.width - padLeft - padRight;
        const chartH = this.height - padTop - padBottom;

        const Thot = data.Thot || 40;
        const Tcold = data.Tcold || 32;
        const Twb = data.Twb || 28;

        const minT = Math.floor(Math.min(Twb - 3, 15));
        const maxT = Math.ceil(Math.max(Thot + 5, 50));
        const rangeT = maxT - minT;

        const getX = (t) => padLeft + ((t - minT) / rangeT) * chartW;

        // Draw Temperature Axis Lines
        this.ctx.lineWidth = 1;
        this.ctx.strokeStyle = gridColor;
        this.ctx.fillStyle = mutedColor;
        this.ctx.font = '12px Inter, sans-serif';
        this.ctx.textAlign = 'center';

        const step = Math.ceil(rangeT / 6);
        for (let t = minT; t <= maxT; t += step) {
            const x = getX(t);
            this.ctx.beginPath();
            this.ctx.moveTo(x, padTop);
            this.ctx.lineTo(x, padTop + chartH);
            this.ctx.stroke();

            this.ctx.fillText(`${t}°C`, x, padTop + chartH + 20);
        }

        // Draw Baseline
        const baseY = padTop + chartH / 2;

        // Draw Range Bar (Hot to Cold) - Red to Blue Gradient
        const xHot = getX(Thot);
        const xCold = getX(Tcold);
        const xWb = getX(Twb);

        const barH = 36;
        const yBar1 = baseY - 30;

        const gradRange = this.ctx.createLinearGradient(xCold, 0, xHot, 0);
        gradRange.addColorStop(0, '#3b82f6');
        gradRange.addColorStop(1, '#ef4444');

        this.ctx.fillStyle = gradRange;
        this.ctx.beginPath();
        this.ctx.roundRect(xCold, yBar1, Math.max(xHot - xCold, 4), barH, 8);
        this.ctx.fill();

        // Draw Approach Bar (Cold to Wet Bulb) - Blue to Cyan Gradient
        const yBar2 = baseY + 14;
        const gradApp = this.ctx.createLinearGradient(xWb, 0, xCold, 0);
        gradApp.addColorStop(0, '#06b6d4');
        gradApp.addColorStop(1, '#3b82f6');

        this.ctx.fillStyle = gradApp;
        this.ctx.beginPath();
        this.ctx.roundRect(xWb, yBar2, Math.max(xCold - xWb, 4), barH, 8);
        this.ctx.fill();

        // Draw Markers & Text
        this.ctx.fillStyle = textColor;
        this.ctx.font = 'bold 12px Inter, sans-serif';

        // Hot Water Marker
        this.ctx.textAlign = 'center';
        this.ctx.fillText(`Hot Inlet: ${Thot.toFixed(1)}°C`, xHot, yBar1 - 8);

        // Cold Water Marker
        this.ctx.fillText(`Cold Outlet: ${Tcold.toFixed(1)}°C`, xCold, yBar1 - 8);

        // Wet Bulb Marker
        this.ctx.fillText(`Wet Bulb: ${Twb.toFixed(1)}°C`, xWb, yBar2 + barH + 18);

        // Labels inside/above Bars
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = 'bold 13px Inter, sans-serif';
        if (xHot - xCold > 70) {
            this.ctx.fillText(`Range: ${(Thot - Tcold).toFixed(1)}°C`, (xCold + xHot) / 2, yBar1 + 22);
        }
        if (xCold - xWb > 70) {
            this.ctx.fillText(`Approach: ${(Tcold - Twb).toFixed(1)}°C`, (xWb + xCold) / 2, yBar2 + 22);
        }
    }
}
