import "../style.css";
import { calculate } from "./steam.js";
import { UNITS, UNIT_TYPES, convertToBase, convertFromBase } from "./units.js";
import { solvePx } from "iapws-if97";
import { drawThermodynamicChart } from "./chart.js";
import { initNavbar } from "./navbar.js";
import { detectUserZone, getSteamDefaultsForZone, prioritizeUnits } from "./geo.js";

const STORAGE_KEY = "steam_calculator_user_units_v1";

const modeSelect = document.getElementById("mode");
const input1 = document.getElementById("input1");
const input2 = document.getElementById("input2");
const unit1Select = document.getElementById("unit1");
const unit2Select = document.getElementById("unit2");
const label1 = document.getElementById("label1");
const label2 = document.getElementById("label2");
const calculateBtn = document.getElementById("calculateBtn");
const shareLinkBtn = document.getElementById("shareLinkBtn");
const printReportBtn = document.getElementById("printReportBtn");
const toastEl = document.getElementById("toast");

// Result DOM elements
const regionEl = document.getElementById("region");
const pressureResultEl = document.getElementById("pressureResult");
const temperatureResultEl = document.getElementById("temperatureResult");
const tsatEl = document.getElementById("tsat");
const superheatEl = document.getElementById("superheat");
const qualityEl = document.getElementById("quality");
const enthalpyEl = document.getElementById("enthalpy");
const entropyEl = document.getElementById("entropy");
const volumeEl = document.getElementById("volume");
const densityEl = document.getElementById("density");
const internalEnergyEl = document.getElementById("internalEnergy");
const cpEl = document.getElementById("cp");
const cvEl = document.getElementById("cv");
const soundEl = document.getElementById("sound");
const viscosityEl = document.getElementById("viscosity");
const conductivityEl = document.getElementById("conductivity");

// Chart Tab Elements
const tabHs = document.getElementById("tabHs");
const tabTs = document.getElementById("tabTs");
let activeChartType = "hs";

// Store current computed state in base units
let currentState = null;

const modeConfigs = {
    PT: { label1: "Pressure", unitType1: UNIT_TYPES.PRESSURE, label2: "Temperature", unitType2: UNIT_TYPES.TEMPERATURE, p1: "70", p2: "490" },
    PH: { label1: "Pressure", unitType1: UNIT_TYPES.PRESSURE, label2: "Enthalpy", unitType2: UNIT_TYPES.ENTHALPY, p1: "70", p2: "747" },
    PS: { label1: "Pressure", unitType1: UNIT_TYPES.PRESSURE, label2: "Entropy", unitType2: UNIT_TYPES.ENTROPY, p1: "70", p2: "1.63" },
    HS: { label1: "Enthalpy", unitType1: UNIT_TYPES.ENTHALPY, label2: "Entropy", unitType2: UNIT_TYPES.ENTROPY, p1: "747", p2: "1.63" },
    TH: { label1: "Temperature", unitType1: UNIT_TYPES.TEMPERATURE, label2: "Enthalpy", unitType2: UNIT_TYPES.ENTHALPY, p1: "490", p2: "747" },
    TS: { label1: "Temperature", unitType1: UNIT_TYPES.TEMPERATURE, label2: "Entropy", unitType2: UNIT_TYPES.ENTROPY, p1: "490", p2: "1.63" },
    PX: { label1: "Pressure", unitType1: UNIT_TYPES.PRESSURE, label2: "Vapor Quality (x)", unitType2: UNIT_TYPES.QUALITY, p1: "70", p2: "1.0" },
    TX: { label1: "Temperature", unitType1: UNIT_TYPES.TEMPERATURE, label2: "Vapor Quality (x)", unitType2: UNIT_TYPES.QUALITY, p1: "490", p2: "1.0" }
};

/**
 * Toast Notification Helper
 */
function showToast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    setTimeout(() => {
        toastEl.classList.remove("show");
    }, 2500);
}

/**
 * Render Active Thermodynamic Chart
 */
function updateChart() {
    const isDarkMode = document.documentElement.getAttribute("data-theme") !== "light";
    drawThermodynamicChart("steamChart", currentState, activeChartType, isDarkMode);
}

/**
 * Detects location/locale defaults if no user preferences are saved.
 */
