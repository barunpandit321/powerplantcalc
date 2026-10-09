/**
 * Regional Zone Detection & Unit Prioritization Utility
 * Detects whether traffic is from US, Europe, India, or International,
 * and sets default units + reorders dropdown options accordingly.
 */

export function detectUserZone() {
    let timeZone = "";
    try {
        timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
    } catch (e) { }

    const lang = (navigator.language || "").toLowerCase();
    const languages = (navigator.languages || []).map(l => l.toLowerCase());

    // 1. India / South Asia Detection
    const isIndia = timeZone.includes("Kolkata") || timeZone.includes("Calcutta") ||
        timeZone.includes("Colombo") || timeZone.includes("Dhaka") ||
        lang.endsWith("-in") || lang.startsWith("hi") ||
        languages.some(l => l.endsWith("-in"));

    if (isIndia) return "IN";

    // 2. US / North America Detection (Imperial Units: psi, °F, Btu/lb, GPM, TR)
    const usKeyZones = [
        "New_York", "Chicago", "Denver", "Los_Angeles", "Phoenix", "Anchorage",
        "Honolulu", "Detroit", "Indianapolis", "Boise", "Toronto", "Vancouver",
        "Edmonton", "Winnipeg", "Montreal", "Halifax", "Calgary", "Regina"
    ];

    const latinZones = [
        "Sao_Paulo", "Buenos_Aires", "Santiago", "Bogota", "Lima", "Mexico_City",
        "Caracas", "Montevideo", "Asuncion", "La_Paz", "Guayaquil", "Panama"
    ];

    const isLatin = latinZones.some(lz => timeZone.includes(lz));

    const isUS = (!isLatin && usKeyZones.some(z => timeZone.includes(z))) ||
        timeZone.startsWith("US/") ||
        timeZone.startsWith("Canada/") ||
        (!isLatin && timeZone.startsWith("America/") && (
            timeZone.includes("Eastern") || timeZone.includes("Central") ||
            timeZone.includes("Mountain") || timeZone.includes("Pacific")
        )) ||
        lang === "en-us" || lang === "en-ca";

    if (isUS) return "US";

    // 3. Europe Detection (bar, °C, kJ/kg, m³/hr, MW)
    const isEurope = timeZone.startsWith("Europe/") ||
        timeZone === "WET" || timeZone === "CET" || timeZone === "EET" ||
        timeZone.startsWith("Atlantic/Reykjavik") ||
        [
            "en-gb", "de-", "fr-", "it-", "es-es", "nl-", "pl-", "sv-",
            "da-", "fi-", "el-", "pt-pt", "cs-", "ro-", "hu-", "sk-",
            "no-", "nb-", "nn-", "de", "fr", "it", "nl", "pl", "sv", "da", "fi"
        ].some(prefix => lang.startsWith(prefix) || languages.some(l => l.startsWith(prefix)));

    if (isEurope) return "EU";

    // 4. Default International Metric (Europe standard bar, °C, kJ/kg)
    return "EU";
}

/**
 * Returns regional defaults for Steam Calculator
 */
export function getSteamDefaultsForZone(zone) {
    if (zone === "US") {
        return {
            pressure: "psi_g",      // psi (gauge)
            temperature: "F",        // °F
            enthalpy: "Btu_lb",     // Btu/lb
            entropy: "Btu_lbF",     // Btu/(lb·°F)
            volume: "ft3_lb",       // ft³/lb
            density: "lb_ft3",      // lb/ft³
            speed: "ft_s",          // ft/s
            viscosity: "cP",        // cP
            conductivity: "Btu_hftF",
            quality: "frac",
            defaultP1: "400",
            defaultP2: "662"
        };
    }

    if (zone === "IN") {
        return {
            pressure: "kg_cm2_g",   // kg/cm² (gauge)
            temperature: "C",        // °C
            enthalpy: "kcal_kg",    // kcal/kg (IT)
            entropy: "kJ_kgK",
            volume: "m3_kg",
            density: "kg_m3",
            speed: "m_s",
            viscosity: "Pa_s",
            conductivity: "W_mK",
            quality: "frac",
            defaultP1: "70",
            defaultP2: "490"
        };
    }

    // Europe & General International
    return {
        pressure: "bar_g",      // bar (gauge)
        temperature: "C",        // °C
        enthalpy: "kJ_kg",      // kJ/kg
        entropy: "kJ_kgK",
        volume: "m3_kg",
        density: "kg_m3",
        speed: "m_s",
        viscosity: "Pa_s",
        conductivity: "W_mK",
        quality: "frac",
        defaultP1: "70",
        defaultP2: "490"
    };
}

