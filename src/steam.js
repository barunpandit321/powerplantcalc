import {
    solvePT,
    solvePH,
    solvePS,
    solveHS,
    solveTH,
    solveTS,
    solvePx,
    solveTx
} from "iapws-if97";

/**
 * Calculates steam properties based on IAPWS-IF97 equations.
 * Expects inputs in IAPWS-IF97 base units:
 * - Pressure: MPa
 * - Temperature: K
 * - Enthalpy: kJ/kg
 * - Entropy: kJ/(kg·K)
 * - Quality: fraction (0-1)
 * 
 * @param {string} mode - Calculation mode ('PT', 'PH', 'PS', 'HS', 'TH', 'TS', 'PX', 'TX')
 * @param {number} baseVal1 - Primary input in base unit
 * @param {number} baseVal2 - Secondary input in base unit
 * @returns {import("iapws-if97").SteamState} Thermodynamic state object
 */
export function calculate(mode, baseVal1, baseVal2) {
    if (typeof baseVal1 !== "number" || isNaN(baseVal1) || typeof baseVal2 !== "number" || isNaN(baseVal2)) {
        throw new Error("Please enter valid numerical inputs.");
    }

    switch (mode) {
        case "PT":
            return solvePT(baseVal1, baseVal2);

        case "PH":
            return solvePH(baseVal1, baseVal2);

        case "PS":
            return solvePS(baseVal1, baseVal2);

        case "HS":
            return solveHS(baseVal1, baseVal2);

        case "TH":
            return solveTH(baseVal1, baseVal2);

        case "TS":
            return solveTS(baseVal1, baseVal2);

        case "PX":
            if (baseVal2 < 0 || baseVal2 > 1) {
                throw new Error("Vapor quality (x) must be between 0 and 1 (or 0% to 100%).");
            }
            return solvePx(baseVal1, baseVal2);

        case "TX":
            if (baseVal2 < 0 || baseVal2 > 1) {
                throw new Error("Vapor quality (x) must be between 0 and 1 (or 0% to 100%).");
            }
            return solveTx(baseVal1, baseVal2);

        default:
            throw new Error(`Unsupported calculation mode: '${mode}'`);
    }
}