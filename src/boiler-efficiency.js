import { solvePT } from "iapws-if97";
import { convertToBase, convertFromBase, UNIT_TYPES } from "./units.js";

/**
 * Standard fuel ultimate analysis presets.
 * Values are on as-received basis (percentage by weight).
 */
export const FUEL_PRESETS = {
    "us-bituminous": {
        name: "🇺🇸 US Bituminous Coal",
        C: 68.0,
        H2: 4.8,
        O2: 6.5,
        N2: 1.3,
        S: 1.2,
        M: 6.2,
        Ash: 12.0,
        gcvKcal: 6500,
        gcvKj: 27214,
        gcvBtu: 11700,
        defaultO2: 4.5,
        defaultTg: 150,
        defaultL6: 1.5,
        defaultL7: 1.0
    },
    "in-coal": {
        name: "🇮🇳 Indian Sub-Bituminous Coal (High Ash)",
        C: 41.65,
        H2: 2.04,
        O2: 7.84,
        N2: 1.05,
        S: 0.57,
        M: 11.0,
        Ash: 35.85,
        gcvKcal: 3500,
        gcvKj: 14654,
        gcvBtu: 6300,
        defaultO2: 6.5,
        defaultTg: 160,
        defaultL6: 2.0,
        defaultL7: 1.5
    },
    "natural-gas": {
        name: "🔥 Natural Gas (Methane Rich)",
        C: 74.0,
        H2: 24.5,
        O2: 0.5,
        N2: 1.0,
        S: 0.0,
        M: 0.0,
        Ash: 0.0,
        gcvKcal: 9500,
        gcvKj: 39775,
        gcvBtu: 17100,
        defaultO2: 3.0,
        defaultTg: 125,
        defaultL6: 1.0,
        defaultL7: 0.0
    },
    "fuel-oil": {
        name: "🛢️ Heavy Fuel Oil / Furnace Oil (FO)",
        C: 84.5,
        H2: 11.5,
        O2: 1.0,
        N2: 0.5,
        S: 2.5,
        M: 0.0,
        Ash: 0.0,
        gcvKcal: 10200,
        gcvKj: 42705,
        gcvBtu: 18360,
        defaultO2: 3.5,
        defaultTg: 165,
        defaultL6: 1.0,
        defaultL7: 0.0
    },
    "biomass-wood": {
        name: "🪵 Biomass / Wood Pellets",
        C: 48.0,
        H2: 6.0,
        O2: 43.0,
        N2: 0.5,
        S: 0.05,
        M: 10.0,
        Ash: 1.5,
        gcvKcal: 4200,
        gcvKj: 17585,
        gcvBtu: 7560,
        defaultO2: 6.0,
        defaultTg: 170,
        defaultL6: 2.0,
        defaultL7: 0.5
    },
    "bagasse": {
        name: "🌾 Sugar Mill Bagasse (50% Moisture)",
        C: 22.5,
        H2: 2.8,
        O2: 21.5,
        N2: 0.2,
        S: 0.0,
        M: 50.0,
        Ash: 3.0,
        gcvKcal: 2250,
        gcvKj: 9420,
        gcvBtu: 4050,
        defaultO2: 7.0,
        defaultTg: 180,
        defaultL6: 2.5,
        defaultL7: 0.5
    }
};

/**
 * Calculates Boiler Efficiency using the Indirect (Heat Loss) Method (ASME PTC 4 / IS 8753 / BS 845).
 * 
 * @param {Object} params
 * @param {number} params.C - Carbon (% wt)
 * @param {number} params.H2 - Hydrogen (% wt)
 * @param {number} params.O2 - Oxygen in fuel (% wt)
 * @param {number} params.N2 - Nitrogen in fuel (% wt)
 * @param {number} params.S - Sulfur (% wt)
 * @param {number} params.M - Moisture in fuel (% wt)
 * @param {number} params.Ash - Ash content (% wt)
 * @param {number} params.gcvKcalKg - Gross Calorific Value (kcal/kg)
 * @param {number} params.Tg - Flue gas exit temperature (°C)
 * @param {number} params.Ta - Combustion air intake temperature (°C)
 * @param {number} params.O2_flue - Exhaust gas O2 (% by volume)
 * @param {number} params.CO_ppm - Exhaust gas Carbon Monoxide (ppm)
 * @param {number} params.humidity - Humidity in combustion air (kg moisture / kg dry air, default 0.018)
 * @param {number} params.L6_radiation - Radiation & convection loss (% default 1.5)
 * @param {number} params.L7_unburnt - Unburnt in ash loss (% default 0.5 - 1.5)
 * @returns {Object} Comprehensive calculation results
 */