function detectUserLocaleDefaults() {
    const zone = detectUserZone();
    return getSteamDefaultsForZone(zone);
}

/**
 * Load user preferences from LocalStorage
 */
function loadUserPreferences() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
            return JSON.parse(raw);
        }
    } catch (e) {
        console.error("Failed to load user preferences:", e);
    }
    return null;
}

/**
 * Save user preferences (including entered input values) to LocalStorage
 */
function saveUserPreferences() {
    try {
        const prefs = loadUserPreferences() || {};
        prefs.mode = modeSelect.value;

        prefs.inputUnits = prefs.inputUnits || {};
        prefs.inputUnits[modeSelect.value] = {
            unit1: unit1Select.value,
            unit2: unit2Select.value
        };

        prefs.inputValues = prefs.inputValues || {};
        prefs.inputValues[modeSelect.value] = {
            val1: input1.value,
            val2: input2.value
        };

        prefs.outputUnits = prefs.outputUnits || {};
        const outputSelects = document.querySelectorAll(".unit-select");
        outputSelects.forEach(select => {
            if (select.id && select.value) {
                prefs.outputUnits[select.id] = select.value;
            }
        });

        localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    } catch (e) {
        console.error("Failed to save user preferences:", e);
    }
}

function populateSelectOptions(selectEl, unitType, defaultUnitId) {
    if (!selectEl) return;
    selectEl.innerHTML = "";
    const zone = detectUserZone();
    const rawOptions = UNITS[unitType] || [];
    const options = prioritizeUnits(rawOptions, zone, unitType);
    options.forEach(opt => {
        const optionEl = document.createElement("option");
        optionEl.value = opt.id;
        optionEl.textContent = opt.label;
        if (opt.id === defaultUnitId) {
            optionEl.selected = true;
        }
        selectEl.appendChild(optionEl);
    });
}

function updateInputMode() {
    const mode = modeSelect.value;
    const config = modeConfigs[mode] || modeConfigs.PT;

    const prefs = loadUserPreferences();
    const defaults = detectUserLocaleDefaults();

    let p1Placeholder = config.p1;
    let p2Placeholder = config.p2;

    if (mode === "PT" && defaults.defaultP1 && defaults.defaultP2) {
        p1Placeholder = defaults.defaultP1;
        p2Placeholder = defaults.defaultP2;
    }

    label1.textContent = config.label1;
    label2.textContent = config.label2;
    input1.placeholder = p1Placeholder;
    input2.placeholder = p2Placeholder;

    let targetUnit1 = null;
    let targetUnit2 = null;

    if (prefs && prefs.inputUnits && prefs.inputUnits[mode]) {
        targetUnit1 = prefs.inputUnits[mode].unit1;
        targetUnit2 = prefs.inputUnits[mode].unit2;
    } else {
        targetUnit1 = defaults[config.unitType1] || UNITS[config.unitType1][0].id;
        targetUnit2 = defaults[config.unitType2] || UNITS[config.unitType2][0].id;
    }

    if (prefs && prefs.inputValues && prefs.inputValues[mode]) {
        input1.value = prefs.inputValues[mode].val1 !== undefined ? prefs.inputValues[mode].val1 : "";
        input2.value = prefs.inputValues[mode].val2 !== undefined ? prefs.inputValues[mode].val2 : "";
    } else {
        // Pre-fill initial defaults if first time
        if (mode === "PT" && (!prefs || !prefs.inputValues)) {
            input1.value = p1Placeholder;
            input2.value = p2Placeholder;
        } else {
            input1.value = "";
            input2.value = "";
        }
    }

    populateSelectOptions(unit1Select, config.unitType1, targetUnit1);
    populateSelectOptions(unit2Select, config.unitType2, targetUnit2);
}

function initOutputUnitDropdowns() {
    const prefs = loadUserPreferences();
    const defaults = detectUserLocaleDefaults();
    const outputSelects = document.querySelectorAll(".unit-select");

    outputSelects.forEach(select => {
        const unitType = select.getAttribute("data-type");
        if (unitType) {
            let selectedUnit = null;
            if (prefs && prefs.outputUnits && prefs.outputUnits[select.id]) {
                selectedUnit = prefs.outputUnits[select.id];
            } else {
                selectedUnit = defaults[unitType] || UNITS[unitType][0].id;
            }

            populateSelectOptions(select, unitType, selectedUnit);

            select.addEventListener("change", () => {
                saveUserPreferences();
                renderResults();
            });
        }
    });
}

