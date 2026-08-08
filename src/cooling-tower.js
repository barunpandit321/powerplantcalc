import { initNavbar } from "./navbar.js";
import { CoolingChart } from "./cooling-chart.js";

// Unit Conversion Tables
const TEMP_UNITS = {
    C: { name: "°C", toBase: t => t, fromBase: t => t },
    F: { name: "°F", toBase: t => (t - 32) * (5 / 9), fromBase: t => t * (9 / 5) + 32 },
    K: { name: "K", toBase: t => t - 273.15, fromBase: t => t + 273.15 }
};

const FLOW_UNITS = {
    m3h: { name: "m³/hr", toBase: q => q, fromBase: q => q },
    gpm: { name: "GPM (US)", toBase: q => q * 0.227124, fromBase: q => q / 0.227124 },
    tph: { name: "TPH (Tons/hr)", toBase: q => q, fromBase: q => q },
    lph: { name: "LPH (Liters/hr)", toBase: q => q / 1000, fromBase: q => q * 1000 }
};

const HEAT_UNITS = {
    mw: { name: "MW (thermal)", factor: 1 },
    gcal: { name: "Gcal/hr", factor: 0.859845 },
    tr: { name: "TR (Refrigeration Tons)", factor: 284.345 },
    btu: { name: "MMBtu/hr", factor: 3.41214 }
};

