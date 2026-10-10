/**
 * WHRB (Waste Heat Recovery Boiler) Live Interactive Controller & Telemetry Engine
 */

import { initNavbar } from "./navbar.js";
import { calculateWhrb } from "./whrb-calc.js";
import { WhrbDiagramManager } from "./whrb-diagram.js";
import { WhrbChartManager } from "./whrb-chart.js";
import { getUserUnitSystem } from "./geo.js";

// Industrial Presets
export const WHRB_PRESETS = {
    "gt-combined-cycle": {
        name: "Gas Turbine Cogeneration (HRSG)",
        gasFlowTh: 180,
        gasTempInC: 520,
        steamPressBar: 42,
        isSuperheated: true,
        steamTempC: 430,
        fwTempC: 105,
        pinchPointC: 15,
        approachPointC: 10,
        blowdownFrac: 0.02
    },
    "cement-kiln": {
        name: "Cement Rotary Kiln / Preheater WHRB",
        gasFlowTh: 130,
        gasTempInC: 340,
        steamPressBar: 16,
        isSuperheated: false,
        steamTempC: 201, // Tsat
        fwTempC: 105,
        pinchPointC: 18,
        approachPointC: 12,
        blowdownFrac: 0.025
    },
    "steel-dri": {
        name: "Steel DRI / Sponge Iron Kiln WHRB",
        gasFlowTh: 90,
        gasTempInC: 580,
        steamPressBar: 38,
        isSuperheated: true,
        steamTempC: 400,
        fwTempC: 110,
        pinchPointC: 14,
        approachPointC: 10,
        blowdownFrac: 0.02
    },
    "gas-engine": {
        name: "Gas Engine (Jenbacher/Wärtsilä) Exhaust WHRB",
        gasFlowTh: 45,
        gasTempInC: 420,
        steamPressBar: 10,
        isSuperheated: true,
        steamTempC: 280,
        fwTempC: 90,
        pinchPointC: 15,
        approachPointC: 8,
        blowdownFrac: 0.015
    },
    "biomass-incinerator": {
        name: "Waste Incineration & Biomass WHRB",
        gasFlowTh: 70,
        gasTempInC: 450,
        steamPressBar: 25,
        isSuperheated: true,
        steamTempC: 360,
        fwTempC: 105,
        pinchPointC: 16,
        approachPointC: 10,
        blowdownFrac: 0.03
    }
};

