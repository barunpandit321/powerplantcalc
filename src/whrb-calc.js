/**
 * WHRB (Waste Heat Recovery Boiler) / HRSG Thermodynamic Calculation Engine
 * 
 * Compliant with ASME PTC 4.4 (Gas Turbine Heat Recovery Steam Generators),
 * IAPWS-IF97 steam formulations, and industrial heat recovery design standards.
 */

import { calculate as calculateSteam } from "./steam.js";

/**
 * Calculates WHRB thermodynamic performance, pinch point, and steam generation.
 * 
 * All internal calculations use standard SI units:
 * - Gas mass flow: kg/s
 * - Temperatures: °C (converted to K for IAPWS-IF97)
 * - Pressures: MPa (abs)
 * - Enthalpies: kJ/kg
 * 
 * @param {Object} params
 * @param {number} params.gasFlowTh - Flue gas mass flow (t/h)
 * @param {number} params.gasTempInC - Flue gas inlet temperature (°C)
 * @param {number} params.steamPressBar - Steam drum / superheater pressure (bar abs)
 * @param {boolean} params.isSuperheated - True if superheated, false if saturated
 * @param {number} params.steamTempC - Target superheated steam temperature (°C, ignored if saturated)
 * @param {number} params.fwTempC - Feedwater inlet temperature (°C)
 * @param {number} params.pinchPointC - Evaporator pinch point ΔT (°C, typical 10-20°C)
 * @param {number} params.approachPointC - Economizer approach point ΔT (°C, typical 5-15°C)
 * @param {number} params.blowdownFrac - Continuous boiler blowdown fraction (0.01 - 0.03)
 * @param {number} params.casingHeatLossFrac - Radiation & casing loss fraction (0.01 - 0.02)
 * @param {number} [params.cpGas] - Mean flue gas specific heat capacity (kJ/(kg·K)), default ~1.08
 * @returns {Object} Calculated thermodynamic state and performance metrics
 */
