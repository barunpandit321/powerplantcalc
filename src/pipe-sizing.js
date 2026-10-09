import { solvePT, solvePx } from "iapws-if97";
import { convertToBase, UNIT_TYPES } from "./units.js";

/**
 * Standard ASME B36.10M Carbon & Alloy Steel Pipe Dimensions.
 * NPS: Nominal Pipe Size (inches)
 * DN: Diameter Nominal (mm)
 * OD: Outside Diameter (mm)
 * ID_Sch40: Inside Diameter Schedule 40 (mm)
 * ID_Sch80: Inside Diameter Schedule 80 (mm)
 * ID_Sch160: Inside Diameter Schedule 160 (mm)
 */
export const STANDARD_PIPES = [
    { nps: "1/2\"", dn: 15, od: 21.3, idSch40: 15.8, idSch80: 13.9, idSch160: 11.8 },
    { nps: "3/4\"", dn: 20, od: 26.7, idSch40: 20.9, idSch80: 18.8, idSch160: 15.6 },
    { nps: "1\"", dn: 25, od: 33.4, idSch40: 26.6, idSch80: 24.3, idSch160: 20.7 },
    { nps: "1-1/4\"", dn: 32, od: 42.2, idSch40: 35.1, idSch80: 32.5, idSch160: 29.5 },
    { nps: "1-1/2\"", dn: 40, od: 48.3, idSch40: 40.9, idSch80: 38.1, idSch160: 34.0 },
    { nps: "2\"", dn: 50, od: 60.3, idSch40: 52.5, idSch80: 49.3, idSch160: 42.9 },
    { nps: "2-1/2\"", dn: 65, od: 73.0, idSch40: 62.7, idSch80: 59.0, idSch160: 53.9 },
    { nps: "3\"", dn: 80, od: 88.9, idSch40: 77.9, idSch80: 73.7, idSch160: 66.6 },
    { nps: "4\"", dn: 100, od: 114.3, idSch40: 102.3, idSch80: 97.2, idSch160: 87.3 },
    { nps: "5\"", dn: 125, od: 141.3, idSch40: 128.2, idSch80: 122.3, idSch160: 109.5 },
    { nps: "6\"", dn: 150, od: 168.3, idSch40: 154.1, idSch80: 146.3, idSch160: 131.8 },
    { nps: "8\"", dn: 200, od: 219.1, idSch40: 202.7, idSch80: 193.7, idSch160: 173.1 },
    { nps: "10\"", dn: 250, od: 273.0, idSch40: 254.5, idSch80: 242.9, idSch160: 215.8 },
    { nps: "12\"", dn: 300, od: 323.8, idSch40: 304.8, idSch80: 288.9, idSch160: 257.2 },
    { nps: "14\"", dn: 350, od: 355.6, idSch40: 333.3, idSch80: 317.5, idSch160: 284.2 },
    { nps: "16\"", dn: 400, od: 406.4, idSch40: 381.0, idSch80: 363.5, idSch160: 325.4 },
    { nps: "18\"", dn: 450, od: 457.0, idSch40: 428.7, idSch80: 409.6, idSch160: 366.8 },
    { nps: "20\"", dn: 500, od: 508.0, idSch40: 477.8, idSch80: 455.6, idSch160: 408.0 },
    { nps: "24\"", dn: 600, od: 610.0, idSch40: 574.0, idSch80: 547.6, idSch160: 490.6 }
];

/**
 * Evaluates thermodynamic state of steam using IAPWS-IF97.
 */
export function getSteamProperties(pMpa, isSaturated, tempK = null) {
    if (isSaturated) {
        // 100% dry saturated vapor
        return solvePx(pMpa, 1.0);
    } else {
        return solvePT(pMpa, tempK);
    }
}

/**
 * Sizes a steam pipe from mass flow and target velocity.
 * 
 * @param {Object} params
 * @param {number} params.flowKgH - Steam flow rate (kg/h)
 * @param {number} params.pMpa - Operating steam pressure (MPa abs)
 * @param {boolean} params.isSaturated - True if saturated steam
 * @param {number} params.tempK - Steam temperature if superheated (K)
 * @param {number} params.targetVelMs - Target steam velocity (m/s)
 * @param {string} params.schedule - Preferred schedule ('Sch40', 'Sch80', 'Sch160')
 * @param {number} params.pipeLengthM - Pipe length in meters for pressure drop calculation (default 100)
 * @returns {Object} Sizing results
 */