document.addEventListener("DOMContentLoaded", () => {
    // 1. Initialize Global Site Navbar
    initNavbar();

    // 2. Initialize Visual Diagram and Charts
    const diagramManager = new WhrbDiagramManager("whrbDiagramContainer");
    const chartManager = new WhrbChartManager("trendCanvas", "qtCanvas");

    let currentUnitSystem = getUserUnitSystem(); // "US" or "METRIC"
    let activePresetKey = "gt-combined-cycle";

    // Telemetry streaming state
    let isLiveStreaming = true;
    let streamIntervalId = null;
    let streamTick = 0;

    // Base input parameters (SI standard internally)
    let params = { ...WHRB_PRESETS["gt-combined-cycle"] };

    // DOM Elements - Inputs
    const inputGasFlow = document.getElementById("inputGasFlow");
    const rangeGasFlow = document.getElementById("rangeGasFlow");
    const inputGasTemp = document.getElementById("inputGasTemp");
    const rangeGasTemp = document.getElementById("rangeGasTemp");
    const inputSteamPress = document.getElementById("inputSteamPress");
    const rangeSteamPress = document.getElementById("rangeSteamPress");
    const selectSteamType = document.getElementById("selectSteamType");
    const groupSuperheat = document.getElementById("groupSuperheat");
    const inputSteamTemp = document.getElementById("inputSteamTemp");
    const rangeSteamTemp = document.getElementById("rangeSteamTemp");
    const inputFwTemp = document.getElementById("inputFwTemp");
    const rangeFwTemp = document.getElementById("rangeFwTemp");
    const inputPinch = document.getElementById("inputPinch");
    const rangePinch = document.getElementById("rangePinch");
    const inputApproach = document.getElementById("inputApproach");
    const rangeApproach = document.getElementById("rangeApproach");
    const inputBlowdown = document.getElementById("inputBlowdown");

    // DOM Elements - Telemetry Controls
    const btnToggleStream = document.getElementById("btnToggleStream");
    const streamStatusBadge = document.getElementById("streamStatusBadge");
    const btnResetTrend = document.getElementById("btnResetTrend");

    // DOM Elements - KPIs
    const kpiSteamFlow = document.getElementById("kpiSteamFlow");
    const kpiSteamFlowSub = document.getElementById("kpiSteamFlowSub");
    const kpiThermalPower = document.getElementById("kpiThermalPower");
    const kpiThermalPowerSub = document.getElementById("kpiThermalPowerSub");
    const kpiStackTemp = document.getElementById("kpiStackTemp");
    const kpiStackTempSub = document.getElementById("kpiStackTempSub");
    const kpiFeedwaterFlow = document.getElementById("kpiFeedwaterFlow");
    const kpiEfficiency = document.getElementById("kpiEfficiency");
    const kpiDeltaH = document.getElementById("kpiDeltaH");
    const kpiTsat = document.getElementById("kpiTsat");

    // Sync input box and slider pairs
    function bindSliderAndInput(inputEl, rangeEl, updateFn) {
        if (!inputEl || !rangeEl) return;
        inputEl.addEventListener("input", () => {
            const val = parseFloat(inputEl.value);
            if (!isNaN(val)) {
                rangeEl.value = val;
                updateFn(val);
            }
        });
        rangeEl.addEventListener("input", () => {
            const val = parseFloat(rangeEl.value);
            inputEl.value = val;
            updateFn(val);
        });
    }

    // Bind all inputs
    bindSliderAndInput(inputGasFlow, rangeGasFlow, val => {
        params.gasFlowTh = currentUnitSystem === "US" ? val / 2.20462 : val;
        recalculate(false);
    });

    bindSliderAndInput(inputGasTemp, rangeGasTemp, val => {
        params.gasTempInC = currentUnitSystem === "US" ? (val - 32) * (5 / 9) : val;
        recalculate(false);
    });

    bindSliderAndInput(inputSteamPress, rangeSteamPress, val => {
        params.steamPressBar = currentUnitSystem === "US" ? val / 14.50377 : val;
        recalculate(false);
    });

    bindSliderAndInput(inputSteamTemp, rangeSteamTemp, val => {
        params.steamTempC = currentUnitSystem === "US" ? (val - 32) * (5 / 9) : val;
        recalculate(false);
    });

    bindSliderAndInput(inputFwTemp, rangeFwTemp, val => {
        params.fwTempC = currentUnitSystem === "US" ? (val - 32) * (5 / 9) : val;
        recalculate(false);
    });

    bindSliderAndInput(inputPinch, rangePinch, val => {
        params.pinchPointC = currentUnitSystem === "US" ? val / 1.8 : val;
        recalculate(false);
    });

    bindSliderAndInput(inputApproach, rangeApproach, val => {
        params.approachPointC = currentUnitSystem === "US" ? val / 1.8 : val;
        recalculate(false);
    });

    if (inputBlowdown) {
        inputBlowdown.addEventListener("input", () => {
            const val = parseFloat(inputBlowdown.value);
            params.blowdownFrac = !isNaN(val) ? val / 100 : 0.02;
            recalculate(false);
        });
    }

    if (selectSteamType) {
        selectSteamType.addEventListener("change", () => {
            const isSh = selectSteamType.value === "superheated";
            params.isSuperheated = isSh;
            if (groupSuperheat) {
                groupSuperheat.style.display = isSh ? "block" : "none";
            }
            recalculate(false);
        });
    }

    // Apply Presets
    function applyPreset(presetKey) {
        const p = WHRB_PRESETS[presetKey];
        if (!p) return;
        activePresetKey = presetKey;
        params = { ...p };

        // Update Preset Buttons UI
        document.querySelectorAll("[data-whrb-preset]").forEach(btn => {
            if (btn.getAttribute("data-whrb-preset") === presetKey) {
                btn.classList.add("active");
            } else {
                btn.classList.remove("active");
            }
        });

        // Update form controls to match preset and unit system
        populateFormValues();

        if (selectSteamType) {
            selectSteamType.value = params.isSuperheated ? "superheated" : "saturated";
        }
        if (groupSuperheat) {
            groupSuperheat.style.display = params.isSuperheated ? "block" : "none";
        }

        chartManager.resetHistory();
        recalculate(true);
    }

    // Populate input controls with current params taking unit system into account
    function populateFormValues() {
        const isUS = currentUnitSystem === "US";

        if (inputGasFlow && rangeGasFlow) {
            const val = isUS ? Math.round(params.gasFlowTh * 2.20462) : Math.round(params.gasFlowTh);
            inputGasFlow.value = val;
            rangeGasFlow.value = val;
            rangeGasFlow.min = isUS ? 20 : 10;
            rangeGasFlow.max = isUS ? 1100 : 500;
        }

        if (inputGasTemp && rangeGasTemp) {
            const val = isUS ? Math.round(params.gasTempInC * 1.8 + 32) : Math.round(params.gasTempInC);
            inputGasTemp.value = val;
            rangeGasTemp.value = val;
            rangeGasTemp.min = isUS ? 450 : 250;
            rangeGasTemp.max = isUS ? 1200 : 650;
        }

        if (inputSteamPress && rangeSteamPress) {
            const val = isUS ? (params.steamPressBar * 14.50377).toFixed(1) : params.steamPressBar.toFixed(1);
            inputSteamPress.value = val;
            rangeSteamPress.value = val;
            rangeSteamPress.min = isUS ? 30 : 2;
            rangeSteamPress.max = isUS ? 1450 : 100;
        }

        if (inputSteamTemp && rangeSteamTemp) {
            const val = isUS ? Math.round(params.steamTempC * 1.8 + 32) : Math.round(params.steamTempC);
            inputSteamTemp.value = val;
            rangeSteamTemp.value = val;
            rangeSteamTemp.min = isUS ? 350 : 180;
            rangeSteamTemp.max = isUS ? 1050 : 560;
        }

        if (inputFwTemp && rangeFwTemp) {
            const val = isUS ? Math.round(params.fwTempC * 1.8 + 32) : Math.round(params.fwTempC);
            inputFwTemp.value = val;
            rangeFwTemp.value = val;
            rangeFwTemp.min = isUS ? 100 : 40;
            rangeFwTemp.max = isUS ? 320 : 160;
        }

        if (inputPinch && rangePinch) {
            const val = isUS ? (params.pinchPointC * 1.8).toFixed(1) : params.pinchPointC.toFixed(1);
            inputPinch.value = val;
            rangePinch.value = val;
        }

        if (inputApproach && rangeApproach) {
            const val = isUS ? (params.approachPointC * 1.8).toFixed(1) : params.approachPointC.toFixed(1);
            inputApproach.value = val;
            rangeApproach.value = val;
        }

        if (inputBlowdown) {
            inputBlowdown.value = (params.blowdownFrac * 100).toFixed(1);
        }

        // Update Labels with unit suffixes
        updateInputUnitLabels();
    }

    function updateInputUnitLabels() {
        const isUS = currentUnitSystem === "US";
        const updateText = (id, text) => {
            const el = document.getElementById(id);
            if (el) el.textContent = text;
        };

        updateText("unitLabelGasFlow", isUS ? "klb/h" : "t/h");
        updateText("unitLabelGasTemp", isUS ? "°F" : "°C");
        updateText("unitLabelSteamPress", isUS ? "psig" : "bar (g)");
        updateText("unitLabelSteamTemp", isUS ? "°F" : "°C");
        updateText("unitLabelFwTemp", isUS ? "°F" : "°C");
        updateText("unitLabelPinch", isUS ? "°F" : "°C");
        updateText("unitLabelApproach", isUS ? "°F" : "°C");
    }

    // Core Calculation & UI Update
    function recalculate(addToHistory = true) {
        try {
            // If live streaming, introduce realistic subtle sensor fluctuation to emulate DCS telemetry
            let activeParams = { ...params };
            if (isLiveStreaming) {
                streamTick++;
                const tempJitter = Math.sin(streamTick * 0.15) * 1.8 + (Math.random() - 0.5) * 0.6;
                const flowJitter = Math.cos(streamTick * 0.12) * 1.2 + (Math.random() - 0.5) * 0.4;
                activeParams.gasTempInC = Math.max(250, activeParams.gasTempInC + tempJitter);
                activeParams.gasFlowTh = Math.max(10, activeParams.gasFlowTh + flowJitter);
            }

            const res = calculateWhrb(activeParams);

            // 1. Update KPIs
            const isUS = currentUnitSystem === "US";
            if (kpiSteamFlow) {
                kpiSteamFlow.textContent = isUS
                    ? `${(res.steamFlowLbH / 1000).toFixed(2)} klb/h`
                    : `${res.steamFlowTh.toFixed(2)} t/h`;
            }
            if (kpiSteamFlowSub) {
                kpiSteamFlowSub.textContent = isUS
                    ? `${res.steamFlowTh.toFixed(2)} t/h (${res.steamFlowKgS.toFixed(2)} kg/s)`
                    : `${res.steamFlowLbH.toLocaleString('en-US', {maximumFractionDigits: 0})} lb/h (${res.steamFlowKgS.toFixed(2)} kg/s)`;
            }

            if (kpiThermalPower) {
                kpiThermalPower.textContent = isUS
                    ? `${res.thermalPowerMmbtuH.toFixed(2)} MMBtu/h`
                    : `${res.thermalPowerMw.toFixed(2)} MWth`;
            }
            if (kpiThermalPowerSub) {
                kpiThermalPowerSub.textContent = isUS
                    ? `${res.thermalPowerMw.toFixed(2)} MWth (${Math.round(res.totalHeatRecoveredKw)} kW)`
                    : `${res.thermalPowerMmbtuH.toFixed(2)} MMBtu/h (${Math.round(res.totalHeatRecoveredKw)} kW)`;
            }

            if (kpiStackTemp) {
                kpiStackTemp.textContent = isUS
                    ? `${(res.gasTempStackC * 1.8 + 32).toFixed(1)} °F`
                    : `${res.gasTempStackC.toFixed(1)} °C`;
            }
            if (kpiStackTempSub) {
                kpiStackTempSub.textContent = `ΔT Drop: ${((activeParams.gasTempInC - res.gasTempStackC) * (isUS ? 1.8 : 1)).toFixed(1)} ${isUS ? '°F' : '°C'}`;
            }

            if (kpiFeedwaterFlow) {
                kpiFeedwaterFlow.textContent = isUS
                    ? `${((res.feedwaterFlowTh * 2204.62) / 1000).toFixed(2)} klb/h`
                    : `${res.feedwaterFlowTh.toFixed(2)} t/h`;
            }

            if (kpiEfficiency) {
                kpiEfficiency.textContent = `${res.whrbEfficiencyPct.toFixed(1)} %`;
            }

            if (kpiDeltaH) {
                kpiDeltaH.textContent = isUS
                    ? `${(res.netEnthalpyRiseKjKg / 2.326).toFixed(1)} Btu/lb`
                    : `${res.netEnthalpyRiseKjKg.toFixed(1)} kJ/kg`;
            }

            if (kpiTsat) {
                kpiTsat.textContent = isUS
                    ? `${(res.tSatC * 1.8 + 32).toFixed(1)} °F`
                    : `${res.tSatC.toFixed(1)} °C`;
            }

            // 2. Update Interactive Diagram
            diagramManager.updateTelemetry(res, currentUnitSystem);

            // 3. Update Charts
            if (addToHistory) {
                chartManager.addTelemetryPoint(res);
            }
            chartManager.renderQtDiagram(res, currentUnitSystem);

        } catch (err) {
            console.error("WHRB Calculation error:", err);
            if (kpiSteamFlow) kpiSteamFlow.textContent = "Error";
            if (kpiSteamFlowSub) kpiSteamFlowSub.textContent = err.message;
        }
    }

    // Set up Presets Click Listeners
    document.querySelectorAll("[data-whrb-preset]").forEach(btn => {
        btn.addEventListener("click", () => {
            const presetKey = btn.getAttribute("data-whrb-preset");
            applyPreset(presetKey);
        });
    });

    // Telemetry Streaming Loop
    function startStream() {
        if (streamIntervalId) clearInterval(streamIntervalId);
        isLiveStreaming = true;
        if (streamStatusBadge) {
            streamStatusBadge.innerHTML = `<span class="pulse-dot"></span> LIVE TELEMETRY (ONLINE)`;
            streamStatusBadge.className = "stream-badge active";
        }
        if (btnToggleStream) {
            btnToggleStream.innerHTML = "⏸️ Pause Stream";
            btnToggleStream.classList.remove("paused");
        }

        streamIntervalId = setInterval(() => {
            recalculate(true);
        }, 1000);
    }

    function pauseStream() {
        if (streamIntervalId) clearInterval(streamIntervalId);
        isLiveStreaming = false;
        if (streamStatusBadge) {
            streamStatusBadge.innerHTML = `<span class="pause-dot"></span> TELEMETRY PAUSED`;
            streamStatusBadge.className = "stream-badge paused";
        }
        if (btnToggleStream) {
            btnToggleStream.innerHTML = "▶️ Resume Live Stream";
            btnToggleStream.classList.add("paused");
        }
    }

    if (btnToggleStream) {
        btnToggleStream.addEventListener("click", () => {
            if (isLiveStreaming) {
                pauseStream();
            } else {
                startStream();
            }
        });
    }

    if (btnResetTrend) {
        btnResetTrend.addEventListener("click", () => {
            chartManager.resetHistory();
        });
    }

    // Unit System Change from Navbar Event
    window.addEventListener("unitSystemChanged", (e) => {
        currentUnitSystem = e.detail && e.detail.system === "US" ? "US" : "METRIC";
        populateFormValues();
        recalculate(false);
    });

    // Theme Change Re-render
    window.addEventListener("themeChanged", () => {
        chartManager.renderTrend(currentUnitSystem);
        chartManager.renderQtDiagram(chartManager.lastCalcData, currentUnitSystem);
    });

    // Print & Share Handlers
    const printBtn = document.getElementById("printReportBtn");
    if (printBtn) {
        printBtn.addEventListener("click", () => window.print());
    }

    const shareBtn = document.getElementById("shareLinkBtn");
    if (shareBtn) {
        shareBtn.addEventListener("click", () => {
            navigator.clipboard.writeText(window.location.href).then(() => {
                const orig = shareBtn.innerHTML;
                shareBtn.innerHTML = "<span>✅ Link Copied!</span>";
                setTimeout(() => { shareBtn.innerHTML = orig; }, 2000);
            }).catch(() => {
                alert("URL copied: " + window.location.href);
            });
        });
    }

    // Initialize Default State
    applyPreset("gt-combined-cycle");
    startStream();
});
