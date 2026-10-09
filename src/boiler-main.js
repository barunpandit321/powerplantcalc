import { initNavbar } from "./navbar.js";
import { BoilerChart } from "./boiler-chart.js";
import { calculateIndirectMethod, calculateDirectMethod, FUEL_PRESETS } from "./boiler-efficiency.js";
import { convertToBase, convertFromBase, UNIT_TYPES } from "./units.js";
import { detectUserZone, prioritizeUnits } from "./geo.js";

document.addEventListener("DOMContentLoaded", () => {
    initNavbar();

    const chart = new BoilerChart("boilerChart");
    const userZone = detectUserZone();

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
    populateDropdowns();

    // Set Default Preset (US Bituminous or Indian Coal depending on zone)
    applyFuelPreset(userZone === "US" ? "us-bituminous" : "in-coal");

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
        inputTg.value = p.defaultTg;
        inputTa.value = 30;
        inputCo.value = 50;
        inputL6.value = p.defaultL6;
        inputL7.value = p.defaultL7;
    }

    function populateDropdowns() {
        // GCV units
        const gcvOptions = [
            { id: "kcal_kg", label: "kcal/kg" },
            { id: "kJ_kg", label: "kJ/kg" },
            { id: "Btu_lb", label: "Btu/lb" }
        ];
        populateSelect(unitGcv, gcvOptions, userZone === "US" ? "Btu_lb" : "kcal_kg");
        populateSelect(unitDirectGcv, gcvOptions, userZone === "US" ? "Btu_lb" : "kcal_kg");

        // Temp units
        const tempOptions = [
            { id: "C", label: "°C" },
            { id: "F", label: "°F" }
        ];
        populateSelect(unitTemp, tempOptions, userZone === "US" ? "F" : "C");
        populateSelect(unitSteamT, tempOptions, userZone === "US" ? "F" : "C");
        populateSelect(unitFwT, tempOptions, userZone === "US" ? "F" : "C");

        // Pressure units
        const pOptions = [
            { id: "bar_g", label: "bar (gauge)" },
            { id: "bar_a", label: "bar (abs)" },
            { id: "kg_cm2_g", label: "kg/cm² (gauge)" },
            { id: "psi_g", label: "psig" },
            { id: "MPa_g", label: "MPa (gauge)" }
        ];
        populateSelect(unitSteamP, pOptions, userZone === "US" ? "psi_g" : "bar_g");

        // Flow units
        const flowOptions = [
            { id: "tph", label: "t/h (metric tons/hr)" },
            { id: "kgh", label: "kg/h" },
            { id: "lbh", label: "lb/h" }
        ];
        populateSelect(unitSteamFlow, flowOptions, userZone === "US" ? "lbh" : "tph");
        populateSelect(unitFuelFlow, flowOptions, userZone === "US" ? "lbh" : "tph");
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

            document.getElementById("outDirectEff").textContent = `${res.efficiency.toFixed(2)} %`;
            document.getElementById("outSteamH").textContent = `${res.steamEnthalpy.toFixed(1)} kJ/kg`;
            document.getElementById("outFwH").textContent = `${res.fwEnthalpy.toFixed(1)} kJ/kg`;
            document.getElementById("outNetHeat").textContent = `${res.netHeatKjKg.toFixed(1)} kJ/kg`;
            document.getElementById("outHeatOutput").textContent = `${res.heatOutputGjH.toFixed(2)} GJ/h`;
            document.getElementById("outHeatInput").textContent = `${res.heatInputGjH.toFixed(2)} GJ/h`;
            document.getElementById("outEvapRatio").textContent = `${res.evaporationRatio.toFixed(2)} kg/kg`;
            document.getElementById("outFE").textContent = `${res.factorOfEvaporation.toFixed(3)}`;
            document.getElementById("outEquivEvap").textContent = `${res.equivEvaporationKgH.toFixed(0)} kg/h`;

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