export function calculateWhrb(params) {
    const {
        gasFlowTh = 180,
        gasTempInC = 520,
        steamPressBar = 42,
        isSuperheated = true,
        steamTempC = 430,
        fwTempC = 105,
        pinchPointC = 15,
        approachPointC = 10,
        blowdownFrac = 0.02,
        casingHeatLossFrac = 0.015,
        cpGas = 1.08
    } = params;

    // Convert to SI base calculation units
    const gasFlowKgS = (gasFlowTh * 1000) / 3600; // kg/s
    const pMpa = steamPressBar * 0.1; // MPa abs
    const pFwMpa = (steamPressBar + 3) * 0.1; // Economizer operates slightly above drum pressure to overcome friction

    // 1. Drum Saturation State (IAPWS-IF97)
    // Saturated liquid (x = 0) and saturated vapor (x = 1) at drum pressure
    const satLiquid = calculateSteam("PX", pMpa, 0);
    const satVapor = calculateSteam("PX", pMpa, 1);

    const tSatC = satLiquid.temperature - 273.15;
    const hfDrum = satLiquid.enthalpy; // kJ/kg
    const hgDrum = satVapor.enthalpy; // kJ/kg
    const hfgDrum = hgDrum - hfDrum; // kJ/kg

    // 2. Final Steam State (Superheater outlet or Saturated steam)
    let finalSteamTempC = tSatC;
    let finalSteamEnthalpy = hgDrum;
    let finalSteamEntropy = satVapor.entropy;
    let finalSteamSpecVol = satVapor.volume;

    if (isSuperheated && steamTempC > tSatC + 2) {
        finalSteamTempC = steamTempC;
        const shSteam = calculateSteam("PT", pMpa, steamTempC + 273.15);
        finalSteamEnthalpy = shSteam.enthalpy;
        finalSteamEntropy = shSteam.entropy;
        finalSteamSpecVol = shSteam.volume;
    } else {
        // Saturated steam
        finalSteamTempC = tSatC;
        finalSteamEnthalpy = hgDrum;
    }

    // 3. Feedwater State entering Economizer (IAPWS-IF97)
    const fwWater = calculateSteam("PT", pFwMpa, fwTempC + 273.15);
    const hFw = fwWater.enthalpy; // kJ/kg

    // 4. Economizer Outlet Water State (entering Drum)
    // Subcooled liquid by approachPointC below Tsat to prevent steaming in economizer tubes
    const tEconOutC = Math.max(fwTempC + 5, tSatC - approachPointC);
    const econOutWater = calculateSteam("PT", pFwMpa, tEconOutC + 273.15);
    const hEconOut = econOutWater.enthalpy; // kJ/kg

    // 5. Evaporator Gas Outlet Temperature (Pinch Point Constraint)
    // Gas leaving evaporator bank cannot be cooler than Tsat + Pinch Point
    const tGasEvapOutC = tSatC + pinchPointC;

    if (gasTempInC <= tGasEvapOutC + 10) {
        throw new Error(
            `Flue gas inlet temperature (${gasTempInC.toFixed(1)}°C) is too low for the required steam pressure (${steamPressBar.toFixed(1)} bar, Tsat = ${tSatC.toFixed(1)}°C). Minimum inlet gas temp is ${(tGasEvapOutC + 10).toFixed(1)}°C.`
        );
    }

    // 6. Energy Balance across Superheater + Evaporator
    // Heat available in gas from inlet down to evaporator pinch point
    const etaCasing = 1 - casingHeatLossFrac;
    const qShEvapKw = gasFlowKgS * cpGas * (gasTempInC - tGasEvapOutC) * etaCasing;

    // Heat absorbed per kg of steam in (SH + Evap):
    // From economizer outlet water at hEconOut to final steam at finalSteamEnthalpy
    // Plus blowdown portion heated from hEconOut to hfDrum
    const deltaHShEvap = (finalSteamEnthalpy - hEconOut) + blowdownFrac * (hfDrum - hEconOut);

    // Steam generation mass flow (kg/s)
    const mSteamKgS = Math.max(0, qShEvapKw / deltaHShEvap);
    const mSteamTh = mSteamKgS * 3.6; // t/h
    const mSteamLbH = mSteamTh * 2204.62; // lb/h

    // 7. Feedwater Flow Rate
    // Feedwater = Steam flow + Blowdown flow
    const mFwKgS = mSteamKgS * (1 + blowdownFrac);
    const mFwTh = mFwKgS * 3.6;
    const mBlowdownTh = mSteamTh * blowdownFrac;

    // 8. Economizer Heat Duty & Flue Gas Stack Exit Temperature
    // Heat absorbed in economizer
    const qEconKw = mFwKgS * (hEconOut - hFw);

    // Temperature drop of gas across economizer
    const deltaTGasEcon = qEconKw / (gasFlowKgS * cpGas * etaCasing);
    const tStackGasC = tGasEvapOutC - deltaTGasEcon;

    // 9. Component Duties Breakdown (kW and MWth)
    // Superheater duty:
    const qShKw = isSuperheated && steamTempC > tSatC
        ? mSteamKgS * (finalSteamEnthalpy - hgDrum)
        : 0;

    // Evaporator duty:
    const qEvapKw = mSteamKgS * (hgDrum - hEconOut) + (mSteamKgS * blowdownFrac) * (hfDrum - hEconOut);

    // Total thermal heat recovered:
    const qTotalKw = qShKw + qEvapKw + qEconKw;
    const thermalPowerMw = qTotalKw / 1000;
    const thermalPowerMmbtuH = thermalPowerMw * 3.412142;

    // Gas temperature before evaporator (after superheater)
    const tGasAfterShC = isSuperheated && qShKw > 0
        ? gasTempInC - (qShKw / (gasFlowKgS * cpGas * etaCasing))
        : gasTempInC;

    // 10. Thermal Heat Recovery Efficiency
    // Max theoretical heat recovery down to ambient (25°C)
    const qMaxAvailableKw = gasFlowKgS * cpGas * (gasTempInC - 25);
    const whrbEfficiencyPct = qMaxAvailableKw > 0 ? (qTotalKw / qMaxAvailableKw) * 100 : 0;

    // Evaporation Ratio: steam generated per kg of hot gas
    const evapRatio = gasFlowTh > 0 ? mSteamTh / gasFlowTh : 0;

    return {
        // Steam Generation KPIs
        steamFlowTh: mSteamTh,
        steamFlowKgS: mSteamKgS,
        steamFlowLbH: mSteamLbH,
        feedwaterFlowTh: mFwTh,
        blowdownFlowTh: mBlowdownTh,

        // Thermal Energy Outputs
        thermalPowerMw,
        thermalPowerMmbtuH,
        totalHeatRecoveredKw: qTotalKw,
        shDutyKw: qShKw,
        evapDutyKw: qEvapKw,
        econDutyKw: qEconKw,
        whrbEfficiencyPct,
        evapRatio,

        // Temperatures (°C)
        gasTempInC,
        gasTempAfterShC: tGasAfterShC,
        gasTempEvapOutC: tGasEvapOutC,
        gasTempStackC: tStackGasC,
        tSatC,
        steamTempC: finalSteamTempC,
        econOutTempC: tEconOutC,
        feedwaterTempC: fwTempC,

        // Differentials & Constraints
        actualPinchPointC: tGasEvapOutC - tSatC,
        actualApproachPointC: tSatC - tEconOutC,
        superheatDeltaC: finalSteamTempC - tSatC,

        // Steam & Water Properties (IAPWS-IF97)
        steamPressureBar: steamPressBar,
        steamPressurePsi: steamPressBar * 14.50377,
        steamEnthalpyKjKg: finalSteamEnthalpy,
        feedwaterEnthalpyKjKg: hFw,
        netEnthalpyRiseKjKg: finalSteamEnthalpy - hFw,
        steamEntropyKjKgK: finalSteamEntropy,
        steamSpecificVolumeM3Kg: finalSteamSpecVol
    };
}