function resetResults() {
    currentState = null;
    regionEl.textContent = "--";
    pressureResultEl.textContent = "--";
    temperatureResultEl.textContent = "--";
    tsatEl.textContent = "--";
    superheatEl.textContent = "--";
    qualityEl.textContent = "--";
    enthalpyEl.textContent = "--";
    entropyEl.textContent = "--";
    volumeEl.textContent = "--";
    densityEl.textContent = "--";
    internalEnergyEl.textContent = "--";
    cpEl.textContent = "--";
    cvEl.textContent = "--";
    soundEl.textContent = "--";
    viscosityEl.textContent = "--";
    conductivityEl.textContent = "--";
    updateChart();
}

function formatValue(val, digits = 4, exp = false) {
    if (val === null || val === undefined || isNaN(val)) return "N/A";
    if (exp && (Math.abs(val) < 0.001 || Math.abs(val) > 100000)) {
        return val.toExponential(digits);
    }
    return val.toFixed(digits);
}

function regionDescription(reg) {
    switch (reg) {
        case 1: return "1 (Subcooled Liquid)";
        case 2: return "2 (Superheated Steam)";
        case 3: return "3 (Supercritical Fluid)";
        case 4: return "4 (Two-Phase / Saturation)";
        case 5: return "5 (High Temp Steam)";
        default: return reg ? `Region ${reg}` : "--";
    }
}

function getOutputConvertedValue(baseVal, selectId, unitType, digits = 4, exp = false) {
    if (baseVal === null || baseVal === undefined || isNaN(baseVal)) return "N/A";
    const selectEl = document.getElementById(selectId);
    const unitId = selectEl ? selectEl.value : null;
    const converted = convertFromBase(baseVal, unitType, unitId);
    return formatValue(converted, digits, exp);
}

function renderResults() {
    if (!currentState) return;

    regionEl.textContent = regionDescription(currentState.region);

    pressureResultEl.textContent = getOutputConvertedValue(
        currentState.pressure, "unit-pressure", UNIT_TYPES.PRESSURE, 4
    );

    temperatureResultEl.textContent = getOutputConvertedValue(
        currentState.temperature, "unit-temperature", UNIT_TYPES.TEMPERATURE, 2
    );

    // Calculate Saturation Temperature Tsat and Degree of Superheat
    try {
        if (currentState.pressure > 0 && currentState.pressure < 22.064) {
            const satState = solvePx(currentState.pressure, 1);
            const tsatK = satState.temperature;
            tsatEl.textContent = getOutputConvertedValue(
                tsatK, "unit-tsat", UNIT_TYPES.TEMPERATURE, 2
            );

            if (currentState.region === 2 || currentState.temperature >= tsatK) {
                const superheatK = currentState.temperature - tsatK;
                const tempSelect = document.getElementById("unit-temperature");
                const unitId = tempSelect ? tempSelect.value : "C";
                const superheatVal = (unitId === "F" || unitId === "R") ? superheatK * (9 / 5) : superheatK;
                const unitSymbol = (unitId === "F" || unitId === "R") ? "°F" : "°C";
                superheatEl.textContent = `${superheatVal.toFixed(2)} ${unitSymbol}`;
            } else {
                superheatEl.textContent = "0.00 (Liquid/Sat)";
            }
        } else {
            tsatEl.textContent = "N/A (Supercritical)";
            superheatEl.textContent = "N/A";
        }
    } catch (e) {
        tsatEl.textContent = "N/A";
        superheatEl.textContent = "N/A";
    }

    // Vapor Quality (x)
    if (currentState.quality !== null && currentState.quality !== undefined) {
        qualityEl.textContent = getOutputConvertedValue(
            currentState.quality, "unit-quality", UNIT_TYPES.QUALITY, 4
        );
    } else if (currentState.region === 1) {
        qualityEl.textContent = "0.0 (Liquid)";
    } else if (currentState.region === 2 || currentState.region === 5) {
        qualityEl.textContent = "1.0 (Superheated)";
    } else {
        qualityEl.textContent = "N/A";
    }

    enthalpyEl.textContent = getOutputConvertedValue(
        currentState.enthalpy, "unit-enthalpy", UNIT_TYPES.ENTHALPY, 3
    );

    entropyEl.textContent = getOutputConvertedValue(
        currentState.entropy, "unit-entropy", UNIT_TYPES.ENTROPY, 4
    );

    volumeEl.textContent = getOutputConvertedValue(
        currentState.specificVolume, "unit-volume", UNIT_TYPES.VOLUME, 6, true
    );

    densityEl.textContent = getOutputConvertedValue(
        currentState.density, "unit-density", UNIT_TYPES.DENSITY, 3
    );

    internalEnergyEl.textContent = getOutputConvertedValue(
        currentState.internalEnergy, "unit-internalEnergy", UNIT_TYPES.ENTHALPY, 3
    );

    cpEl.textContent = getOutputConvertedValue(
        currentState.cp, "unit-cp", UNIT_TYPES.ENTROPY, 4
    );

    cvEl.textContent = getOutputConvertedValue(
        currentState.cv, "unit-cv", UNIT_TYPES.ENTROPY, 4
    );

    soundEl.textContent = getOutputConvertedValue(
        currentState.speedOfSound, "unit-sound", UNIT_TYPES.SPEED, 2
    );

    viscosityEl.textContent = getOutputConvertedValue(
        currentState.viscosity, "unit-viscosity", UNIT_TYPES.VISCOSITY, 6, true
    );

    conductivityEl.textContent = getOutputConvertedValue(
        currentState.thermalConductivity, "unit-conductivity", UNIT_TYPES.CONDUCTIVITY, 5
    );

    updateChart();
}

