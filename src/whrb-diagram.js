/**
 * WHRB (Waste Heat Recovery Boiler) Live Interactive SVG Diagram Controller
 * Manages animated flows, live telemetry labels, and component callouts.
 */

export class WhrbDiagramManager {
    constructor(svgContainerId) {
        this.container = document.getElementById(svgContainerId);
        this.activeTagInfo = null;

        // Register interactive click handlers for component inspection
        if (this.container) {
            this.container.addEventListener("click", (e) => {
                const target = e.target.closest("[data-station]");
                if (target) {
                    this.handleStationClick(target.getAttribute("data-station"));
                }
            });
        }
    }

    /**
     * Updates all live digital gauges and labels on the diagram
     * @param {Object} data - Result from calculateWhrb
     * @param {string} unitSystem - "US" or "METRIC"
     */
    updateTelemetry(data, unitSystem = "METRIC") {
        if (!this.container || !data) return;
        const isUS = unitSystem === "US";

        // Unit conversion helpers
        const formatTemp = c => isUS ? `${(c * 1.8 + 32).toFixed(1)} °F` : `${c.toFixed(1)} °C`;
        const formatFlow = (th, lbh) => isUS ? `${(lbh / 1000).toFixed(1)} klb/h` : `${th.toFixed(2)} t/h`;
        const formatPress = (bar, psi) => isUS ? `${psi.toFixed(1)} psig` : `${bar.toFixed(1)} bar`;

        // 1. Gas Inlet Tag
        const tagGasIn = document.getElementById("diagTagGasIn");
        if (tagGasIn) {
            tagGasIn.innerHTML = `
                <div class="diag-tag-title">🔥 Flue Gas Inlet</div>
                <div class="diag-tag-val val-hot">${formatTemp(data.gasTempInC)}</div>
                <div class="diag-tag-sub">${formatFlow(data.gasFlowTh || (data.steamFlowTh / data.evapRatio), data.gasFlowTh * 2204.62)}</div>
            `;
        }

        // 2. Superheater / Main Steam Outlet Tag
        const tagSteam = document.getElementById("diagTagSteam");
        if (tagSteam) {
            tagSteam.innerHTML = `
                <div class="diag-tag-title">⚡ Superheated Steam</div>
                <div class="diag-tag-val val-steam">${formatFlow(data.steamFlowTh, data.steamFlowLbH)}</div>
                <div class="diag-tag-sub">${formatPress(data.steamPressureBar, data.steamPressurePsi)} • ${formatTemp(data.steamTempC)}</div>
            `;
        }

        // 3. Steam Drum Tag
        const tagDrum = document.getElementById("diagTagDrum");
        if (tagDrum) {
            tagDrum.innerHTML = `
                <div class="diag-tag-title">⚪ Steam Drum</div>
                <div class="diag-tag-val val-cyan">${formatPress(data.steamPressureBar, data.steamPressurePsi)}</div>
                <div class="diag-tag-sub">Tsat: ${formatTemp(data.tSatC)} • Level: 50%</div>
            `;
        }

        // 4. Evaporator & Pinch Point Tag
        const tagEvap = document.getElementById("diagTagEvap");
        if (tagEvap) {
            const pinchVal = isUS ? `${(data.actualPinchPointC * 1.8).toFixed(1)} °F` : `${data.actualPinchPointC.toFixed(1)} °C`;
            tagEvap.innerHTML = `
                <div class="diag-tag-title">♨️ Evaporator Bank</div>
                <div class="diag-tag-val val-amber">ΔT Pinch: ${pinchVal}</div>
                <div class="diag-tag-sub">Gas Out: ${formatTemp(data.gasTempEvapOutC)}</div>
            `;
        }

        // 5. Economizer Tag
        const tagEcon = document.getElementById("diagTagEcon");
        if (tagEcon) {
            const appVal = isUS ? `${(data.actualApproachPointC * 1.8).toFixed(1)} °F` : `${data.actualApproachPointC.toFixed(1)} °C`;
            tagEcon.innerHTML = `
                <div class="diag-tag-title">💧 Economizer</div>
                <div class="diag-tag-val val-blue">Out: ${formatTemp(data.econOutTempC)}</div>
                <div class="diag-tag-sub">Approach: ${appVal}</div>
            `;
        }

        // 6. Stack / Exhaust Gas Tag
        const tagStack = document.getElementById("diagTagStack");
        if (tagStack) {
            const pwrVal = isUS ? `${data.thermalPowerMmbtuH.toFixed(1)} MMBtu/h` : `${data.thermalPowerMw.toFixed(2)} MWth`;
            tagStack.innerHTML = `
                <div class="diag-tag-title">💨 Stack Exhaust</div>
                <div class="diag-tag-val val-cool">${formatTemp(data.gasTempStackC)}</div>
                <div class="diag-tag-sub">Recovered: ${pwrVal}</div>
            `;
        }

        // 7. Feedwater Pump Tag
        const tagBfp = document.getElementById("diagTagBfp");
        if (tagBfp) {
            tagBfp.innerHTML = `
                <div class="diag-tag-title">🌀 Feedwater Pump</div>
                <div class="diag-tag-val val-blue">${formatFlow(data.feedwaterFlowTh, data.feedwaterFlowTh * 2204.62)}</div>
                <div class="diag-tag-sub">Inlet: ${formatTemp(data.feedwaterTempC)}</div>
            `;
        }

        // Adjust Particle Animation Velocity based on steam flow
        const steamSpeed = Math.max(1, Math.min(5, (data.steamFlowTh / 20) * 2.5));
        const steamParticles = document.querySelectorAll(".steam-flow-particle");
        steamParticles.forEach(p => {
            p.style.animationDuration = `${(3.5 / steamSpeed).toFixed(2)}s`;
        });

        // Adjust Gas Flow Particle Velocity
        const gasSpeed = Math.max(1, Math.min(6, (data.gasFlowTh / 150) * 3));
        const gasParticles = document.querySelectorAll(".gas-flow-particle");
        gasParticles.forEach(p => {
            p.style.animationDuration = `${(4 / gasSpeed).toFixed(2)}s`;
        });
    }