export function sizePipeByVelocity({
    flowKgH,
    pMpa,
    isSaturated,
    tempK,
    targetVelMs,
    schedule = "Sch40",
    pipeLengthM = 100
}) {
    if (flowKgH <= 0 || targetVelMs <= 0 || pMpa <= 0) {
        throw new Error("Flow rate, pressure, and target velocity must be positive values.");
    }

    const state = getSteamProperties(pMpa, isSaturated, tempK);
    const v = state.specificVolume; // m3/kg
    const rho = state.density; // kg/m3
    const mu = state.viscosity || 1.48e-5; // Pa.s

    // Volumetric flow rate
    const volFlowM3S = (flowKgH / 3600) * v;
    const volFlowM3H = flowKgH * v;

    // Minimum required cross-sectional area (m2)
    const areaReqM2 = volFlowM3S / targetVelMs;

    // Minimum theoretical inside diameter (mm)
    const minIdM = Math.sqrt((4 * areaReqM2) / Math.PI);
    const minIdMm = minIdM * 1000;
    const minIdInch = minIdMm / 25.4;

    // Select schedule property
    const idProp = schedule === "Sch80" ? "idSch80" : (schedule === "Sch160" ? "idSch160" : "idSch40");

    // Find closest standard pipes:
    // 1. One standard pipe closest without exceeding target velocity too much
    // 2. The next larger size
    let recommendedPipe = null;
    let nextLargerPipe = null;

    for (let i = 0; i < STANDARD_PIPES.length; i++) {
        const pipe = STANDARD_PIPES[i];
        const pipeId = pipe[idProp];
        if (pipeId >= minIdMm * 0.95) { // allow 5% tolerance for closer standard size
            recommendedPipe = pipe;
            if (i + 1 < STANDARD_PIPES.length) {
                nextLargerPipe = STANDARD_PIPES[i + 1];
            }
            break;
        }
    }

    if (!recommendedPipe) {
        // Exceeds 24" pipe table
        recommendedPipe = STANDARD_PIPES[STANDARD_PIPES.length - 1];
    }

    // Evaluate hydraulic performance for recommended pipe
    const recPerf = evaluatePipeHydraulics(recommendedPipe[idProp], volFlowM3S, rho, mu, pipeLengthM);

    // Evaluate for next larger pipe if available
    const nextPerf = nextLargerPipe
        ? evaluatePipeHydraulics(nextLargerPipe[idProp], volFlowM3S, rho, mu, pipeLengthM)
        : null;

    // Saturation temperature & superheat
    let satTempC = (state.temperature - 273.15);
    if (!isSaturated) {
        try {
            const satState = solvePx(pMpa, 1.0);
            satTempC = satState.temperature - 273.15;
        } catch {
            satTempC = state.temperature - 273.15;
        }
    }
    const currentTempC = state.temperature - 273.15;
    const superheatC = isSaturated ? 0 : Math.max(0, currentTempC - satTempC);
    const volFlowAcfm = volFlowM3H * 0.588578;

    // Full standard pipe comparison table
    const comparisonTable = STANDARD_PIPES.map(p => {
        const pId = p[idProp];
        const perf = evaluatePipeHydraulics(pId, volFlowM3S, rho, mu, pipeLengthM);
        return {
            nps: p.nps,
            dn: p.dn,
            idMm: pId,
            velocityMs: perf.velocityMs,
            velocityFtMin: perf.velocityFtMin,
            dpBarPer100m: perf.dpBarPer100m,
            dpPsiPer100ft: perf.dpPsiPer100ft,
            status: getVelocityStatus(perf.velocityMs, isSaturated),
            isRecommended: recommendedPipe.dn === p.dn
        };
    });

    return {
        specificVolume: Number(v.toFixed(5)),
        density: Number(rho.toFixed(3)),
        temperatureC: Number(currentTempC.toFixed(1)),
        satTemperatureC: Number(satTempC.toFixed(1)),
        superheatC: Number(superheatC.toFixed(1)),
        volFlowM3H: Number(volFlowM3H.toFixed(1)),
        volFlowM3S: Number(volFlowM3S.toFixed(4)),
        volFlowAcfm: Number(volFlowAcfm.toFixed(1)),
        minIdMm: Number(minIdMm.toFixed(1)),
        minIdInch: Number(minIdInch.toFixed(2)),
        recommendedPipe: {
            nps: recommendedPipe.nps,
            dn: recommendedPipe.dn,
            idMm: recommendedPipe[idProp],
            schedule,
            velocityMs: recPerf.velocityMs,
            velocityFtMin: recPerf.velocityFtMin,
            reynoldsNumber: recPerf.reynoldsNumber,
            frictionFactor: recPerf.frictionFactor,
            dpBarPer100m: recPerf.dpBarPer100m,
            dpPsiPer100ft: recPerf.dpPsiPer100ft,
            dpTotalBar: recPerf.dpTotalBar,
            status: getVelocityStatus(recPerf.velocityMs, isSaturated)
        },
        nextLargerPipe: nextLargerPipe ? {
            nps: nextLargerPipe.nps,
            dn: nextLargerPipe.dn,
            idMm: nextLargerPipe[idProp],
            schedule,
            velocityMs: nextPerf.velocityMs,
            velocityFtMin: nextPerf.velocityFtMin,
            dpBarPer100m: nextPerf.dpBarPer100m,
            dpPsiPer100ft: nextPerf.dpPsiPer100ft,
            dpTotalBar: nextPerf.dpTotalBar,
            status: getVelocityStatus(nextPerf.velocityMs, isSaturated)
        } : null,
        comparisonTable
    };
}

