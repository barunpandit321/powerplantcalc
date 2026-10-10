import { initNavbar } from "./navbar.js";
import { BoilerChart } from "./boiler-chart.js";
import { calculateIndirectMethod, calculateDirectMethod, FUEL_PRESETS } from "./boiler-efficiency.js";
import { convertToBase, convertFromBase, UNIT_TYPES } from "./units.js";
import { detectUserZone, prioritizeUnits } from "./geo.js";

document.addEventListener("DOMContentLoaded", () => {
    initNavbar();

    const chart = new BoilerChart("boilerChart");
    let currentZone = detectUserZone();

    // Mode tabs: 'indirect' vs 'direct'
    let currentMethod = "indirect";
    const tabIndirect = document.getElementById("tabIndirect");
    const tabDirect = document.getElementById("tabDirect");
    const indirectControls = document.getElementById("indirectControls");
    const directControls = document.getElementById("directControls");
    const indirectResults = document.getElementById("indirectResults");
    const directResults = document.getElementById("directResults");

    // Presets buttons
    const fuelPresetSelect = document.getElementById("fuelPreset");
    const presetButtons = document.querySelectorAll("[data-boiler-preset]");

    // Indirect Inputs
    const inputC = document.getElementById("inputC");
    const inputH = document.getElementById("inputH");
    const inputO = document.getElementById("inputO");
    const inputN = document.getElementById("inputN");
    const inputS = document.getElementById("inputS");
    const inputM = document.getElementById("inputM");
    const inputAsh = document.getElementById("inputAsh");
    const inputGcv = document.getElementById("inputGcv");
    const unitGcv = document.getElementById("unitGcv");
    const inputTg = document.getElementById("inputTg");
    const inputTa = document.getElementById("inputTa");
    const unitTemp = document.getElementById("unitTemp");
    const inputO2 = document.getElementById("inputO2");
    const inputCo = document.getElementById("inputCo");
    const inputL6 = document.getElementById("inputL6");
    const inputL7 = document.getElementById("inputL7");

    // Direct Inputs
    const inputSteamFlow = document.getElementById("inputSteamFlow");
    const unitSteamFlow = document.getElementById("unitSteamFlow");
    const inputFuelFlow = document.getElementById("inputFuelFlow");
    const unitFuelFlow = document.getElementById("unitFuelFlow");
    const inputSteamP = document.getElementById("inputSteamP");
    const unitSteamP = document.getElementById("unitSteamP");
    const inputSteamT = document.getElementById("inputSteamT");
    const unitSteamT = document.getElementById("unitSteamT");
    const inputFwT = document.getElementById("inputFwT");
    const unitFwT = document.getElementById("unitFwT");
    const inputDirectGcv = document.getElementById("inputDirectGcv");
    const unitDirectGcv = document.getElementById("unitDirectGcv");

    // Calculation button & export
    const calculateBtn = document.getElementById("calculateBtn");
    const shareLinkBtn = document.getElementById("shareLinkBtn");
    const printReportBtn = document.getElementById("printReportBtn");

    // Populate units based on Geo-zone
    populateDropdowns(currentZone);

    // Set Default Preset (US Bituminous or Indian Coal depending on zone)
    applyFuelPreset(currentZone === "US" ? "us-bituminous" : "in-coal");

    // Tab switching
    if (tabIndirect && tabDirect) {
        tabIndirect.addEventListener("click", () => switchMethod("indirect"));
        tabDirect.addEventListener("click", () => switchMethod("direct"));
    }

    function switchMethod(method) {
        currentMethod = method;
        if (method === "indirect") {
            tabIndirect.classList.add("active");
            tabDirect.classList.remove("active");
            indirectControls.style.display = "block";
            directControls.style.display = "none";
            indirectResults.style.display = "grid";
            directResults.style.display = "none";
            calculateIndirect();
        } else {
            tabDirect.classList.add("active");
            tabIndirect.classList.remove("active");
            indirectControls.style.display = "none";
            directControls.style.display = "block";
            indirectResults.style.display = "none";
            directResults.style.display = "grid";
            calculateDirect();
        }
    }

    // Preset selection change
    if (fuelPresetSelect) {
        fuelPresetSelect.addEventListener("change", (e) => {
            applyFuelPreset(e.target.value);
            calculateIndirect();
        });
    }

    presetButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            const presetKey = btn.getAttribute("data-boiler-preset");
            if (presetKey) {
                if (fuelPresetSelect) fuelPresetSelect.value = presetKey;
                applyFuelPreset(presetKey);
                calculateIndirect();
            }
        });
    });

    function applyFuelPreset(key) {
        const p = FUEL_PRESETS[key];
        if (!p) return;
        inputC.value = p.C;
        inputH.value = p.H2;
        inputO.value = p.O2;
        inputN.value = p.N2;
        inputS.value = p.S;
        inputM.value = p.M;
        inputAsh.value = p.Ash;

        const gcvUnit = unitGcv.value;
        if (gcvUnit === "kcal_kg") inputGcv.value = p.gcvKcal;
        else if (gcvUnit === "kJ_kg") inputGcv.value = p.gcvKj;
        else if (gcvUnit === "Btu_lb") inputGcv.value = p.gcvBtu;
        else inputGcv.value = p.gcvKcal;

        inputO2.value = p.defaultO2;
        const isF = unitTemp && unitTemp.value === "F";
        inputTg.value = isF ? Math.round(p.defaultTg * 1.8 + 32) : p.defaultTg;
        inputTa.value = isF ? 85 : 30;
        inputCo.value = 50;
        inputL6.value = p.defaultL6;
        inputL7.value = p.defaultL7;
    }

    function populateDropdowns(zone = currentZone) {
        const isUS = zone === "US";

        // GCV units
        const gcvOptions = [
            { id: "Btu_lb", label: "Btu/lb" },
            { id: "kcal_kg", label: "kcal/kg" },
            { id: "kJ_kg", label: "kJ/kg" }
        ];
        populateSelect(unitGcv, gcvOptions, isUS ? "Btu_lb" : "kcal_kg");
        populateSelect(unitDirectGcv, gcvOptions, isUS ? "Btu_lb" : "kcal_kg");

        // Temp units
        const tempOptions = [
            { id: "F", label: "°F" },
            { id: "C", label: "°C" }
        ];
        populateSelect(unitTemp, tempOptions, isUS ? "F" : "C");
        populateSelect(unitSteamT, tempOptions, isUS ? "F" : "C");
        populateSelect(unitFwT, tempOptions, isUS ? "F" : "C");

        // Pressure units
        const pOptions = [
            { id: "psi_g", label: "psig" },
            { id: "bar_g", label: "bar (gauge)" },
            { id: "bar_a", label: "bar (abs)" },
            { id: "kg_cm2_g", label: "kg/cm² (gauge)" },
            { id: "MPa_g", label: "MPa (gauge)" }
        ];
        populateSelect(unitSteamP, pOptions, isUS ? "psi_g" : "bar_g");

        // Flow units
        const flowOptions = [
            { id: "lbh", label: "lb/h" },
            { id: "tph", label: "t/h (metric tons/hr)" },
            { id: "kgh", label: "kg/h" }
        ];
        populateSelect(unitSteamFlow, flowOptions, isUS ? "lbh" : "tph");
        populateSelect(unitFuelFlow, flowOptions, isUS ? "lbh" : "tph");

        // Configure Direct inputs
        if (isUS) {
            if (inputSteamFlow) inputSteamFlow.value = "50000";
            if (inputFuelFlow) inputFuelFlow.value = "6000";
            if (inputSteamP) inputSteamP.value = "600";
            if (inputSteamT) inputSteamT.value = "750";
            if (inputFwT) inputFwT.value = "220";
            if (inputDirectGcv) inputDirectGcv.value = "12000";
        } else {
            if (inputSteamFlow) inputSteamFlow.value = "25";
            if (inputFuelFlow) inputFuelFlow.value = "3.2";
            if (inputSteamP) inputSteamP.value = "40";
            if (inputSteamT) inputSteamT.value = "400";
            if (inputFwT) inputFwT.value = "105";
            if (inputDirectGcv) inputDirectGcv.value = "6000";
        }
    }

    function populateSelect(selectEl, options, defaultId) {
        if (!selectEl) return;
        selectEl.innerHTML = "";
        options.forEach(opt => {
            const optEl = document.createElement("option");
            optEl.value = opt.id;
            optEl.textContent = opt.label;
            if (opt.id === defaultId) optEl.selected = true;
            selectEl.appendChild(optEl);
        });
    }

    // Unit conversion listeners
    if (unitGcv) {
        unitGcv.addEventListener("change", () => {
            if (fuelPresetSelect) applyFuelPreset(fuelPresetSelect.value);
            calculateIndirect();
        });
    }

    if (unitTemp) {
        let prevTempUnit = unitTemp.value;
        unitTemp.addEventListener("change", () => {
            const newUnit = unitTemp.value;
            const tg = parseFloat(inputTg.value) || 160;
            const ta = parseFloat(inputTa.value) || 30;
            if (prevTempUnit === "C" && newUnit === "F") {
                inputTg.value = (tg * 1.8 + 32).toFixed(0);
                inputTa.value = (ta * 1.8 + 32).toFixed(0);
            } else if (prevTempUnit === "F" && newUnit === "C") {
                inputTg.value = ((tg - 32) / 1.8).toFixed(0);
                inputTa.value = ((ta - 32) / 1.8).toFixed(0);
            }
            prevTempUnit = newUnit;
            calculateIndirect();
        });
    }

    // Calculation handlers
    calculateBtn.addEventListener("click", () => {
        if (currentMethod === "indirect") {
            calculateIndirect();
        } else {
            calculateDirect();
        }
    });

    function calculateIndirect() {
        try {
            const C = parseFloat(inputC.value) || 0;
            const H2 = parseFloat(inputH.value) || 0;
            const O2 = parseFloat(inputO.value) || 0;
            const N2 = parseFloat(inputN.value) || 0;
            const S = parseFloat(inputS.value) || 0;
            const M = parseFloat(inputM.value) || 0;
            const Ash = parseFloat(inputAsh.value) || 0;

            let rawGcv = parseFloat(inputGcv.value) || 0;
            const gcvUnit = unitGcv.value;
            let gcvKcal = rawGcv;
            if (gcvUnit === "kJ_kg") gcvKcal = rawGcv / 4.1868;
            else if (gcvUnit === "Btu_lb") gcvKcal = rawGcv / 1.8;

            let rawTg = parseFloat(inputTg.value) || 160;
            let rawTa = parseFloat(inputTa.value) || 30;
            const tempUnit = unitTemp.value;
            let TgC = rawTg;
            let TaC = rawTa;
            if (tempUnit === "F") {
                TgC = (rawTg - 32) * (5 / 9);
                TaC = (rawTa - 32) * (5 / 9);
            }

            const O2_flue = parseFloat(inputO2.value) || 5.0;
            const CO_ppm = parseFloat(inputCo.value) || 50;
            const L6 = parseFloat(inputL6.value) || 1.5;
            const L7 = parseFloat(inputL7.value) || 0.5;

            const res = calculateIndirectMethod({
                C, H2, O2, N2, S, M, Ash,
                gcvKcalKg: gcvKcal,
                Tg: TgC,
                Ta: TaC,
                O2_flue,
                CO_ppm,
                L6_radiation: L6,
                L7_unburnt: L7
            });

            // Update UI Output Cards
            document.getElementById("outEff").textContent = `${res.efficiency.toFixed(2)} %`;
            document.getElementById("outLosses").textContent = `${res.totalLosses.toFixed(2)} %`;
            const elHeatRate = document.getElementById("outIndirectHeatRate");
            if (elHeatRate) elHeatRate.textContent = `${res.heatRateBtuKwh.toLocaleString()} Btu/kWh (${res.heatRateKjKwh.toLocaleString()} kJ/kWh)`;
            document.getElementById("outTA").textContent = `${res.theoreticalAir.toFixed(3)} kg/kg`;
            document.getElementById("outEA").textContent = `${res.excessAir.toFixed(1)} %`;
            document.getElementById("outAAS").textContent = `${res.actualAir.toFixed(3)} kg/kg`;
            document.getElementById("outDFG").textContent = `${res.dryFlueGasMass.toFixed(3)} kg/kg`;

            document.getElementById("outL1").textContent = `${res.L1_dryFlueGas.toFixed(2)} %`;
            document.getElementById("outL2").textContent = `${res.L2_hydrogen.toFixed(2)} %`;
            document.getElementById("outL3").textContent = `${res.L3_fuelMoisture.toFixed(2)} %`;
            document.getElementById("outL4").textContent = `${res.L4_airMoisture.toFixed(2)} %`;
            document.getElementById("outL5").textContent = `${res.L5_incompleteCO.toFixed(2)} %`;
            document.getElementById("outL6").textContent = `${res.L6_radiation.toFixed(2)} %`;
            document.getElementById("outL7").textContent = `${res.L7_unburntAsh.toFixed(2)} %`;

            // Render Chart
            chart.render({
                efficiency: res.efficiency,
                L1: res.L1_dryFlueGas,
                L2: res.L2_hydrogen,
                L3: res.L3_fuelMoisture,
                L4: res.L4_airMoisture,
                L5: res.L5_incompleteCO,
                L6: res.L6_radiation,
                L7: res.L7_unburntAsh
            });

        } catch (err) {
            console.error("Indirect calculation error:", err);
            alert("Calculation Error: " + err.message);
        }
    }

    function calculateDirect() {
        try {
            let steamFlow = parseFloat(inputSteamFlow.value) || 25;
            const steamFlowUnit = unitSteamFlow.value;
            let steamFlowKgH = steamFlow;
            if (steamFlowUnit === "tph") steamFlowKgH = steamFlow * 1000;
            else if (steamFlowUnit === "lbh") steamFlowKgH = steamFlow * 0.45359237;

            let fuelFlow = parseFloat(inputFuelFlow.value) || 3.2;
            const fuelFlowUnit = unitFuelFlow.value;
            let fuelFlowKgH = fuelFlow;
            if (fuelFlowUnit === "tph") fuelFlowKgH = fuelFlow * 1000;
            else if (fuelFlowUnit === "lbh") fuelFlowKgH = fuelFlow * 0.45359237;

            let rawP = parseFloat(inputSteamP.value) || 40;
            const pUnit = unitSteamP.value;
            const pMpa = convertToBase(rawP, UNIT_TYPES.PRESSURE, pUnit);

            let rawT = parseFloat(inputSteamT.value) || 400;
            const tUnit = unitSteamT.value;
            const steamTK = convertToBase(rawT, UNIT_TYPES.TEMPERATURE, tUnit);

            let rawFwT = parseFloat(inputFwT.value) || 105;
            const fwUnit = unitFwT.value;
            const fwTK = convertToBase(rawFwT, UNIT_TYPES.TEMPERATURE, fwUnit);

            let rawGcv = parseFloat(inputDirectGcv.value) || 6000;
            const gcvUnit = unitDirectGcv.value;
            let gcvKjKg = rawGcv;
            if (gcvUnit === "kcal_kg") gcvKjKg = rawGcv * 4.1868;
            else if (gcvUnit === "Btu_lb") gcvKjKg = rawGcv * 2.326;

            const res = calculateDirectMethod({
                steamFlowKgH,
                fuelFlowKgH,
                steamPressureMpa: pMpa,
                steamTempK: steamTK,
                fwTempK: fwTK,
                fuelGcvKjKg
            });

            const isUS = currentZone === "US";
            const heatOutMMBtu = res.heatOutputGjH * 0.947817;
            const heatInMMBtu = res.heatInputGjH * 0.947817;
            const equivLbH = res.equivEvaporationKgH * 2.20462;
            const steamHBtu = res.steamEnthalpy * 0.429923;
            const fwHBtu = res.fwEnthalpy * 0.429923;
            const netHeatBtu = res.netHeatKjKg * 0.429923;

            document.getElementById("outDirectEff").textContent = `${res.efficiency.toFixed(2)} %`;
            const elDirectHeatRate = document.getElementById("outDirectHeatRate");
            if (elDirectHeatRate) elDirectHeatRate.textContent = `${res.heatRateBtuKwh.toLocaleString()} Btu/kWh (${res.heatRateKjKwh.toLocaleString()} kJ/kWh)`;

            document.getElementById("outSteamH").textContent = isUS
                ? `${steamHBtu.toFixed(1)} Btu/lb (${res.steamEnthalpy.toFixed(1)} kJ/kg)`
                : `${res.steamEnthalpy.toFixed(1)} kJ/kg (${steamHBtu.toFixed(1)} Btu/lb)`;

            document.getElementById("outFwH").textContent = isUS
                ? `${fwHBtu.toFixed(1)} Btu/lb (${res.fwEnthalpy.toFixed(1)} kJ/kg)`
                : `${res.fwEnthalpy.toFixed(1)} kJ/kg (${fwHBtu.toFixed(1)} Btu/lb)`;

            document.getElementById("outNetHeat").textContent = isUS
                ? `${netHeatBtu.toFixed(1)} Btu/lb (${res.netHeatKjKg.toFixed(1)} kJ/kg)`
                : `${res.netHeatKjKg.toFixed(1)} kJ/kg (${netHeatBtu.toFixed(1)} Btu/lb)`;

            document.getElementById("outHeatOutput").textContent = isUS
                ? `${heatOutMMBtu.toFixed(2)} MMBtu/h (${res.heatOutputGjH.toFixed(2)} GJ/h)`
                : `${res.heatOutputGjH.toFixed(2)} GJ/h (${heatOutMMBtu.toFixed(2)} MMBtu/h)`;

            document.getElementById("outHeatInput").textContent = isUS
                ? `${heatInMMBtu.toFixed(2)} MMBtu/h (${res.heatInputGjH.toFixed(2)} GJ/h)`
                : `${res.heatInputGjH.toFixed(2)} GJ/h (${heatInMMBtu.toFixed(2)} MMBtu/h)`;

            document.getElementById("outEvapRatio").textContent = isUS
                ? `${res.evaporationRatio.toFixed(2)} lb/lb (${res.evaporationRatio.toFixed(2)} kg/kg)`
                : `${res.evaporationRatio.toFixed(2)} kg/kg (${res.evaporationRatio.toFixed(2)} lb/lb)`;

            document.getElementById("outFE").textContent = `${res.factorOfEvaporation.toFixed(3)}`;

            document.getElementById("outEquivEvap").textContent = isUS
                ? `${equivLbH.toFixed(0)} lb/h (${res.equivEvaporationKgH.toFixed(0)} kg/h)`
                : `${res.equivEvaporationKgH.toFixed(0)} kg/h (${equivLbH.toFixed(0)} lb/h)`;

            // Chart update for direct method
            const directLosses = Math.max(0, 100 - res.efficiency);
            chart.render({
                efficiency: res.efficiency,
                L1: directLosses * 0.50,
                L2: directLosses * 0.25,
                L3: directLosses * 0.15,
                L4: directLosses * 0.02,
                L5: 0.05,
                L6: directLosses * 0.05,
                L7: directLosses * 0.03
            });

        } catch (err) {
            console.error("Direct calculation error:", err);
            alert("Calculation Error: " + err.message);
        }
    }

    // Initial calculation
    calculateIndirect();

    // Listen for Global Unit System Changes from Navbar
    window.addEventListener("unitSystemChanged", (e) => {
        currentZone = e.detail && e.detail.system === "US" ? "US" : "EU";
        populateDropdowns(currentZone);
        const defaultPreset = currentZone === "US" ? "us-bituminous" : "in-coal";
        if (fuelPresetSelect) fuelPresetSelect.value = defaultPreset;
        applyFuelPreset(defaultPreset);
        if (currentMethod === "indirect") {
            calculateIndirect();
        } else {
            calculateDirect();
        }
    });

    // Export PDF / Print
    if (printReportBtn) {
        printReportBtn.addEventListener("click", () => {
            window.print();
        });
    }

    // Share link
    if (shareLinkBtn) {
        shareLinkBtn.addEventListener("click", () => {
            const url = window.location.href;
            navigator.clipboard.writeText(url).then(() => {
                const orig = shareLinkBtn.innerHTML;
                shareLinkBtn.innerHTML = "<span>✅ Link Copied!</span>";
                setTimeout(() => { shareLinkBtn.innerHTML = orig; }, 2000);
            }).catch(() => {
                alert("URL copied: " + url);
            });
        });
    }
});