/**
 * Returns regional defaults for Cooling Tower Calculator
 */
export function getCoolingDefaultsForZone(zone) {
    if (zone === "US") {
        return {
            temp: "F",
            flow: "gpm",            // GPM (US)
            flowOut: "gpm",
            heat: "tr",             // TR (Refrigeration Tons)
            rangeUnit: "F",
            approachUnit: "F",
            thot: "105",
            tcold: "85",
            twb: "78",
            flowVal: "10000",
            cocVal: "3.5"
        };
    }

    if (zone === "IN") {
        return {
            temp: "C",
            flow: "m3h",
            flowOut: "m3h",
            heat: "gcal",
            rangeUnit: "C",
            approachUnit: "C",
            thot: "40",
            tcold: "32",
            twb: "28",
            flowVal: "2500",
            cocVal: "3.5"
        };
    }

    // Europe & International
    return {
        temp: "C",
        flow: "m3h",
        flowOut: "m3h",
        heat: "mw",
        rangeUnit: "C",
        approachUnit: "C",
        thot: "40",
        tcold: "32",
        twb: "28",
        flowVal: "2500",
        cocVal: "3.5"
    };
}

/**
 * Reorders an array of units so that the zone's preferred units appear at the top.
 */
export function prioritizeUnits(unitsList, zone, unitType) {
    if (!Array.isArray(unitsList)) return unitsList;

    let priorityIds = [];

    if (zone === "US") {
        if (unitType === "pressure") priorityIds = ["psi_g", "psi_a", "inHg_g", "inHg_a", "bar_g", "bar_a"];
        else if (unitType === "temperature") priorityIds = ["F", "C", "R", "K"];
        else if (unitType === "enthalpy") priorityIds = ["Btu_lb", "kJ_kg", "kcal_kg"];
        else if (unitType === "entropy") priorityIds = ["Btu_lbF", "kJ_kgK", "kcal_kgC"];
        else if (unitType === "volume") priorityIds = ["ft3_lb", "m3_kg"];
        else if (unitType === "density") priorityIds = ["lb_ft3", "kg_m3"];
        else if (unitType === "speed") priorityIds = ["ft_s", "m_s"];
        else if (unitType === "flow") priorityIds = ["gpm", "m3h", "tph", "lph"];
        else if (unitType === "heat") priorityIds = ["tr", "btu", "mw", "gcal"];
    } else if (zone === "EU") {
        if (unitType === "pressure") priorityIds = ["bar_g", "bar_a", "MPa_g", "MPa_a", "kPa_g", "kPa_a", "psi_g"];
        else if (unitType === "temperature") priorityIds = ["C", "K", "F", "R"];
        else if (unitType === "enthalpy") priorityIds = ["kJ_kg", "MJ_kg", "kcal_kg", "Btu_lb"];
        else if (unitType === "entropy") priorityIds = ["kJ_kgK", "kcal_kgC", "Btu_lbF"];
        else if (unitType === "volume") priorityIds = ["m3_kg", "ft3_lb"];
        else if (unitType === "density") priorityIds = ["kg_m3", "lb_ft3"];
        else if (unitType === "speed") priorityIds = ["m_s", "ft_s"];
        else if (unitType === "flow") priorityIds = ["m3h", "lph", "tph", "gpm"];
        else if (unitType === "heat") priorityIds = ["mw", "gcal", "tr", "btu"];
    } else if (zone === "IN") {
        if (unitType === "pressure") priorityIds = ["kg_cm2_g", "kg_cm2_a", "bar_g", "bar_a", "mmWC_g", "MPa_g", "psi_g"];
        else if (unitType === "temperature") priorityIds = ["C", "F", "K", "R"];
        else if (unitType === "enthalpy") priorityIds = ["kcal_kg", "kJ_kg", "cal_g", "Btu_lb"];
        else if (unitType === "entropy") priorityIds = ["kJ_kgK", "kcal_kgC", "Btu_lbF"];
        else if (unitType === "flow") priorityIds = ["m3h", "tph", "gpm", "lph"];
        else if (unitType === "heat") priorityIds = ["mw", "gcal", "tr", "btu"];
    }

    if (priorityIds.length === 0) return unitsList;

    const prioritized = [];
    const remaining = [];

    // Push in priority order
    priorityIds.forEach(id => {
        const found = unitsList.find(u => (u.id || u.key) === id);
        if (found) prioritized.push(found);
    });

    // Append any unlisted
    unitsList.forEach(u => {
        const id = u.id || u.key;
        if (!priorityIds.includes(id) && !prioritized.includes(u)) {
            remaining.push(u);
        }
    });

    return [...prioritized, ...remaining];
}