export function calculateIndirectMethod({
    C,
    H2,
    O2,
    N2,
    S,
    M,
    Ash,
    gcvKcalKg,
    Tg,
    Ta,
    O2_flue,
    CO_ppm = 50,
    humidity = 0.018,
    L6_radiation = 1.5,
    L7_unburnt = 0.5
}) {
    if (!gcvKcalKg || gcvKcalKg <= 0) {
        throw new Error("Fuel Gross Calorific Value (GCV) must be greater than zero.");
    }
    if (O2_flue >= 21 || O2_flue < 0) {
        throw new Error("Flue gas O2 must be between 0% and 20.9%.");
    }
    if (Tg <= Ta) {
        throw new Error("Flue gas exit temperature must be greater than ambient air temperature.");
    }

    const deltaT = Tg - Ta;

    // 1. Theoretical Air required (kg air / kg fuel)
    // Formula: [11.6 * C + 34.8 * (H2 - O2 / 8) + 4.35 * S] / 100
    const netH2 = Math.max(0, H2 - (O2 / 8));
    const TA = (11.6 * C + 34.8 * netH2 + 4.35 * S) / 100;

    // 2. Excess Air (%) from flue gas O2
    // EA = [O2 / (21 - O2)] * 100
    const EA = (O2_flue / (21 - O2_flue)) * 100;

    // 3. Actual Air Supplied (kg air / kg fuel)
    const AAS = TA * (1 + (EA / 100));

    // 4. Mass of Dry Flue Gas (m_dfg in kg / kg fuel)
    // Products of combustion: CO2 + SO2 + N2 (from fuel + air) + excess O2
    const m_CO2 = (C * 44 / 12) / 100;
    const m_SO2 = (S * 64 / 32) / 100;
    const m_N2 = (N2 / 100) + (AAS * 0.77);
    const m_O2_excess = (AAS - TA) * 0.23;
    const m_dfg = m_CO2 + m_SO2 + m_N2 + m_O2_excess;

    // 5. L1: Loss due to dry flue gas (%)
    // Cp of dry flue gas = 0.24 kcal/kg·°C
    const Cp_dfg = 0.24;
    const L1 = (m_dfg * Cp_dfg * deltaT / gcvKcalKg) * 100;

    // 6. L2: Loss due to hydrogen in fuel (%)
    // Latent heat of water vapor = 584 kcal/kg, Cp of steam = 0.45 kcal/kg·°C
    const L2 = (9 * (H2 / 100) * (584 + 0.45 * deltaT) / gcvKcalKg) * 100;

    // 7. L3: Loss due to moisture in fuel (%)
    const L3 = ((M / 100) * (584 + 0.45 * deltaT) / gcvKcalKg) * 100;

    // 8. L4: Loss due to moisture in combustion air (%)
    const L4 = (AAS * humidity * 0.45 * deltaT / gcvKcalKg) * 100;

    // 9. L5: Loss due to incomplete combustion (CO formation) (%)
    // CO_ppm to percentage
    const CO_pct = CO_ppm / 10000;
    // Estimated theoretical CO2 in flue gas based on carbon & air
    const CO2_pct = m_dfg > 0 ? (m_CO2 / m_dfg) * (28.97 / 44.01) * 100 : 12.0;
    const L5 = (CO_pct + CO2_pct) > 0 ? ((CO_pct * C) / (CO_pct + CO2_pct)) * (5714 / gcvKcalKg) : 0;

    // 10. L6: Radiation and convection loss
    const L6 = Math.max(0, L6_radiation);

    // 11. L7: Unburnt combustibles in ash
    const L7 = Math.max(0, L7_unburnt);

    // Total Thermal Losses
    const totalLosses = L1 + L2 + L3 + L4 + L5 + L6 + L7;
    const efficiency = Math.max(0, Math.min(100, 100 - totalLosses));

    return {
        efficiency: Number(efficiency.toFixed(2)),
        totalLosses: Number(totalLosses.toFixed(2)),
        theoreticalAir: Number(TA.toFixed(3)),
        excessAir: Number(EA.toFixed(1)),
        actualAir: Number(AAS.toFixed(3)),
        dryFlueGasMass: Number(m_dfg.toFixed(3)),
        L1_dryFlueGas: Number(L1.toFixed(3)),
        L2_hydrogen: Number(L2.toFixed(3)),
        L3_fuelMoisture: Number(L3.toFixed(3)),
        L4_airMoisture: Number(L4.toFixed(3)),
        L5_incompleteCO: Number(L5.toFixed(3)),
        L6_radiation: Number(L6.toFixed(2)),
        L7_unburntAsh: Number(L7.toFixed(2))
    };
}