document.addEventListener("DOMContentLoaded", () => {
    initNavbar();

    const chart = new CoolingChart("coolingChart");

    // Elements
    const modeSelect = document.getElementById("mode");
    const inputThot = document.getElementById("inputThot");
    const inputTcold = document.getElementById("inputTcold");
    const inputTwb = document.getElementById("inputTwb");
    const inputFlow = document.getElementById("inputFlow");
    const inputCoc = document.getElementById("inputCoc");
    const inputTdsBasin = document.getElementById("inputTdsBasin");
    const inputTdsMakeup = document.getElementById("inputTdsMakeup");

    const unitTemp = document.getElementById("unitTemp");
    const unitFlow = document.getElementById("unitFlow");

    const chemistryGroup = document.getElementById("chemistryGroup");
    const directCocGroup = document.getElementById("directCocGroup");

    const calculateBtn = document.getElementById("calculateBtn");
    const shareBtn = document.getElementById("shareLinkBtn");
    const printBtn = document.getElementById("printReportBtn");

    // Output Cards
    const outRange = document.getElementById("outRange");
    const outApproach = document.getElementById("outApproach");
    const outEfficiency = document.getElementById("outEfficiency");
    const outCoc = document.getElementById("outCoc");
    const outEvap = document.getElementById("outEvap");
    const outBlowdown = document.getElementById("outBlowdown");
    const outMakeup = document.getElementById("outMakeup");
    const outHeat = document.getElementById("outHeat");

    const unitHeatSelect = document.getElementById("unit-heat");
    const unitFlowOutSelect = document.getElementById("unit-flow-out");

    // Populate Selects
    populateSelect(unitTemp, TEMP_UNITS, "C");
    populateSelect(unitFlow, FLOW_UNITS, "m3h");
    populateSelect(unitFlowOutSelect, FLOW_UNITS, "m3h");

    if (unitHeatSelect) {
        Object.keys(HEAT_UNITS).forEach(k => {
            const opt = document.createElement("option");
            opt.value = k;
            opt.textContent = HEAT_UNITS[k].name;
            unitHeatSelect.appendChild(opt);
        });
    }

    function populateSelect(sel, table, defaultVal) {
        if (!sel) return;
        sel.innerHTML = "";
        Object.keys(table).forEach(k => {
            const opt = document.createElement("option");
            opt.value = k;
            opt.textContent = table[k].name;
            if (k === defaultVal) opt.selected = true;
            sel.appendChild(opt);
        });
    }

    // Toggle Mode
    modeSelect.addEventListener("change", () => {
        if (modeSelect.value === "direct") {
            directCocGroup.style.display = "block";
            chemistryGroup.style.display = "none";
        } else {
            directCocGroup.style.display = "none";
            chemistryGroup.style.display = "grid";
        }
        calculate();
    });

    calculateBtn.addEventListener("click", calculate);

    [inputThot, inputTcold, inputTwb, inputFlow, inputCoc, inputTdsBasin, inputTdsMakeup].forEach(el => {
        if (el) el.addEventListener("input", calculate);
    });

    [unitTemp, unitFlow, unitHeatSelect, unitFlowOutSelect].forEach(el => {
        if (el) el.addEventListener("change", calculate);
    });

    // Parse URL Params for 1-click sharing
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has("th")) inputThot.value = urlParams.get("th");
    if (urlParams.has("tc")) inputTcold.value = urlParams.get("tc");
    if (urlParams.has("twb")) inputTwb.value = urlParams.get("twb");
    if (urlParams.has("q")) inputFlow.value = urlParams.get("q");

    calculate();

    function calculate() {
        const uTemp = TEMP_UNITS[unitTemp.value] || TEMP_UNITS.C;
        const uFlow = FLOW_UNITS[unitFlow.value] || FLOW_UNITS.m3h;

        const valThot = parseFloat(inputThot.value) || 40;
        const valTcold = parseFloat(inputTcold.value) || 32;
        const valTwb = parseFloat(inputTwb.value) || 28;
        const valFlow = parseFloat(inputFlow.value) || 2500;

        // Convert to Base (°C and m³/hr)
        const ThotC = uTemp.toBase(valThot);
        const TcoldC = uTemp.toBase(valTcold);
        const TwbC = uTemp.toBase(valTwb);
        const flowM3H = uFlow.toBase(valFlow);

        // Update static unit labels
        document.querySelectorAll(".static-unit").forEach(el => {
            el.textContent = uTemp.name;
        });

        // Calculate Range & Approach in °C
        const rangeC = ThotC - TcoldC;
        const approachC = TcoldC - TwbC;
        const efficiency = (rangeC / (rangeC + approachC)) * 100;

        // Calculate CoC
        let coc = 3.5;
        if (modeSelect.value === "direct") {
            coc = parseFloat(inputCoc.value) || 3.5;
        } else {
            const tdsB = parseFloat(inputTdsBasin.value) || 1050;
            const tdsM = parseFloat(inputTdsMakeup.value) || 300;
            coc = tdsM > 0 ? tdsB / tdsM : 3.5;
        }

        // Water Losses (m³/hr)
        // Evaporation loss E = 0.00085 * Q * Range(°C)
        const evapM3H = 0.00085 * flowM3H * rangeC;
        const blowdownM3H = coc > 1 ? evapM3H / (coc - 1) : 0;
        const driftM3H = 0.0005 * flowM3H; // 0.05% drift loss
        const makeupM3H = evapM3H + blowdownM3H + driftM3H;

        // Heat Rejection: Q_heat (MWth) = m_dot (kg/s) * Cp (4.186 kJ/kg°C) * Range(°C) / 1000
        // flow m³/hr = flow * 1000 kg/hr = (flow * 1000 / 3600) kg/s
        const mdotKgS = (flowM3H * 1000) / 3600;
        const heatMW = (mdotKgS * 4.1868 * rangeC) / 1000; // MWth

        // Output Formatting
        const outFlowConv = FLOW_UNITS[unitFlowOutSelect.value] || FLOW_UNITS.m3h;
        const outHeatConv = HEAT_UNITS[unitHeatSelect.value] || HEAT_UNITS.mw;

        outRange.textContent = `${rangeC.toFixed(2)} °C / ${(rangeC * 1.8).toFixed(2)} °F`;
        outApproach.textContent = `${approachC.toFixed(2)} °C / ${(approachC * 1.8).toFixed(2)} °F`;
        outEfficiency.textContent = `${efficiency.toFixed(1)} %`;
        outCoc.textContent = coc.toFixed(2);

        outEvap.textContent = outFlowConv.fromBase(evapM3H).toFixed(2);
        outBlowdown.textContent = outFlowConv.fromBase(blowdownM3H).toFixed(2);
        outMakeup.textContent = outFlowConv.fromBase(makeupM3H).toFixed(2);
        outHeat.textContent = (heatMW * outHeatConv.factor).toFixed(2);

        // Render Canvas Chart
        chart.render({ Thot: ThotC, Tcold: TcoldC, Twb: TwbC });
    }

    // Share Deep-Link
    if (shareBtn) {
        shareBtn.addEventListener("click", () => {
            const params = new URLSearchParams();
            params.set("th", inputThot.value);
            params.set("tc", inputTcold.value);
            params.set("twb", inputTwb.value);
            params.set("q", inputFlow.value);

            const shareUrl = `${window.location.origin}${window.location.pathname}?${params.toString()}`;
            navigator.clipboard.writeText(shareUrl).then(() => {
                const toast = document.getElementById("toast");
                if (toast) {
                    toast.classList.add("show");
                    setTimeout(() => toast.classList.remove("show"), 3000);
                }
            });
        });
    }

    // Export Print Report
    if (printBtn) {
        printBtn.addEventListener("click", () => {
            window.print();
        });
    }
});
