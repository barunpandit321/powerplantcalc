import { initNavbar } from "./navbar.js";
import { PipeChart } from "./pipe-chart.js";
import { sizePipeByVelocity, STANDARD_PIPES } from "./pipe-sizing.js";
import { convertToBase, UNIT_TYPES } from "./units.js";
import { detectUserZone } from "./geo.js";

export const PIPE_PRESETS = {
    "hp-main": {
        flow: 50000,
        flowUnit: "kg_h",
        pressure: 65,
        pUnit: "bar_g",
        isSaturated: false,
        temp: 485,
        tempUnit: "C",
        targetVel: 35,
        velUnit: "m_s",
        schedule: "Sch80",
        length: 100,
        lengthUnit: "m"
    },
    "mp-process": {
        flow: 10000,
        flowUnit: "kg_h",
        pressure: 10,
        pUnit: "bar_g",
        isSaturated: true,
        temp: 184,
        tempUnit: "C",
        targetVel: 25,
        velUnit: "m_s",
        schedule: "Sch40",
        length: 100,
        lengthUnit: "m"
    },
    "lp-heating": {
        flow: 2500,
        flowUnit: "kg_h",
        pressure: 3.5,
        pUnit: "bar_g",
        isSaturated: true,
        temp: 148,
        tempUnit: "C",
        targetVel: 20,
        velUnit: "m_s",
        schedule: "Sch40",
        length: 100,
        lengthUnit: "m"
    },
    "us-600psig": {
        flow: 50000,
        flowUnit: "lb_h",
        pressure: 600,
        pUnit: "psi_g",
        isSaturated: false,
        temp: 750,
        tempUnit: "F",
        targetVel: 7000,
        velUnit: "ft_min",
        schedule: "Sch80",
        length: 200,
        lengthUnit: "ft"
    },
    "turbine-exhaust": {
        flow: 20000,
        flowUnit: "kg_h",
        pressure: 0.1,
        pUnit: "bar_a",
        isSaturated: true,
        temp: 45.8,
        tempUnit: "C",
        targetVel: 55,
        velUnit: "m_s",
        schedule: "Sch40",
        length: 30,
        lengthUnit: "m"
    }
};

