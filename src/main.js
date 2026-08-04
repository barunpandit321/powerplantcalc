import "../style.css";
import { calculate } from "./steam.js";
import { UNITS, UNIT_TYPES, convertToBase, convertFromBase } from "./units.js";
import { solvePx } from "iapws-if97";

const STORAGE_KEY = "steam_calculator_user_units_v1";
const THEME_KEY = "steam_calculator_theme";

const modeSelect = document.getElementById("mode");
const input1 = document.getElementById("input1");
const input2 = document.getElementById("input2");
const unit1Select = document.getElementById("unit1");
const unit2Select = document.getElementById("unit2");
const label1 = document.getElementById("label1");
const label2 = document.getElementById("label2");
const calculateBtn = document.getElementById("calculateBtn");
const themeToggleBtn = document.getElementById("themeToggle");

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
 * Theme toggle logic (Default: Light mode)
 */
function applyTheme(theme) {
    if (theme === "dark") {
        document.documentElement.removeAttribute("data-theme");
        if (themeToggleBtn) {
            themeToggleBtn.querySelector(".theme-icon").textContent = "🌙";
            themeToggleBtn.querySelector(".theme-text").textContent = "Dark Mode";
        }
    } else {
        // Light mode is default
        document.documentElement.setAttribute("data-theme", "light");
        if (themeToggleBtn) {
            themeToggleBtn.querySelector(".theme-icon").textContent = "☀️";
            themeToggleBtn.querySelector(".theme-text").textContent = "Light Mode";
        }
    }
}

function initTheme() {
    const savedTheme = localStorage.getItem(THEME_KEY) || "light";
    applyTheme(savedTheme);

    if (themeToggleBtn) {
        themeToggleBtn.addEventListener("click", () => {
            const isLight = document.documentElement.getAttribute("data-theme") === "light";
            const next = isLight ? "dark" : "light";
            applyTheme(next);
            localStorage.setItem(THEME_KEY, next);
        });
    }
}

/**
 * Detects location/locale defaults if no user preferences are saved.
 */
function detectUserLocaleDefaults() {
    let timeZone = "";
    try {
        timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
    } catch (e) { }
    const lang = navigator.language || "";

    const isIndia = timeZone.includes("Kolkata") || timeZone.includes("Calcutta") ||
        timeZone.includes("Colombo") || timeZone.includes("Dhaka") ||
        lang.endsWith("-IN") || lang.startsWith("hi");

    const isUSA = timeZone.startsWith("America/") || lang === "en-US";

    if (isIndia) {
        return {
            pressure: "kg_cm2_g",   // kg/cm² (gauge)
            temperature: "C",        // °C
            enthalpy: "kcal_kg",    // kcal/kg (IT)
            entropy: "kJ_kgK",
            volume: "m3_kg",
            density: "kg_m3",
            speed: "m_s",
            viscosity: "Pa_s",
            conductivity: "W_mK",
            quality: "frac"
        };
    }

    if (isUSA) {
        return {
            pressure: "psi_g",      // psi (gauge)
            temperature: "F",        // °F
            enthalpy: "Btu_lb",     // Btu/lb
            entropy: "Btu_lbF",
            volume: "ft3_lb",
            density: "lb_ft3",
            speed: "ft_s",
            viscosity: "cP",
            conductivity: "Btu_hftF",
            quality: "frac"
        };
    }

    // Default Metric (International)
    return {
        pressure: "kg_cm2_g",
        temperature: "C",
        enthalpy: "kcal_kg",
        entropy: "kJ_kgK",
        volume: "m3_kg",
        density: "kg_m3",
        speed: "m_s",
        viscosity: "Pa_s",
        conductivity: "W_mK",
        quality: "frac"
    };
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
    selectEl.innerHTML = "";
    const options = UNITS[unitType] || [];
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

    label1.textContent = config.label1;
    label2.textContent = config.label2;
    input1.placeholder = config.p1;
    input2.placeholder = config.p2;

    const prefs = loadUserPreferences();
    const defaults = detectUserLocaleDefaults();

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
        input1.value = "";
        input2.value = "";
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
                // Format superheat in selected temperature unit scale
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
}

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

// Restore mode if saved
const savedPrefs = loadUserPreferences();
if (savedPrefs && savedPrefs.mode) {
    modeSelect.value = savedPrefs.mode;
}

// Initialize Theme & UI
initTheme();
updateInputMode();
initOutputUnitDropdowns();
resetResults();

if (input1.value && input2.value) {
    calculateBtn.click();
}