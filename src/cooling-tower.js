import { initNavbar } from "./navbar.js";
import { CoolingChart } from "./cooling-chart.js";

// Unit Conversion Tables
const TEMP_UNITS = {
    C: { name: "°C", toBase: t => t, fromBase: t => t },
    F: { name: "°F", toBase: t => (t - 32) * (5 / 9), fromBase: t => t * (9 / 5) + 32 },
    K: { name: "K", toBase: t => t - 273.15, fromBase: t => t + 273.15 },
    R: { name: "°R", toBase: t => (t - 491.67) * (5 / 9), fromBase: t => t * (9 / 5) + 491.67 }
};

const DELTA_TEMP_UNITS = {
    C: { name: "°C", factor: 1 },
    F: { name: "°F", factor: 1.8 },
    K: { name: "K", factor: 1 },
    R: { name: "°R", factor: 1.8 }
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
    const unitThot = document.getElementById("unitThot");
    const unitTcold = document.getElementById("unitTcold");
    const unitTwb = document.getElementById("unitTwb");
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

    const unitRangeSelect = document.getElementById("unit-range");
    const unitApproachSelect = document.getElementById("unit-approach");
    const unitHeatSelect = document.getElementById("unit-heat");
    const unitFlowOutSelect = document.getElementById("unit-flow-out");

    // Populate Selects
    populateSelect(unitTemp, TEMP_UNITS, "C");
    populateSelect(unitThot, TEMP_UNITS, "C");
    populateSelect(unitTcold, TEMP_UNITS, "C");
    populateSelect(unitTwb, TEMP_UNITS, "C");

    populateSelect(unitRangeSelect, DELTA_TEMP_UNITS, "C");
    populateSelect(unitApproachSelect, DELTA_TEMP_UNITS, "C");

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

    // Global Master Temperature Unit Select
    if (unitTemp) {
        unitTemp.addEventListener("change", () => {
            const val = unitTemp.value;
            if (unitThot) unitThot.value = val;
            if (unitTcold) unitTcold.value = val;
            if (unitTwb) unitTwb.value = val;
            if (unitRangeSelect) unitRangeSelect.value = val;
            if (unitApproachSelect) unitApproachSelect.value = val;
            calculate();
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

    [unitThot, unitTcold, unitTwb, unitFlow, unitHeatSelect, unitFlowOutSelect, unitRangeSelect, unitApproachSelect].forEach(el => {
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
        const uThot = TEMP_UNITS[unitThot.value] || TEMP_UNITS.C;
        const uTcold = TEMP_UNITS[unitTcold.value] || TEMP_UNITS.C;
        const uTwb = TEMP_UNITS[unitTwb.value] || TEMP_UNITS.C;
        const uFlow = FLOW_UNITS[unitFlow.value] || FLOW_UNITS.m3h;

        const valThot = parseFloat(inputThot.value) || 40;
        const valTcold = parseFloat(inputTcold.value) || 32;
        const valTwb = parseFloat(inputTwb.value) || 28;
        const valFlow = parseFloat(inputFlow.value) || 2500;

        // Convert all temperatures to Base (°C) for core calculations
        const ThotC = uThot.toBase(valThot);
        const TcoldC = uTcold.toBase(valTcold);
        const TwbC = uTwb.toBase(valTwb);
        const flowM3H = uFlow.toBase(valFlow);

        // Calculate Range & Approach in °C
        const rangeC = ThotC - TcoldC;
        const approachC = TcoldC - TwbC;
        const efficiency = (rangeC + approachC) > 0 ? (rangeC / (rangeC + approachC)) * 100 : 0;

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
        const evapM3H = 0.00085 * flowM3H * rangeC;
        const blowdownM3H = coc > 1 ? evapM3H / (coc - 1) : 0;
        const driftM3H = 0.0005 * flowM3H; // 0.05% drift loss
        const makeupM3H = evapM3H + blowdownM3H + driftM3H;

        // Heat Rejection: Q_heat (MWth) = m_dot (kg/s) * Cp (4.186 kJ/kg°C) * Range(°C) / 1000
        const mdotKgS = (flowM3H * 1000) / 3600;
        const heatMW = (mdotKgS * 4.1868 * rangeC) / 1000; // MWth

        // Output Formatting
        const uRange = DELTA_TEMP_UNITS[unitRangeSelect.value] || DELTA_TEMP_UNITS.C;
        const uApproach = DELTA_TEMP_UNITS[unitApproachSelect.value] || DELTA_TEMP_UNITS.C;
        const outFlowConv = FLOW_UNITS[unitFlowOutSelect.value] || FLOW_UNITS.m3h;
        const outHeatConv = HEAT_UNITS[unitHeatSelect.value] || HEAT_UNITS.mw;

        outRange.textContent = `${(rangeC * uRange.factor).toFixed(2)} ${uRange.name}`;
        outApproach.textContent = `${(approachC * uApproach.factor).toFixed(2)} ${uApproach.name}`;
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