document.addEventListener("DOMContentLoaded", () => {
    initNavbar();

    const chart = new PipeChart("pipeChart");
    const userZone = detectUserZone();

    // Inputs
    const inputFlow = document.getElementById("inputFlow");
    const unitFlow = document.getElementById("unitFlow");
    const inputPressure = document.getElementById("inputPressure");
    const unitPressure = document.getElementById("unitPressure");
    const checkSaturated = document.getElementById("checkSaturated");
    const tempGroup = document.getElementById("tempGroup");
    const inputTemp = document.getElementById("inputTemp");
    const unitTemp = document.getElementById("unitTemp");
    const inputTargetVel = document.getElementById("inputTargetVel");
    const unitTargetVel = document.getElementById("unitTargetVel");
    const selectSchedule = document.getElementById("selectSchedule");
    const inputLength = document.getElementById("inputLength");
    const unitLength = document.getElementById("unitLength");
    const presetSelect = document.getElementById("pipePresetSelect");
    const presetButtons = document.querySelectorAll("[data-pipe-preset]");

    // Buttons
    const calculateBtn = document.getElementById("calculateBtn");
    const shareLinkBtn = document.getElementById("shareLinkBtn");
    const printReportBtn = document.getElementById("printReportBtn");

    // Output Elements
    const outRecommendedNps = document.getElementById("outRecommendedNps");
    const outRecommendedId = document.getElementById("outRecommendedId");
    const outVelocity = document.getElementById("outVelocity");
    const outVelocityStatus = document.getElementById("outVelocityStatus");
    const outDpPer100m = document.getElementById("outDpPer100m");
    const outDpTotal = document.getElementById("outDpTotal");
    const outSpecVolume = document.getElementById("outSpecVolume");
    const outDensity = document.getElementById("outDensity");
    const outSteamTemp = document.getElementById("outSteamTemp");
    const outSatSuperheat = document.getElementById("outSatSuperheat");
    const outVolFlow = document.getElementById("outVolFlow");
    const outReynolds = document.getElementById("outReynolds");
    const outFrictionFactor = document.getElementById("outFrictionFactor");
    const outMinId = document.getElementById("outMinId");

    // Next Larger Pipe Output Elements
    const nextSizeCard = document.getElementById("nextSizeCard");
    const outNextNps = document.getElementById("outNextNps");
    const outNextVelocity = document.getElementById("outNextVelocity");
    const outNextDp = document.getElementById("outNextDp");

    // Comparison Table Body
    const comparisonTableBody = document.getElementById("comparisonTableBody");

    // Handle Saturated Checkbox toggle
    if (checkSaturated) {
        checkSaturated.addEventListener("change", () => {
            updateTempVisibility();
            calculate();
        });
    }

    function updateTempVisibility() {
        if (!tempGroup || !inputTemp) return;
        if (checkSaturated.checked) {
            inputTemp.disabled = true;
            tempGroup.style.opacity = "0.5";
            const badge = document.getElementById("satBadgeNotice");
            if (badge) badge.textContent = "(Auto Calculated Saturation Temp)";
        } else {
            inputTemp.disabled = false;
            tempGroup.style.opacity = "1";
            const badge = document.getElementById("satBadgeNotice");
            if (badge) badge.textContent = "(Must exceed saturation temp)";
        }
    }

    // Apply Presets
    function applyPreset(presetKey) {
        const p = PIPE_PRESETS[presetKey];
        if (!p) return;

        if (inputFlow) inputFlow.value = p.flow;
        if (unitFlow) unitFlow.value = p.flowUnit;
        if (inputPressure) inputPressure.value = p.pressure;
        if (unitPressure) unitPressure.value = p.pUnit;
        if (checkSaturated) checkSaturated.checked = p.isSaturated;
        if (inputTemp) inputTemp.value = p.temp;
        if (unitTemp) unitTemp.value = p.tempUnit;
        if (inputTargetVel) inputTargetVel.value = p.targetVel;
        if (unitTargetVel) unitTargetVel.value = p.velUnit;
        if (selectSchedule) selectSchedule.value = p.schedule;
        if (inputLength) inputLength.value = p.length;
        if (unitLength) unitLength.value = p.lengthUnit;
        if (presetSelect) presetSelect.value = presetKey;

        // Visual active state for preset buttons
        presetButtons.forEach(btn => {
            if (btn.getAttribute("data-pipe-preset") === presetKey) {
                btn.classList.add("active");
            } else {
                btn.classList.remove("active");
            }
        });

        updateTempVisibility();
    }

    // Bind Presets Buttons & Dropdown
    presetButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            const key = btn.getAttribute("data-pipe-preset");
            applyPreset(key);
            calculate();
        });
    });

    if (presetSelect) {
        presetSelect.addEventListener("change", (e) => {
            applyPreset(e.target.value);
            calculate();
        });
    }

    // Real-time calculation triggers
    const triggerInputs = [
        inputFlow, unitFlow, inputPressure, unitPressure,
        inputTemp, unitTemp, inputTargetVel, unitTargetVel,
        selectSchedule, inputLength, unitLength
    ];

    triggerInputs.forEach(el => {
        if (el) {
            el.addEventListener("input", () => calculate());
            el.addEventListener("change", () => calculate());
        }
    });

    if (calculateBtn) {
        calculateBtn.addEventListener("click", () => calculate());
    }

    // Main Calculation Function
    function calculate() {
        try {
            // 1. Convert Steam Flow to kg/h
            let rawFlow = parseFloat(inputFlow.value) || 0;
            const flowU = unitFlow ? unitFlow.value : "kg_h";
            let flowKgH = rawFlow;
            if (flowU === "t_h") flowKgH = rawFlow * 1000;
            else if (flowU === "lb_h") flowKgH = rawFlow * 0.45359237;
            else if (flowU === "klb_h") flowKgH = rawFlow * 453.59237;

            // 2. Convert Pressure to MPa abs
            let rawP = parseFloat(inputPressure.value) || 1;
            const pU = unitPressure ? unitPressure.value : "bar_g";
            const pMpa = convertToBase(rawP, UNIT_TYPES.PRESSURE, pU);

            // 3. Steam Phase & Temperature
            const isSaturated = checkSaturated ? checkSaturated.checked : true;
            let tempK = null;
            if (!isSaturated && inputTemp) {
                let rawT = parseFloat(inputTemp.value) || 200;
                const tU = unitTemp ? unitTemp.value : "C";
                if (tU === "F") {
                    tempK = (rawT - 32) * (5 / 9) + 273.15;
                } else {
                    tempK = rawT + 273.15;
                }
            }

            // 4. Target Velocity in m/s
            let rawTargetVel = parseFloat(inputTargetVel.value) || 25;
            const velU = unitTargetVel ? unitTargetVel.value : "m_s";
            let targetVelMs = rawTargetVel;
            if (velU === "ft_min") targetVelMs = rawTargetVel / 196.8504;
            else if (velU === "ft_s") targetVelMs = rawTargetVel * 0.3048;

            // 5. Pipe Schedule
            const schedule = selectSchedule ? selectSchedule.value : "Sch40";

            // 6. Pipe Length in meters
            let rawLength = parseFloat(inputLength.value) || 100;
            const lengthU = unitLength ? unitLength.value : "m";
            let pipeLengthM = lengthU === "ft" ? rawLength * 0.3048 : rawLength;

            // Run Pipe Sizing Engine
            const res = sizePipeByVelocity({
                flowKgH,
                pMpa,
                isSaturated,
                tempK,
                targetVelMs,
                schedule,
                pipeLengthM
            });

            // Update Primary Output Cards
            const rec = res.recommendedPipe;
            if (outRecommendedNps) outRecommendedNps.textContent = `${rec.nps} (DN${rec.dn})`;
            if (outRecommendedId) outRecommendedId.textContent = `${rec.idMm.toFixed(1)} mm (${(rec.idMm / 25.4).toFixed(2)}")`;
            if (outVelocity) outVelocity.textContent = `${rec.velocityMs.toFixed(2)} m/s (${rec.velocityFtMin.toLocaleString()} ft/min)`;

            if (outVelocityStatus) {
                outVelocityStatus.textContent = rec.status.text;
                outVelocityStatus.style.color = rec.status.color;
            }

            if (outDpPer100m) outDpPer100m.textContent = `${rec.dpBarPer100m.toFixed(3)} bar/100m (${rec.dpPsiPer100ft.toFixed(2)} psi/100ft)`;
            if (outDpTotal) outDpTotal.textContent = `${rec.dpTotalBar.toFixed(3)} bar (${(rec.dpTotalBar * 14.5038).toFixed(2)} psi)`;

            // Fluid & Hydraulic Properties
            if (outSpecVolume) outSpecVolume.textContent = `${res.specificVolume.toFixed(4)} m³/kg (${(res.specificVolume * 16.0185).toFixed(3)} ft³/lb)`;
            if (outDensity) outDensity.textContent = `${res.density.toFixed(3)} kg/m³ (${(res.density / 16.0185).toFixed(3)} lb/ft³)`;
            if (outSteamTemp) outSteamTemp.textContent = `${res.temperatureC.toFixed(1)} °C (${(res.temperatureC * 1.8 + 32).toFixed(1)} °F)`;

            if (outSatSuperheat) {
                if (isSaturated) {
                    outSatSuperheat.textContent = `Sat: ${res.satTemperatureC.toFixed(1)} °C (Dry Saturated)`;
                } else {
                    outSatSuperheat.textContent = `Sat: ${res.satTemperatureC.toFixed(1)} °C | Superheat: +${res.superheatC.toFixed(1)} °C`;
                }
            }

            if (outVolFlow) outVolFlow.textContent = `${res.volFlowM3H.toLocaleString()} m³/h (${res.volFlowAcfm.toLocaleString()} ACFM)`;
            if (outReynolds) outReynolds.textContent = `${rec.reynoldsNumber.toLocaleString()} (Turbulent)`;
            if (outFrictionFactor) outFrictionFactor.textContent = `${rec.frictionFactor.toFixed(4)} (Haaland)`;
            if (outMinId) outMinId.textContent = `${res.minIdMm.toFixed(1)} mm (${res.minIdInch.toFixed(2)}")`;

            // Next Larger Pipe
            if (res.nextLargerPipe && nextSizeCard) {
                nextSizeCard.style.display = "block";
                const next = res.nextLargerPipe;
                if (outNextNps) outNextNps.textContent = `${next.nps} (DN${next.dn}) — ID: ${next.idMm.toFixed(1)} mm`;
                if (outNextVelocity) outNextVelocity.textContent = `${next.velocityMs.toFixed(2)} m/s (${next.velocityFtMin.toLocaleString()} ft/min)`;
                if (outNextDp) outNextDp.textContent = `${next.dpBarPer100m.toFixed(3)} bar/100m (${next.dpPsiPer100ft.toFixed(2)} psi/100ft)`;
            } else if (nextSizeCard) {
                nextSizeCard.style.display = "none";
            }

            // Render Chart
            chart.render({
                velocity: rec.velocityMs,
                targetVelocity: targetVelMs,
                dpBar100m: rec.dpBarPer100m,
                nps: rec.nps,
                dn: rec.dn,
                idMm: rec.idMm
            });

            // Populate Comparison Table
            renderComparisonTable(res.comparisonTable, rec.dn);

        } catch (err) {
            console.error("Steam pipe sizing calculation error:", err);
        }
    }

    function renderComparisonTable(tableData, recommendedDn) {
        if (!comparisonTableBody || !tableData) return;
        comparisonTableBody.innerHTML = "";

        tableData.forEach(row => {
            const tr = document.createElement("tr");
            const isRec = row.dn === recommendedDn;
            if (isRec) {
                tr.classList.add("recommended-row");
            }

            let badgeHtml = isRec 
                ? `<span class="badge" style="background: rgba(16, 185, 129, 0.2); color: #10b981; font-weight: 700; padding: 2px 8px; border-radius: 4px;">Recommended</span>` 
                : `<span style="color: ${row.status.color}; font-size: 0.85rem; font-weight: 600;">${row.status.code.toUpperCase()}</span>`;

            tr.innerHTML = `
                <td style="font-weight: ${isRec ? '700' : '500'};">${row.nps} (DN${row.dn})</td>
                <td>${row.idMm.toFixed(1)} mm</td>
                <td style="font-weight: 600; color: ${row.status.color};">${row.velocityMs.toFixed(1)} m/s <small style="color: var(--text-muted); font-weight: 400;">(${row.velocityFtMin.toLocaleString()} ft/m)</small></td>
                <td>${row.dpBarPer100m.toFixed(3)} bar <small style="color: var(--text-muted);">(${row.dpPsiPer100ft.toFixed(2)} psi)</small></td>
                <td>${badgeHtml}</td>
            `;
            comparisonTableBody.appendChild(tr);
        });
    }

    // Default initialization
    if (userZone === "US") {
        applyPreset("us-600psig");
    } else {
        applyPreset("mp-process");
    }
    calculate();

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