/**
 * Handle URL Query Parameter Parsing for Calculation Links
 */
function parseUrlQueryParams() {
    const urlParams = new URLSearchParams(window.location.search);
    const mode = urlParams.get("mode");
    const v1 = urlParams.get("v1");
    const v2 = urlParams.get("v2");
    const u1 = urlParams.get("u1");
    const u2 = urlParams.get("u2");

    if (mode && modeConfigs[mode]) {
        modeSelect.value = mode;
        updateInputMode();

        if (v1 !== null) input1.value = v1;
        if (v2 !== null) input2.value = v2;
        if (u1) unit1Select.value = u1;
        if (u2) unit2Select.value = u2;

        return true;
    }
    return false;
}

// Chart Tab Switchers
if (tabHs && tabTs) {
    tabHs.addEventListener("click", () => {
        tabHs.classList.add("active");
        tabTs.classList.remove("active");
        activeChartType = "hs";
        updateChart();
    });

    tabTs.addEventListener("click", () => {
        tabTs.classList.add("active");
        tabHs.classList.remove("active");
        activeChartType = "ts";
        updateChart();
    });
}

// Shareable Link Copy Handler
if (shareLinkBtn) {
    shareLinkBtn.addEventListener("click", () => {
        const mode = modeSelect.value;
        const v1 = encodeURIComponent(input1.value);
        const v2 = encodeURIComponent(input2.value);
        const u1 = encodeURIComponent(unit1Select.value);
        const u2 = encodeURIComponent(unit2Select.value);

        const shareUrl = `${window.location.origin}${window.location.pathname}?mode=${mode}&v1=${v1}&v2=${v2}&u1=${u1}&u2=${u2}`;
        
        navigator.clipboard.writeText(shareUrl).then(() => {
            showToast("🔗 Calculation link copied to clipboard!");
        }).catch(err => {
            console.error("Clipboard copy failed:", err);
            showToast("Failed to copy link");
        });
    });
}

// Print / PDF Report Handler
if (printReportBtn) {
    printReportBtn.addEventListener("click", () => {
        window.print();
    });
}

// Window Resize Redraw
window.addEventListener("resize", updateChart);

// Event Listeners
modeSelect.addEventListener("change", () => {
    updateInputMode();
    saveUserPreferences();
});

unit1Select.addEventListener("change", saveUserPreferences);
unit2Select.addEventListener("change", saveUserPreferences);

input1.addEventListener("input", saveUserPreferences);
input2.addEventListener("input", saveUserPreferences);

