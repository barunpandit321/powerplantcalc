import { initNavbar } from "./navbar.js";
import { CoolingChart } from "./cooling-chart.js";
import { detectUserZone, getCoolingDefaultsForZone, prioritizeUnits } from "./geo.js";

const COOLING_STORAGE_KEY = "cooling_calculator_user_units_v1";

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

    // Detect Regional Defaults (US vs Europe vs India)
    let currentZone = detectUserZone();
    const geoDefaults = getCoolingDefaultsForZone(currentZone);

    // 1-Click Operating Presets
    const COOLING_PRESETS = {
        "us-10000gpm": {
            temp: "F",
            thot: "105",
            tcold: "85",
            twb: "78",
            flow: "10000",
            flowUnit: "gpm",
            flowOutUnit: "gpm",
            heatUnit: "tr",
            coc: "3.5"
        },
        "us-2500gpm": {
            temp: "F",
            thot: "95",
            tcold: "85",
            twb: "78",
            flow: "2500",
            flowUnit: "gpm",
            flowOutUnit: "gpm",
            heatUnit: "tr",
            coc: "4.0"
        },
        "us-1000gpm": {
            temp: "F",
            thot: "95",
            tcold: "85",
            twb: "75",
            flow: "1000",
            flowUnit: "gpm",
            flowOutUnit: "gpm",
            heatUnit: "tr",
            coc: "4.5"
        },
        "eu-2500m3h": {
            temp: "C",
            thot: "40",
            tcold: "32",
            twb: "28",
            flow: "2500",
            flowUnit: "m3h",
            flowOutUnit: "m3h",
            heatUnit: "mw",
            coc: "3.5"
        },
        "eu-500m3h": {
            temp: "C",
            thot: "38",
            tcold: "30",
            twb: "26",
            flow: "500",
            flowUnit: "m3h",
            flowOutUnit: "m3h",
            heatUnit: "mw",
            coc: "4.0"
        }
    };

    // Load saved preferences if any
    let savedPrefs = null;
    try {
        const raw = localStorage.getItem(COOLING_STORAGE_KEY);
        if (raw) savedPrefs = JSON.parse(raw);
    } catch (e) { }

    const activeTempUnit = (savedPrefs && savedPrefs.temp) || geoDefaults.temp;
    const activeFlowUnit = (savedPrefs && savedPrefs.flow) || geoDefaults.flow;
    const activeFlowOutUnit = (savedPrefs && savedPrefs.flowOut) || geoDefaults.flowOut;
    const activeHeatUnit = (savedPrefs && savedPrefs.heat) || geoDefaults.heat;
    const activeRangeUnit = (savedPrefs && savedPrefs.rangeUnit) || geoDefaults.rangeUnit;
    const activeApproachUnit = (savedPrefs && savedPrefs.approachUnit) || geoDefaults.approachUnit;

    function populateAllSelects(zone) {
        populateSelect(unitTemp, TEMP_UNITS, activeTempUnit, "temperature", zone);
        populateSelect(unitThot, TEMP_UNITS, activeTempUnit, "temperature", zone);
        populateSelect(unitTcold, TEMP_UNITS, activeTempUnit, "temperature", zone);
        populateSelect(unitTwb, TEMP_UNITS, activeTempUnit, "temperature", zone);

        populateSelect(unitRangeSelect, DELTA_TEMP_UNITS, activeRangeUnit, "temperature", zone);
        populateSelect(unitApproachSelect, DELTA_TEMP_UNITS, activeApproachUnit, "temperature", zone);

        populateSelect(unitFlow, FLOW_UNITS, activeFlowUnit, "flow", zone);
        populateSelect(unitFlowOutSelect, FLOW_UNITS, activeFlowOutUnit, "flow", zone);
        populateSelect(unitHeatSelect, HEAT_UNITS, activeHeatUnit, "heat", zone);
    }

    populateAllSelects(currentZone);

    function populateSelect(sel, table, defaultVal, unitType, zone = currentZone) {
        if (!sel) return;
        sel.innerHTML = "";
        const rawList = Object.keys(table).map(k => ({ id: k, name: table[k].name }));
        const list = unitType ? prioritizeUnits(rawList, zone, unitType) : rawList;
        list.forEach(item => {
            const opt = document.createElement("option");
            opt.value = item.id;
            opt.textContent = item.name;
            if (item.id === defaultVal) opt.selected = true;
            sel.appendChild(opt);
        });
    }

    function saveCoolingPreferences() {
        try {
            const prefs = {
                temp: unitTemp ? unitTemp.value : "C",
                flow: unitFlow ? unitFlow.value : "m3h",
                flowOut: unitFlowOutSelect ? unitFlowOutSelect.value : "m3h",
                heat: unitHeatSelect ? unitHeatSelect.value : "mw",
                rangeUnit: unitRangeSelect ? unitRangeSelect.value : "C",
                approachUnit: unitApproachSelect ? unitApproachSelect.value : "C"
            };
            localStorage.setItem(COOLING_STORAGE_KEY, JSON.stringify(prefs));
        } catch (e) { }
    }

    function applyCoolingPreset(presetKey) {
        const p = COOLING_PRESETS[presetKey];
        if (!p) return;

        if (unitTemp) unitTemp.value = p.temp;
        if (unitThot) unitThot.value = p.temp;
        if (unitTcold) unitTcold.value = p.temp;
        if (unitTwb) unitTwb.value = p.temp;
        if (unitRangeSelect) unitRangeSelect.value = p.temp;
        if (unitApproachSelect) unitApproachSelect.value = p.temp;

        if (unitFlow) unitFlow.value = p.flowUnit;
        if (unitFlowOutSelect) unitFlowOutSelect.value = p.flowOutUnit;
        if (unitHeatSelect) unitHeatSelect.value = p.heatUnit;

        if (inputThot) inputThot.value = p.thot;
        if (inputTcold) inputTcold.value = p.tcold;
        if (inputTwb) inputTwb.value = p.twb;
        if (inputFlow) inputFlow.value = p.flow;
        if (inputCoc) inputCoc.value = p.coc;

        document.querySelectorAll("[data-cooling-preset]").forEach(btn => {
            if (btn.getAttribute("data-cooling-preset") === presetKey) {
                btn.classList.add("active");
            } else {
                btn.classList.remove("active");
            }
        });

        saveCoolingPreferences();
        calculate();
    }

    document.querySelectorAll("[data-cooling-preset]").forEach(btn => {
        btn.addEventListener("click", () => {
            const key = btn.getAttribute("data-cooling-preset");
            if (key) applyCoolingPreset(key);
        });
    });

    // Set regional initial input values if not previously set
    if (!savedPrefs) {
        if (currentZone === "US") {
            applyCoolingPreset("us-10000gpm");
        } else {
            applyCoolingPreset("eu-2500m3h");
        }
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
            saveCoolingPreferences();
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

    calculateBtn.addEventListener("click", () => {
        saveCoolingPreferences();
        calculate();
    });

    [inputThot, inputTcold, inputTwb, inputFlow, inputCoc, inputTdsBasin, inputTdsMakeup].forEach(el => {
        if (el) el.addEventListener("input", calculate);
    });

    [unitThot, unitTcold, unitTwb, unitFlow, unitHeatSelect, unitFlowOutSelect, unitRangeSelect, unitApproachSelect].forEach(el => {
        if (el) el.addEventListener("change", () => {
            saveCoolingPreferences();
            calculate();
        });
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

    // Listen for Global Unit System Changes from Navbar
    window.addEventListener("unitSystemChanged", (e) => {
        currentZone = e.detail && e.detail.system === "US" ? "US" : "EU";
        const defaults = getCoolingDefaultsForZone(currentZone);

        populateSelect(unitTemp, TEMP_UNITS, defaults.temp, "temperature", currentZone);
        populateSelect(unitThot, TEMP_UNITS, defaults.temp, "temperature", currentZone);
        populateSelect(unitTcold, TEMP_UNITS, defaults.temp, "temperature", currentZone);
        populateSelect(unitTwb, TEMP_UNITS, defaults.temp, "temperature", currentZone);

        populateSelect(unitRangeSelect, DELTA_TEMP_UNITS, defaults.rangeUnit, "temperature", currentZone);
        populateSelect(unitApproachSelect, DELTA_TEMP_UNITS, defaults.approachUnit, "temperature", currentZone);

        populateSelect(unitFlow, FLOW_UNITS, defaults.flow, "flow", currentZone);
        populateSelect(unitFlowOutSelect, FLOW_UNITS, defaults.flowOut, "flow", currentZone);
        populateSelect(unitHeatSelect, HEAT_UNITS, defaults.heat, "heat", currentZone);

        if (currentZone === "US") {
            applyCoolingPreset("us-10000gpm");
        } else {
            applyCoolingPreset("eu-2500m3h");
        }
    });
});

