/**
 * IAPWS-IF97 Steam Table Data Generator
 * Computes Saturated Steam by Pressure, Saturated Steam by Temperature,
 * and Superheated Steam matrix dynamically with zero interpolation error.
 */

import { calculate } from "./steam.js";

// Standard Engineering Pressure Points (bar abs)
export const STANDARD_PRESSURES_BAR = [
    0.01, 0.02, 0.03, 0.04, 0.05, 0.06, 0.08, 0.1, 0.15, 0.2, 0.25, 0.3,
    0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 1.01325, 1.2, 1.5, 2.0, 2.5, 3.0,
    3.5, 4.0, 4.5, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0, 12.0, 14.0, 16.0, 18.0,
    20.0, 25.0, 30.0, 35.0, 40.0, 45.0, 50.0, 55.0, 60.0, 65.0, 70.0, 80.0,
    90.0, 100.0, 110.0, 120.0, 130.0, 140.0, 150.0, 160.0, 170.0, 180.0,
    190.0, 200.0, 210.0, 220.0, 220.64
];

// Standard Engineering Temperature Points (°C)
export const STANDARD_TEMPERATURES_C = [
    0.01, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75,
    80, 85, 90, 95, 100, 105, 110, 115, 120, 125, 130, 135, 140, 145,
    150, 155, 160, 165, 170, 175, 180, 185, 190, 195, 200, 210, 220,
    230, 240, 250, 260, 270, 280, 290, 300, 310, 320, 330, 340, 350,
    360, 370, 373.946
];

// Superheated Pressure Presets (bar abs)
export const SUPERHEATED_PRESSURES_BAR = [
    0.5, 1.0, 2.0, 5.0, 10.0, 15.0, 20.0, 30.0, 40.0, 60.0, 80.0, 100.0, 140.0, 180.0
];

/**
 * Calculates a single Saturated Steam state by Pressure (bar abs)
 */
export function getSaturatedStateByPressure(pBar) {
    if (pBar < 0.00611657 || pBar > 220.64) {
        throw new Error("Pressure must be between 0.00612 bar and 220.64 bar (Critical Point).");
    }
    const pMpa = pBar * 0.1;
    const liq = calculate("PX", pMpa, 0);
    const vap = calculate("PX", pMpa, 1);

    return {
        pBar,
        tC: liq.temperature - 273.15,
        vf: liq.specificVolume,
        vg: vap.specificVolume,
        hf: liq.enthalpy,
        hg: vap.enthalpy,
        hfg: vap.enthalpy - liq.enthalpy,
        sf: liq.entropy,
        sg: vap.entropy,
        sfg: vap.entropy - liq.entropy,
        cpLiq: liq.cp,
        cpVap: vap.cp
    };
}

/**
 * Calculates a single Saturated Steam state by Temperature (°C)
 */
export function getSaturatedStateByTemperature(tC) {
    if (tC < 0.01 || tC > 373.946) {
        throw new Error("Temperature must be between 0.01°C and 373.946°C (Critical Point).");
    }
    const tK = tC + 273.15;
    const liq = calculate("TX", tK, 0);
    const vap = calculate("TX", tK, 1);

    return {
        pBar: liq.pressure * 10,
        tC,
        vf: liq.specificVolume,
        vg: vap.specificVolume,
        hf: liq.enthalpy,
        hg: vap.enthalpy,
        hfg: vap.enthalpy - liq.enthalpy,
        sf: liq.entropy,
        sg: vap.entropy,
        sfg: vap.entropy - liq.entropy,
        cpLiq: liq.cp,
        cpVap: vap.cp
    };
}

/**
 * Calculates Superheated Steam properties for a pressure and array of temperatures
 */
export function getSuperheatedTableForPressure(pBar, targetTempsC) {
    const pMpa = pBar * 0.1;
    const sat = getSaturatedStateByPressure(pBar);
    const tSatC = sat.tC;

    // Filter temps strictly above Tsat
    const validTemps = targetTempsC.filter(t => t >= tSatC);

    const rows = validTemps.map(tC => {
        const isSat = Math.abs(tC - tSatC) < 0.1;
        if (isSat) {
            return {
                pBar,
                tC: tSatC,
                isSat: true,
                v: sat.vg,
                h: sat.hg,
                s: sat.sg,
                cp: sat.cpVap,
                rho: 1 / sat.vg
            };
        }

        const state = calculate("PT", pMpa, tC + 273.15);
        return {
            pBar,
            tC,
            isSat: false,
            v: state.specificVolume,
            h: state.enthalpy,
            s: state.entropy,
            cp: state.cp,
            rho: state.density
        };
    });

    return {
        pBar,
        tSatC,
        rows
    };
}

/**
 * Converts row metrics into target unit system
 */
export function formatRow(row, unitSystem = "METRIC", isGauge = false) {
    const isUS = unitSystem === "US";
    const isInd = unitSystem === "IND_METRIC";

    // 1. Pressure
    let pVal = row.pBar;
    let pLabel = "bar";
    if (isUS) {
        pVal = isGauge ? (row.pBar * 14.50377) - 14.69595 : row.pBar * 14.50377;
        pLabel = isGauge ? "psig" : "psia";
    } else if (isInd) {
        pVal = isGauge ? (row.pBar / 0.0980665) - 1.033227 : row.pBar / 0.0980665;
        pLabel = isGauge ? "kg/cm²(g)" : "kg/cm²(a)";
    } else {
        pVal = isGauge ? row.pBar - 1.01325 : row.pBar;
        pLabel = isGauge ? "bar (g)" : "bar (a)";
    }

    // 2. Temperature
    const tVal = isUS ? row.tC * 1.8 + 32 : row.tC;
    const tLabel = isUS ? "°F" : "°C";

    // 3. Enthalpy (hf, hfg, hg)
    const hConv = isUS ? (1 / 2.326) : (isInd ? (1 / 4.1868) : 1);
    const hLabel = isUS ? "Btu/lb" : (isInd ? "kcal/kg" : "kJ/kg");

    // 4. Entropy (sf, sfg, sg)
    const sConv = isUS ? (1 / 4.1868) : (isInd ? (1 / 4.1868) : 1);
    const sLabel = isUS ? "Btu/(lb·°F)" : (isInd ? "kcal/(kg·°C)" : "kJ/(kg·K)");

    // 5. Specific Volume (vf, vg)
    const vConv = isUS ? 16.01846 : 1;
    const vLabel = isUS ? "ft³/lb" : "m³/kg";

    return {
        pFormatted: pVal < 10 ? pVal.toFixed(3) : (pVal < 100 ? pVal.toFixed(2) : pVal.toFixed(1)),
        pLabel,
        tFormatted: tVal.toFixed(2),
        tLabel,
        vfFormatted: isUS ? (row.vf * vConv).toFixed(5) : (row.vf * 1000).toFixed(4), // in metric display vf * 10^-3
        vfLabel: isUS ? "ft³/lb" : "10⁻³ m³/kg",
        vgFormatted: row.vg * vConv < 1 ? (row.vg * vConv).toFixed(4) : (row.vg * vConv).toFixed(3),
        vgLabel: vLabel,
        hfFormatted: (row.hf * hConv).toFixed(1),
        hfgFormatted: (row.hfg * hConv).toFixed(1),
        hgFormatted: (row.hg * hConv).toFixed(1),
        hLabel,
        sfFormatted: (row.sf * sConv).toFixed(4),
        sgFormatted: (row.sg * sConv).toFixed(4),
        sLabel
    };
}