/**
 * Calculates velocity, Reynolds number, friction factor, and pressure drop for an explicit pipe ID.
 */
export function evaluatePipeHydraulics(idMm, volFlowM3S, rho, mu, lengthM = 100) {
    const idM = idMm / 1000;
    const areaM2 = (Math.PI / 4) * Math.pow(idM, 2);
    const velMs = volFlowM3S / areaM2;
    const velFtMin = velMs * 196.85;

    // Reynolds Number Re = (rho * V * D) / mu
    const Re = (rho * velMs * idM) / mu;

    // Darcy friction factor via Haaland equation (commercial steel roughness = 0.045 mm)
    const relRough = 0.000045 / idM;
    let f = 0.02;
    if (Re > 4000) {
        f = Math.pow(-1.8 * Math.log10(Math.pow(relRough / 3.7, 1.11) + (6.9 / Re)), -2);
    } else if (Re > 0) {
        f = 64 / Math.max(1, Re); // laminar flow
    }

    // Darcy-Weisbach pressure drop: deltaP = f * (L/D) * (rho * V^2 / 2) [Pa]
    const dpPaPer100m = f * (100 / idM) * (rho * Math.pow(velMs, 2) / 2);
    const dpBarPer100m = dpPaPer100m / 1e5;
    const dpPsiPer100ft = dpBarPer100m * 4.421; // 1 bar/100m = ~4.421 psi/100ft

    const dpTotalBar = (dpBarPer100m * lengthM) / 100;

    return {
        velocityMs: Number(velMs.toFixed(2)),
        velocityFtMin: Number(velFtMin.toFixed(0)),
        reynoldsNumber: Math.round(Re),
        frictionFactor: Number(f.toFixed(4)),
        dpBarPer100m: Number(dpBarPer100m.toFixed(3)),
        dpPsiPer100ft: Number(dpPsiPer100ft.toFixed(2)),
        dpTotalBar: Number(dpTotalBar.toFixed(3))
    };
}

function getVelocityStatus(velMs, isSaturated) {
    const upperLimit = isSaturated ? 30 : 45;
    const optimalHigh = isSaturated ? 25 : 35;
    const optimalLow = 15;

    if (velMs < optimalLow) {
        return { code: "low", text: "Low Velocity (Oversized pipe, higher capital cost & heat loss)", color: "#3b82f6" };
    } else if (velMs <= optimalHigh) {
        return { code: "optimal", text: "Optimal Recommended Velocity (Spirax Sarco & ASME Standard)", color: "#10b981" };
    } else if (velMs <= upperLimit) {
        return { code: "high", text: "High Velocity (Acceptable for short runs, monitor noise)", color: "#f59e0b" };
    } else {
        return { code: "excessive", text: "Excessive Velocity (Risk of erosion, noise & high pressure drop)", color: "#ef4444" };
    }
}