    handleStationClick(stationId) {
        const infoBox = document.getElementById("stationInspectionBox");
        if (!infoBox) return;

        const STATION_DETAILS = {
            "gas-inlet": {
                title: "🔥 Waste Heat Flue Gas Inlet Duct",
                desc: "High-temperature exhaust gases from a gas turbine (450–550°C), cement rotary kiln (320–380°C), or metallurgical furnace enter the WHRB inlet duct. A diverter damper allows isolating the boiler or bypassing gases directly to an auxiliary stack during start-up."
            },
            "superheater": {
                title: "⚡ Superheater Tube Bundle",
                desc: "Located in the hottest gas section immediately downstream of the inlet duct. Saturated steam from the steam drum flows through high-alloy counterflow serpentine tubes and is heated well above saturation temperature to avoid moisture condensation in downstream steam turbines."
            },
            "steam-drum": {
                title: "⚪ Steam Drum & Separation Internals",
                desc: "The central pressure vessel where two-phase boiling water and steam are separated. Saturated liquid circulates down through large unheated downcomers to the lower headers, while boiling water/steam mixture rises through evaporator tubes. Internal cyclone separators and chevron mist eliminators guarantee steam quality x > 99.8%."
            },
            "evaporator": {
                title: "♨️ Evaporator Bank & Pinch Point",
                desc: "The primary heat absorption zone where water turns to saturated steam. The temperature difference between the gas leaving this bank and the saturation temperature is the critical 'Pinch Point' (ΔT_pinch). A smaller pinch point increases steam generation but requires exponentially larger tube surface area."
            },
            "economizer": {
                title: "💧 Economizer (Feedwater Preheater)",
                desc: "Finned tube bundle positioned at the colder end of the flue gas path. It recovers residual waste heat to preheat incoming deaerated boiler feedwater from ~105°C up close to saturation temperature (T_sat - ΔT_approach), drastically improving plant heat recovery efficiency."
            },
            "stack": {
                title: "💨 Exhaust Stack (Chimney) & Flue Gas Discharge",
                desc: "The cooled flue gas discharges into the atmosphere through the exhaust stack. Typical exit temperatures range between 130°C and 190°C to remain comfortably above the acid dew point (preventing sulfuric acid condensation and cold-end corrosion)."
            },
            "bfp": {
                title: "🌀 Boiler Feedwater Pump (BFP) & Drum Level Control",
                desc: "Multi-stage centrifugal pump supplying high-pressure treated feedwater to overcome drum pressure and tube friction. A three-element drum level control system modulates feedwater flow in real time based on steam generation rate and drum level."
            }
        };

        const detail = STATION_DETAILS[stationId];
        if (detail) {
            infoBox.style.display = "block";
            infoBox.innerHTML = `
                <div class="station-info-header">
                    <h4>${detail.title}</h4>
                    <button type="button" class="station-info-close" onclick="document.getElementById('stationInspectionBox').style.display='none'">✕</button>
                </div>
                <p>${detail.desc}</p>
            `;
            infoBox.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }
    }
}
