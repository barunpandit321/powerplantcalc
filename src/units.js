/**
 * Unit conversion dictionary and helper methods for IAPWS-IF97 calculations.
 * 
 * Standard Atmospheric Pressure (P_atm):
 * = 0.101325 MPa
 * = 1.01325 bar
 * = 1.033227 kg/cm²
 * = 14.69595 psi
 * = 101.325 kPa
 * = 760 mmHg
 * = 29.92126 inHg
 * = 10332.27 mmWC
 */

export const P_ATM_MPA = 0.101325; // 1 atm in MPa
export const MMHG_TO_MPA = 0.000133322368;
export const INHG_TO_MPA = 0.00338638815789;
export const MMWC_TO_MPA = 0.00000980665;

export const UNIT_TYPES = {
    PRESSURE: "pressure",
    TEMPERATURE: "temperature",
    ENTHALPY: "enthalpy",
    ENTROPY: "entropy",
    QUALITY: "quality",
    VOLUME: "volume",
    DENSITY: "density",
    SPEED: "speed",
    VISCOSITY: "viscosity",
    CONDUCTIVITY: "conductivity"
};

export const UNITS = {
    [UNIT_TYPES.PRESSURE]: [
        // Pressure Units
        { id: "kg_cm2_g", label: "kg/cm² (gauge)", toBase: v => (v + 1.033227) * 0.0980665, fromBase: v => (v / 0.0980665) - 1.033227 },
        { id: "kg_cm2_a", label: "kg/cm² (abs)", toBase: v => v * 0.0980665, fromBase: v => v / 0.0980665 },
        { id: "bar_g", label: "bar (gauge)", toBase: v => (v + 1.01325) * 0.1, fromBase: v => (v * 10) - 1.01325 },
        { id: "bar_a", label: "bar (abs)", toBase: v => v * 0.1, fromBase: v => v * 10 },
        { id: "psi_g", label: "psi (gauge)", toBase: v => (v + 14.69595) * 0.00689475729, fromBase: v => (v / 0.00689475729) - 14.69595 },
        { id: "psi_a", label: "psi (abs)", toBase: v => v * 0.00689475729, fromBase: v => v / 0.00689475729 },
        { id: "inHg_g", label: "inHg (gauge)", toBase: v => (v + 29.92126) * INHG_TO_MPA, fromBase: v => (v / INHG_TO_MPA) - 29.92126 },
        { id: "inHg_a", label: "inHg (abs)", toBase: v => v * INHG_TO_MPA, fromBase: v => v / INHG_TO_MPA },
        { id: "mmHg_g", label: "mmHg (gauge)", toBase: v => (v + 760) * MMHG_TO_MPA, fromBase: v => (v / MMHG_TO_MPA) - 760 },
        { id: "mmHg_a", label: "mmHg (abs)", toBase: v => v * MMHG_TO_MPA, fromBase: v => v / MMHG_TO_MPA },
        { id: "mmWC_g", label: "mmWC (gauge)", toBase: v => (v + 10332.27) * MMWC_TO_MPA, fromBase: v => (v / MMWC_TO_MPA) - 10332.27 },
        { id: "MPa_g", label: "MPa (gauge)", toBase: v => v + P_ATM_MPA, fromBase: v => v - P_ATM_MPA },
        { id: "MPa_a", label: "MPa (abs)", toBase: v => v, fromBase: v => v },
        { id: "kPa_g", label: "kPa (gauge)", toBase: v => (v + 101.325) * 0.001, fromBase: v => (v * 1000) - 101.325 },
        { id: "kPa_a", label: "kPa (abs)", toBase: v => v * 0.001, fromBase: v => v * 1000 },
        { id: "atm_a", label: "atm (abs)", toBase: v => v * 0.101325, fromBase: v => v / 0.101325 }
    ],

    [UNIT_TYPES.TEMPERATURE]: [
        { id: "C", label: "°C", toBase: v => v + 273.15, fromBase: v => v - 273.15 },
        { id: "F", label: "°F", toBase: v => (v - 32) * (5 / 9) + 273.15, fromBase: v => (v - 273.15) * (9 / 5) + 32 },
        { id: "K", label: "K", toBase: v => v, fromBase: v => v },
        { id: "R", label: "°R", toBase: v => v * (5 / 9), fromBase: v => v * (9 / 5) }
    ],

    [UNIT_TYPES.ENTHALPY]: [
        { id: "kcal_kg", label: "kcal/kg", toBase: v => v * 4.1868, fromBase: v => v / 4.1868 },
        { id: "kJ_kg", label: "kJ/kg", toBase: v => v, fromBase: v => v },
        { id: "MJ_kg", label: "MJ/kg", toBase: v => v * 1000, fromBase: v => v / 1000 },
        { id: "cal_g", label: "cal/g", toBase: v => v * 4.1868, fromBase: v => v / 4.1868 },
        { id: "Btu_lb", label: "Btu/lb", toBase: v => v * 2.326, fromBase: v => v / 2.326 }
    ],

    [UNIT_TYPES.ENTROPY]: [
        { id: "kJ_kgK", label: "kJ/(kg·K)", toBase: v => v, fromBase: v => v },
        { id: "kcal_kgC", label: "kcal/(kg·°C)", toBase: v => v * 4.1868, fromBase: v => v / 4.1868 },
        { id: "Btu_lbF", label: "Btu/(lb·°F)", toBase: v => v * 4.1868, fromBase: v => v / 4.1868 }
    ],

    [UNIT_TYPES.QUALITY]: [
        { id: "frac", label: "fraction (0-1)", toBase: v => v, fromBase: v => v },
        { id: "percent", label: "% (0-100)", toBase: v => v / 100, fromBase: v => v * 100 }
    ],

    [UNIT_TYPES.VOLUME]: [
        { id: "m3_kg", label: "m³/kg", toBase: v => v, fromBase: v => v },
        { id: "cm3_g", label: "cm³/g", toBase: v => v * 0.001, fromBase: v => v * 1000 },
        { id: "ft3_lb", label: "ft³/lb", toBase: v => v * 0.06242796, fromBase: v => v / 0.06242796 },
        { id: "L_kg", label: "L/kg", toBase: v => v * 0.001, fromBase: v => v * 1000 }
    ],

    [UNIT_TYPES.DENSITY]: [
        { id: "kg_m3", label: "kg/m³", toBase: v => v, fromBase: v => v },
        { id: "lb_ft3", label: "lb/ft³", toBase: v => v * 16.018463, fromBase: v => v / 16.018463 },
        { id: "g_cm3", label: "g/cm³", toBase: v => v * 1000, fromBase: v => v / 1000 }
    ],

    [UNIT_TYPES.SPEED]: [
        { id: "m_s", label: "m/s", toBase: v => v, fromBase: v => v },
        { id: "ft_s", label: "ft/s", toBase: v => v * 0.3048, fromBase: v => v / 0.3048 }
    ],

    [UNIT_TYPES.VISCOSITY]: [
        { id: "Pa_s", label: "Pa·s", toBase: v => v, fromBase: v => v },
        { id: "cP", label: "cP", toBase: v => v * 0.001, fromBase: v => v * 1000 },
        { id: "uPa_s", label: "μPa·s", toBase: v => v * 1e-6, fromBase: v => v * 1e6 }
    ],

    [UNIT_TYPES.CONDUCTIVITY]: [
        { id: "W_mK", label: "W/(m·K)", toBase: v => v, fromBase: v => v },
        { id: "mW_mK", label: "mW/(m·K)", toBase: v => v * 0.001, fromBase: v => v * 1000 },
        { id: "Btu_hftF", label: "Btu/(h·ft·°F)", toBase: v => v * 1.730735, fromBase: v => v / 1.730735 }
    ]
};

/**
 * Converts a value from a specified unit to its base SI unit.
 * @param {number} value 
 * @param {string} unitType 
 * @param {string} unitId 
 * @returns {number} Base value
 */
export function convertToBase(value, unitType, unitId) {
    const list = UNITS[unitType];
    if (!list) return value;
    const unit = list.find(u => u.id === unitId) || list[0];
    return unit.toBase(value);
}

/**
 * Converts a base SI value into a target unit.
 * @param {number} baseValue 
 * @param {string} unitType 
 * @param {string} unitId 
 * @returns {number} Converted value
 */
export function convertFromBase(baseValue, unitType, unitId) {
    const list = UNITS[unitType];
    if (!list) return baseValue;
    const unit = list.find(u => u.id === unitId) || list[0];
    return unit.fromBase(baseValue);
}