/**
 * Calculates Boiler Efficiency using the Direct (Input-Output) Method with exact IAPWS-IF97 steam enthalpy.
 * 
 * @param {Object} params
 * @param {number} params.steamFlowKgH - Steam generation rate (kg/h)
 * @param {number} params.fuelFlowKgH - Fuel consumption rate (kg/h)
 * @param {number} params.steamPressureMpa - Steam pressure (MPa abs)
 * @param {number} params.steamTempK - Steam temperature (K)
 * @param {number} params.fwTempK - Feedwater temperature (K)
 * @param {number} params.fuelGcvKjKg - Fuel Gross Calorific Value (kJ/kg)
 * @returns {Object} Comprehensive calculation results
 */
export function calculateDirectMethod({
    steamFlowKgH,
    fuelFlowKgH,
    steamPressureMpa,
    steamTempK,
    fwTempK,
    fuelGcvKjKg
}) {
    if (steamFlowKgH <= 0 || fuelFlowKgH <= 0 || fuelGcvKjKg <= 0) {
        throw new Error("Steam flow, fuel firing rate, and fuel GCV must be positive values.");
    }

    // 1. Calculate Steam Enthalpy (h_s) via IAPWS-IF97
    const steamState = solvePT(steamPressureMpa, steamTempK);
    const h_s = steamState.enthalpy; // kJ/kg

    // 2. Calculate Feedwater Enthalpy (h_w) via IAPWS-IF97 (subcooled water at boiler pressure)
    const fwState = solvePT(steamPressureMpa, fwTempK);
    const h_w = fwState.enthalpy; // kJ/kg

    // 3. Heat output in steam (GJ/h)
    const netHeatKjKg = h_s - h_w;
    const heatOutputKjH = steamFlowKgH * netHeatKjKg;
    const heatOutputGjH = heatOutputKjH / 1e6;

    // 4. Heat input in fuel (GJ/h)
    const heatInputKjH = fuelFlowKgH * fuelGcvKjKg;
    const heatInputGjH = heatInputKjH / 1e6;

    // 5. Direct Boiler Efficiency (%)
    const efficiency = (heatOutputKjH / heatInputKjH) * 100;

    // 6. Evaporation Ratio (kg steam per kg fuel)
    const evapRatio = steamFlowKgH / fuelFlowKgH;

    // 7. Factor of Evaporation (FE)
    // Standard latent heat of steam at 100°C = 2257 kJ/kg
    const factorOfEvaporation = netHeatKjKg / 2257;

    // 8. Equivalent Evaporation from and at 100°C (kg/h)
    const equivEvaporationKgH = steamFlowKgH * factorOfEvaporation;

    return {
        efficiency: Number(efficiency.toFixed(2)),
        steamEnthalpy: Number(h_s.toFixed(2)),
        fwEnthalpy: Number(h_w.toFixed(2)),
        netHeatKjKg: Number(netHeatKjKg.toFixed(2)),
        heatOutputGjH: Number(heatOutputGjH.toFixed(3)),
        heatInputGjH: Number(heatInputGjH.toFixed(3)),
        evaporationRatio: Number(evapRatio.toFixed(2)),
        factorOfEvaporation: Number(factorOfEvaporation.toFixed(3)),
        equivEvaporationKgH: Number(equivEvaporationKgH.toFixed(1)),
        steamRegion: steamState.region
    };
}
