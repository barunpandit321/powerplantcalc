/**
 * IAPWS-IF97 Interactive Steam Tables Controller
 * Features instant search, multi-unit toggles, custom point evaluator,
 * and Excel/CSV clipboard export.
 */

import { initNavbar } from "./navbar.js";
import { getUserUnitSystem } from "./geo.js";
import {
    STANDARD_PRESSURES_BAR,
    STANDARD_TEMPERATURES_C,
    SUPERHEATED_PRESSURES_BAR,
    getSaturatedStateByPressure,
    getSaturatedStateByTemperature,
    getSuperheatedTableForPressure,
    formatRow
} from "./table-generator.js";

document.addEventListener("DOMContentLoaded", () => {
    // 1. Initialize Site Navbar
    initNavbar();

    let currentMode = "pressure"; // "pressure", "temperature", "superheated"
    let currentUnitSystem = getUserUnitSystem(); // "US" or "METRIC"
    let isGaugePressure = false;
    let searchQuery = "";
    let superheatedSelectedPressureBar = 10.0;

    // Cache pre-computed datasets
    let pressureTableData = [];
    let temperatureTableData = [];
    let customPointRow = null;

    // DOM Elements
    const tabPressure = document.getElementById("tabPressure");
    const tabTemperature = document.getElementById("tabTemperature");
    const tabSuperheated = document.getElementById("tabSuperheated");

    const searchInput = document.getElementById("tableSearchInput");
    const customPointInput = document.getElementById("customPointInput");
    const customPointBtn = document.getElementById("customPointBtn");
    const customPointUnit = document.getElementById("customPointUnit");

    const tableBody = document.getElementById("steamTableBody");
    const tableHeaderRow = document.getElementById("steamTableHeaderRow");
    const rowCountBadge = document.getElementById("rowCountBadge");
    const superheatedSelectorWrap = document.getElementById("superheatedSelectorWrap");
    const selectShPressure = document.getElementById("selectShPressure");

    const toggleGaugeCheckbox = document.getElementById("toggleGauge");
    const btnCopyExcel = document.getElementById("btnCopyExcel");
    const btnDownloadCsv = document.getElementById("btnDownloadCsv");
    const btnPrintTable = document.getElementById("btnPrintTable");

    // Pre-calculate full saturated pressure table
    function buildPressureTableData() {
        pressureTableData = STANDARD_PRESSURES_BAR.map(p => {
            try {
                return getSaturatedStateByPressure(p);
            } catch (e) {
                return null;
            }
        }).filter(Boolean);
    }

    // Pre-calculate full saturated temperature table
    function buildTemperatureTableData() {
        temperatureTableData = STANDARD_TEMPERATURES_C.map(t => {
            try {
                return getSaturatedStateByTemperature(t);
            } catch (e) {
                return null;
            }
        }).filter(Boolean);
    }

    // Populate Superheated Pressure Select Dropdown
    if (selectShPressure) {
        selectShPressure.innerHTML = SUPERHEATED_PRESSURES_BAR.map(p => {
            return `<option value="${p}" ${p === 10 ? 'selected' : ''}>${p} bar (abs) / ${(p * 14.50377).toFixed(1)} psia</option>`;
        }).join("");

        selectShPressure.addEventListener("change", () => {
            superheatedSelectedPressureBar = parseFloat(selectShPressure.value) || 10.0;
            renderActiveTable();
        });
    }

    function updateCustomUnitLabel() {
        if (customPointUnit) {
            if (currentMode === "pressure") customPointUnit.textContent = currentUnitSystem === "US" ? (isGaugePressure ? "psig" : "psia") : (isGaugePressure ? "bar(g)" : "bar(a)");
            else if (currentMode === "temperature") customPointUnit.textContent = currentUnitSystem === "US" ? "°F" : "°C";
            else customPointUnit.textContent = currentUnitSystem === "US" ? "°F" : "°C";
        }
    }

    // Switch Tabs
    function setMode(mode) {
        currentMode = mode;
        [tabPressure, tabTemperature, tabSuperheated].forEach(t => t && t.classList.remove("active"));
        if (mode === "pressure" && tabPressure) tabPressure.classList.add("active");
        if (mode === "temperature" && tabTemperature) tabTemperature.classList.add("active");
        if (mode === "superheated" && tabSuperheated) tabSuperheated.classList.add("active");

        if (superheatedSelectorWrap) {
            superheatedSelectorWrap.style.display = mode === "superheated" ? "flex" : "none";
        }

        updateCustomUnitLabel();
        customPointRow = null;
        renderActiveTable();
    }

    if (tabPressure) tabPressure.addEventListener("click", () => setMode("pressure"));
    if (tabTemperature) tabTemperature.addEventListener("click", () => setMode("temperature"));
    if (tabSuperheated) tabSuperheated.addEventListener("click", () => setMode("superheated"));

    // Custom Point Evaluator
    if (customPointBtn && customPointInput) {
        customPointBtn.addEventListener("click", () => {
            const rawVal = parseFloat(customPointInput.value);
            if (isNaN(rawVal)) {
                alert("Please enter a valid numeric value.");
                return;
            }

            try {
                const isUS = currentUnitSystem === "US";
                if (currentMode === "pressure") {
                    let pBar = rawVal;
                    if (isUS) {
                        const psia = isGaugePressure ? rawVal + 14.69595 : rawVal;
                        pBar = psia / 14.50377;
                    } else if (isGaugePressure) {
                        pBar = rawVal + 1.01325;
                    }
                    customPointRow = { ...getSaturatedStateByPressure(pBar), isCustom: true };
                } else if (currentMode === "temperature") {
                    let tC = isUS ? (rawVal - 32) * (5 / 9) : rawVal;
                    customPointRow = { ...getSaturatedStateByTemperature(tC), isCustom: true };
                } else {
                    // Superheated custom temp point
                    let tC = isUS ? (rawVal - 32) * (5 / 9) : rawVal;
                    const res = getSuperheatedTableForPressure(superheatedSelectedPressureBar, [tC]);
                    if (res.rows.length > 0) {
                        customPointRow = { ...res.rows[0], isCustom: true };
                    }
                }
                renderActiveTable();
            } catch (err) {
                alert("Calculation error: " + err.message);
            }
        });
    }

    // Search filter
    if (searchInput) {
        searchInput.addEventListener("input", () => {
            searchQuery = searchInput.value.trim().toLowerCase();
            renderActiveTable();
        });
    }

    // Gauge vs Absolute Checkbox
    if (toggleGaugeCheckbox) {
        toggleGaugeCheckbox.addEventListener("change", () => {
            isGaugePressure = toggleGaugeCheckbox.checked;
            updateCustomUnitLabel();
            renderActiveTable();
        });
    }

    // Render Table Header based on Active Mode and Units
    function renderHeaders() {
        if (!tableHeaderRow) return;
        const isUS = currentUnitSystem === "US";

        const pLabel = isUS ? (isGaugePressure ? "Pressure (psig)" : "Pressure (psia)") : (isGaugePressure ? "Pressure [bar (g)]" : "Pressure [bar (a)]");
        const tLabel = isUS ? "Sat. Temp [°F]" : "Sat. Temp [°C]";
        const hLabel = isUS ? "Btu/lb" : "kJ/kg";
        const sLabel = isUS ? "Btu/(lb·°F)" : "kJ/(kg·K)";
        const vLabel = isUS ? "ft³/lb" : "m³/kg";

        if (currentMode === "superheated") {
            tableHeaderRow.innerHTML = `
                <th>Temperature (${isUS ? '°F' : '°C'})</th>
                <th>Pressure (${isUS ? 'psia' : 'bar'})</th>
                <th>Specific Volume (${vLabel})</th>
                <th>Density (${isUS ? 'lb/ft³' : 'kg/m³'})</th>
                <th>Enthalpy (${hLabel})</th>
                <th>Entropy (${sLabel})</th>
                <th>Specific Heat Cp (${isUS ? 'Btu/(lb·°F)' : 'kJ/(kg·K)'})</th>
                <th>State Condition</th>
            `;
            return;
        }

        // Saturated Table Headers
        tableHeaderRow.innerHTML = `
            <th>${currentMode === 'temperature' ? 'Temp (' + (isUS ? '°F' : '°C') + ')' : pLabel}</th>
            <th>${currentMode === 'temperature' ? pLabel : tLabel}</th>
            <th>v<sub>f</sub> (${isUS ? 'ft³/lb' : '10⁻³ m³/kg'})</th>
            <th>v<sub>g</sub> (${vLabel})</th>
            <th>h<sub>f</sub> (${hLabel})</th>
            <th>h<sub>fg</sub> (${hLabel})</th>
            <th>h<sub>g</sub> (${hLabel})</th>
            <th>s<sub>f</sub> (${sLabel})</th>
            <th>s<sub>g</sub> (${sLabel})</th>
        `;
    }

    // Render Table Rows
    function renderActiveTable() {
        renderHeaders();
        if (!tableBody) return;
        tableBody.innerHTML = "";

        let dataset = [];
        if (currentMode === "pressure") dataset = [...pressureTableData];
        else if (currentMode === "temperature") dataset = [...temperatureTableData];
        else {
            // Superheated
            const tempsC = [
                100, 120, 140, 150, 160, 180, 200, 220, 240, 250, 260, 280, 300,
                320, 350, 380, 400, 420, 450, 480, 500, 550, 600, 650, 700, 750, 800
            ];
            const shRes = getSuperheatedTableForPressure(superheatedSelectedPressureBar, tempsC);
            dataset = shRes.rows;
        }

        // If custom point exists, prepend it
        if (customPointRow) {
            dataset.unshift(customPointRow);
        }

        // Apply Search Filtering
        let visibleCount = 0;
        dataset.forEach(rawRow => {
            if (currentMode === "superheated") {
                renderSuperheatedRow(rawRow);
            } else {
                renderSaturatedRow(rawRow);
            }
        });

        function renderSaturatedRow(rawRow) {
            const formatted = formatRow(rawRow, currentUnitSystem, isGaugePressure);

            // Filter check
            if (searchQuery) {
                const searchStr = `${formatted.pFormatted} ${formatted.tFormatted} ${formatted.hfFormatted} ${formatted.hgFormatted}`.toLowerCase();
                if (!searchStr.includes(searchQuery)) return;
            }

            visibleCount++;
            const tr = document.createElement("tr");
            if (rawRow.isCustom) tr.classList.add("custom-point-row");

            const col1 = currentMode === "temperature" ? formatted.tFormatted : formatted.pFormatted;
            const col2 = currentMode === "temperature" ? formatted.pFormatted : formatted.tFormatted;

            tr.innerHTML = `
                <td style="font-weight: 700;">${col1} ${rawRow.isCustom ? ' <span class="badge" style="background:#10b981; color:#fff; font-size:0.7rem;">Custom</span>' : ''}</td>
                <td style="font-weight: 600;">${col2}</td>
                <td>${formatted.vfFormatted}</td>
                <td>${formatted.vgFormatted}</td>
                <td>${formatted.hfFormatted}</td>
                <td style="color: var(--text-muted);">${formatted.hfgFormatted}</td>
                <td style="font-weight: 600; color: #0284c7;">${formatted.hgFormatted}</td>
                <td>${formatted.sfFormatted}</td>
                <td style="font-weight: 600;">${formatted.sgFormatted}</td>
            `;
            tableBody.appendChild(tr);
        }

        function renderSuperheatedRow(rawRow) {
            const isUS = currentUnitSystem === "US";
            const tDisp = isUS ? (rawRow.tC * 1.8 + 32).toFixed(1) : rawRow.tC.toFixed(1);
            const pDisp = isUS ? (rawRow.pBar * 14.50377).toFixed(1) : rawRow.pBar.toFixed(1);
            const vConv = isUS ? 16.01846 : 1;
            const hConv = isUS ? (1 / 2.326) : 1;
            const sConv = isUS ? (1 / 4.1868) : 1;
            const cpConv = isUS ? (1 / 4.1868) : 1;
            const rhoConv = isUS ? 0.06242796 : 1;

            if (searchQuery) {
                const searchStr = `${tDisp} ${pDisp}`.toLowerCase();
                if (!searchStr.includes(searchQuery)) return;
            }

            visibleCount++;
            const tr = document.createElement("tr");
            if (rawRow.isCustom) tr.classList.add("custom-point-row");
            if (rawRow.isSat) tr.style.background = "rgba(6, 182, 212, 0.08)";

            tr.innerHTML = `
                <td style="font-weight: 700;">${tDisp} ${rawRow.isCustom ? ' <span class="badge" style="background:#10b981; color:#fff; font-size:0.7rem;">Custom</span>' : ''}</td>
                <td>${pDisp}</td>
                <td>${(rawRow.v * vConv).toFixed(4)}</td>
                <td>${(rawRow.rho * rhoConv).toFixed(2)}</td>
                <td style="font-weight: 600; color: #0284c7;">${(rawRow.h * hConv).toFixed(1)}</td>
                <td>${(rawRow.s * sConv).toFixed(4)}</td>
                <td>${(rawRow.cp * cpConv).toFixed(3)}</td>
                <td>${rawRow.isSat ? '<span class="badge" style="background:#0284c7; color:#fff; font-size:0.75rem;">Saturated Vapor</span>' : '<span style="color:#10b981; font-weight:600; font-size:0.8rem;">Superheated</span>'}</td>
            `;
            tableBody.appendChild(tr);
        }

        if (rowCountBadge) {
            rowCountBadge.textContent = `${visibleCount} rows displayed`;
        }
    }

    // Export Table Data to Clipboard (Excel TSV)
    function exportToClipboard() {
        const table = document.getElementById("steamTableElement");
        if (!table) return;

        let tsv = "";
        const rows = table.querySelectorAll("tr");
        rows.forEach(r => {
            const cols = r.querySelectorAll("th, td");
            const rowArr = Array.from(cols).map(c => c.textContent.trim().replace(/\s+/g, " "));
            tsv += rowArr.join("\t") + "\n";
        });

        navigator.clipboard.writeText(tsv).then(() => {
            if (btnCopyExcel) {
                const orig = btnCopyExcel.innerHTML;
                btnCopyExcel.innerHTML = "✅ Copied to Clipboard!";
                setTimeout(() => { btnCopyExcel.innerHTML = orig; }, 2200);
            }
        }).catch(err => {
            alert("Clipboard copy error: " + err);
        });
    }

    // Download CSV File
    function downloadCsv() {
        const table = document.getElementById("steamTableElement");
        if (!table) return;

        let csv = "";
        const rows = table.querySelectorAll("tr");
        rows.forEach(r => {
            const cols = r.querySelectorAll("th, td");
            const rowArr = Array.from(cols).map(c => `"${c.textContent.trim().replace(/"/g, '""')}"`);
            csv += rowArr.join(",") + "\n";
        });

        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `Steam_Table_${currentMode}_${currentUnitSystem}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    }

    if (btnCopyExcel) btnCopyExcel.addEventListener("click", exportToClipboard);
    if (btnDownloadCsv) btnDownloadCsv.addEventListener("click", downloadCsv);
    if (btnPrintTable) btnPrintTable.addEventListener("click", () => window.print());

    // Listen to Navbar Global Unit Change
    window.addEventListener("unitSystemChanged", e => {
        currentUnitSystem = e.detail && e.detail.system === "US" ? "US" : "METRIC";
        updateCustomUnitLabel();
        renderActiveTable();
    });

    // Initial Build
    buildPressureTableData();
    buildTemperatureTableData();
    setMode("pressure");
});