calculateBtn.addEventListener("click", () => {
    const val1 = parseFloat(input1.value);
    const val2 = parseFloat(input2.value);

    if (isNaN(val1) || isNaN(val2)) {
        alert("Please enter numerical values in both input fields.");
        return;
    }

    const config = modeConfigs[modeSelect.value] || modeConfigs.PT;

    try {
        const baseVal1 = convertToBase(val1, config.unitType1, unit1Select.value);
        const baseVal2 = convertToBase(val2, config.unitType2, unit2Select.value);

        currentState = calculate(modeSelect.value, baseVal1, baseVal2);
        renderResults();
        saveUserPreferences();
    } catch (err) {
        resetResults();
        alert(`Calculation Error: ${err.message}`);
        console.error("Steam calculation error:", err);
    }
});

// 1-Click Operating Presets
const OPERATING_PRESETS = {
    "us-600psig": {
        name: "600 psig @ 750°F (US Superheat)",
        mode: "PT",
        val1: "600",
        unit1: "psi_g",
        val2: "750",
        unit2: "F"
    },
    "us-150sat": {
        name: "150 psig Saturated (US Process)",
        mode: "PX",
        val1: "150",
        unit1: "psi_g",
        val2: "1.0",
        unit2: "frac"
    },
    "condenser-vac": {
        name: "1.5 inHg (a) @ 91.7°F (Condenser)",
        mode: "PT",
        val1: "1.5",
        unit1: "inHg_a",
        val2: "91.7",
        unit2: "F"
    },
    "us-plant": {
        name: "400 psig @ 662°F (US Plant)",
        mode: "PT",
        val1: "400",
        unit1: "psi_g",
        val2: "662",
        unit2: "F"
    },
    "hp-superheat": {
        name: "70 barg @ 490°C (HP Superheat)",
        mode: "PT",
        val1: "70",
        unit1: "bar_g",
        val2: "490",
        unit2: "C"
    },
    "mp-process": {
        name: "15 bar (a) @ 250°C (MP Process)",
        mode: "PT",
        val1: "15",
        unit1: "bar_a",
        val2: "250",
        unit2: "C"
    },
    "boiler-drum": {
        name: "9 barg Saturated (Boiler Drum)",
        mode: "PX",
        val1: "9",
        unit1: "bar_g",
        val2: "1.0",
        unit2: "frac"
    },
    "wet-lp": {
        name: "10 bar (a) @ x=0.85 (Wet Steam)",
        mode: "PX",
        val1: "10",
        unit1: "bar_a",
        val2: "0.85",
        unit2: "frac"
    }
};

function applyPreset(presetKey) {
    const p = OPERATING_PRESETS[presetKey];
    if (!p) return;

    modeSelect.value = p.mode;
    updateInputMode();

    if (unit1Select) unit1Select.value = p.unit1;
    if (unit2Select) unit2Select.value = p.unit2;
    if (input1) input1.value = p.val1;
    if (input2) input2.value = p.val2;

    saveUserPreferences();
    calculateBtn.click();
    showToast(`⚡ Loaded Preset: ${p.name}`);
}

// Preset button handlers
document.querySelectorAll(".preset-btn").forEach(btn => {
    btn.addEventListener("click", () => {
        const presetKey = btn.getAttribute("data-preset");
        if (presetKey) applyPreset(presetKey);
    });
});

// Restore mode if saved
const savedPrefs = loadUserPreferences();
if (savedPrefs && savedPrefs.mode) {
    modeSelect.value = savedPrefs.mode;
}

// Initialize Shared Navbar & UI
initNavbar();

const hasUrlParams = parseUrlQueryParams();
if (!hasUrlParams) {
    updateInputMode();
}

initOutputUnitDropdowns();
resetResults();

if (input1.value && input2.value) {
    calculateBtn.click();
}

// Listen for Global Unit System Changes from Navbar
window.addEventListener("unitSystemChanged", (e) => {
    const sys = e.detail && e.detail.system === "US" ? "US" : "EU";
    try {
        const prefs = loadUserPreferences() || {};
        delete prefs.outputUnits;
        delete prefs.inputUnits;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    } catch (err) {}

    initOutputUnitDropdowns();

    if (sys === "US") {
        applyPreset("us-600psig");
    } else {
        applyPreset("hp-superheat");
    }
});