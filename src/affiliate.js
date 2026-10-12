/**
 * PowerPlantCalc Amazon Associates Geotargeting Module
 * Automatically delivers Amazon.in (INR ₹) affiliate recommendations to Indian visitors
 * and Amazon.com (USD $) to US & International visitors with store switching capability.
 */

import { detectUserZone } from "./geo.js";

export const AFFILIATE_CONFIG = {
    tagIndia: "powerplantcalc-21",
    tagUS: "powerplantcalc-20"
};

export const AFFILIATE_CATALOG = {
    // 1. Steam Tables & Steam Properties Tools
    steam: [
        {
            id: "steam-plant-operation",
            title: "Steam Plant Operation (10th Edition)",
            author: "Everett B. Woodruff, Herbert B. Lammers",
            type: "Essential Reference Book",
            icon: "📚",
            desc: "The industry-standard operating manual for steam plant engineers, boiler operators, turbine technicians, and plant managers.",
            inQuery: "Steam Plant Operation Woodruff Lammers book",
            inPriceEst: "From ₹850",
            usQuery: "Steam Plant Operation Woodruff Lammers",
            usPriceEst: "From $85"
        },
        {
            id: "babcock-steam-generation",
            title: "Steam: Its Generation and Use",
            author: "Babcock & Wilcox Company",
            type: "Utility Engineering Bible",
            icon: "🔥",
            desc: "The definitive 1,000+ page treatise on thermodynamics, superheaters, boiler design, water chemistry, and utility power cycles.",
            inQuery: "Steam Its Generation and Use Babcock Wilcox",
            inPriceEst: "From ₹1,400",
            usQuery: "Steam Its Generation and Use Babcock Wilcox",
            usPriceEst: "From $110"
        },
        {
            id: "digital-ir-thermometer",
            title: "Industrial Infrared Thermometer (-50°C to 550°C)",
            author: "Non-Contact Laser Pyrometer",
            type: "Field Diagnostic Tool",
            icon: "🌡️",
            desc: "Rapid diagnostic tool for scanning steam line insulation, spotting steam trap thermal blow-through, and checking boiler casing hot spots.",
            inQuery: "Infrared Thermometer Gun industrial laser temperature -50 to 550",
            inPriceEst: "From ₹1,199",
            usQuery: "Infrared Thermometer Gun industrial non contact laser",
            usPriceEst: "From $29"
        },
        {
            id: "differential-pressure-manometer",
            title: "Digital Differential Pressure Manometer",
            author: "Dual-Port Gas & Steam Pressure Gauge",
            type: "Instrumentation",
            icon: "⚡",
            desc: "Precision digital manometer for measuring orifice plate differential pressure drops, boiler draft, and steam regulator settings.",
            inQuery: "Digital Differential Pressure Manometer gauge meter",
            inPriceEst: "From ₹2,499",
            usQuery: "Digital Differential Pressure Manometer HVAC",
            usPriceEst: "From $45"
        }
    ],

    // 2. Boiler Efficiency & Waste Heat Recovery
    boiler: [
        {
            id: "boiler-operators-guide",
            title: "Boiler Operator's Guide (5th Edition)",
            author: "Anthony L. Kohan, McGraw-Hill",
            type: "ASME PTC Reference",
            icon: "📖",
            desc: "Covers ASME Boiler & Pressure Vessel codes, combustion tuning, indirect heat loss troubleshooting, and safety valve maintenance.",
            inQuery: "Boiler Operators Guide Anthony Kohan McGraw Hill",
            inPriceEst: "From ₹790",
            usQuery: "Boiler Operators Guide Anthony Kohan McGraw Hill",
            usPriceEst: "From $75"
        },
        {
            id: "ganapathy-industrial-boilers",
            title: "Industrial Boilers and HRSGs",
            author: "V. Ganapathy (Heat Transfer Expert)",
            type: "WHRB & HRSG Design",
            icon: "♻️",
            desc: "Specialized engineering handbook covering pinch point optimization, economizer subcooling, and waste heat recovery boiler thermodynamics.",
            inQuery: "Industrial Boilers and Heat Recovery Steam Generators Ganapathy",
            inPriceEst: "From ₹2,200",
            usQuery: "Industrial Boilers and Heat Recovery Steam Generators Ganapathy",
            usPriceEst: "From $140"
        },
        {
            id: "flue-gas-temp-pyrometer",
            title: "High-Temperature Laser Pyrometer (up to 750°C)",
            author: "Boiler Flue Gas & Stack Inspection",
            type: "Field Diagnostic Tool",
            icon: "🎯",
            desc: "Extended-range infrared sensor for non-contact measurement of flue gas ducts, economizer inlet headers, and refractory walls.",
            inQuery: "High Temperature Infrared Thermometer Gun 750C",
            inPriceEst: "From ₹1,899",
            usQuery: "High Temperature Infrared Thermometer 1000F",
            usPriceEst: "From $49"
        },
        {
            id: "combustion-air-anemometer",
            title: "Digital Vane Anemometer & Airflow Meter",
            author: "Forced Draft (FD) & ID Fan Airflow",
            type: "Air-Fuel Ratio Tool",
            icon: "💨",
            desc: "Measures combustion air intake velocity and windbox volume to balance excess air ratios and eliminate CO unburned fuel losses.",
            inQuery: "Digital Anemometer Air Flow Velocity Meter CFM",
            inPriceEst: "From ₹1,299",
            usQuery: "Digital Anemometer Air Flow Velocity Meter CFM",
            usPriceEst: "From $32"
        }
    ],

    // 3. Steam Pipe Sizing & Hydraulics
    pipe: [
        {
            id: "piping-handbook-nayyar",
            title: "Piping Handbook (7th Edition)",
            author: "Mohinder L. Nayyar, McGraw-Hill",
            type: "ASME B31.1 Authority",
            icon: "📏",
            desc: "The universal 2,000+ page encyclopedia on ASME B31.1/B31.3 pipe sizing, Darcy-Weisbach friction, thermal expansion, and steam traps.",
            inQuery: "Piping Handbook Mohinder Nayyar McGraw Hill",
            inPriceEst: "From ₹1,850",
            usQuery: "Piping Handbook Mohinder Nayyar McGraw Hill",
            usPriceEst: "From $135"
        },
        {
            id: "ultrasonic-thickness-gauge",
            title: "Ultrasonic Pipe Wall Thickness Gauge Meter",
            author: "Non-Destructive Testing (NDT)",
            type: "Corrosion Inspection Tool",
            icon: "🔍",
            desc: "Critical NDT meter (1.2mm - 225mm) for verifying schedule 40/80 pipe wall remaining thickness and preventing steam pipe ruptures.",
            inQuery: "Ultrasonic Thickness Gauge meter pipe wall metal NDT",
            inPriceEst: "From ₹5,499",
            usQuery: "Ultrasonic Thickness Gauge meter metal pipe wall NDT",
            usPriceEst: "From $99"
        },
        {
            id: "digital-vernier-caliper",
            title: "Heavy-Duty Stainless Steel Digital Caliper (150mm)",
            author: "Pipe OD & Flange Measurement",
            type: "Precision Measurement",
            icon: "📐",
            desc: "Accurately measure pipe outer diameters (OD), wall thicknesses, gasket seating faces, and valve flange bolt dimensions.",
            inQuery: "Digital Vernier Caliper 150mm stainless steel",
            inPriceEst: "From ₹749",
            usQuery: "Digital Vernier Caliper 6 inch stainless steel",
            usPriceEst: "From $24"
        },
        {
            id: "spirax-steam-trapping",
            title: "Steam Trapping and Air Venting Guide",
            author: "L.G. Northcroft",
            type: "Condensate Drainage",
            icon: "💧",
            desc: "Practical principles of steam trapping, sizing condensate return lines, preventing water hammer, and thermodynamic trap testing.",
            inQuery: "Steam Trapping and Air Venting Northcroft book",
            inPriceEst: "From ₹950",
            usQuery: "Steam Trapping and Air Venting",
            usPriceEst: "From $45"
        }
    ],

    // 4. Cooling Tower Performance & Water Treatment
    cooling: [
        {
            id: "cooling-tower-fundamentals",
            title: "Cooling Tower Fundamentals",
            author: "John C. Hensley (SPX Marley)",
            type: "CTI Standard Reference",
            icon: "🌊",
            desc: "Authoritative handbook on evaporative cooling, psychrometrics, range & approach evaluation, drift eliminators, and fan sizing.",
            inQuery: "Cooling Tower Fundamentals Hensley SPX Marley book",
            inPriceEst: "From ₹1,200",
            usQuery: "Cooling Tower Fundamentals SPX Marley",
            usPriceEst: "From $65"
        },
        {
            id: "digital-sling-psychrometer",
            title: "Digital Psychrometer (Wet Bulb & Relative Humidity)",
            author: "Psychrometric Measurement",
            type: "Field Testing Tool",
            icon: "🌡️",
            desc: "Essential digital meter for measuring wet bulb temperature (Twb) and ambient air dew point to evaluate cooling tower approach.",
            inQuery: "Digital Psychrometer Wet Bulb Thermometer hygrometer",
            inPriceEst: "From ₹1,999",
            usQuery: "Digital Psychrometer Wet Bulb Thermometer hygrometer",
            usPriceEst: "From $39"
        },
        {
            id: "tds-conductivity-meter",
            title: "Professional TDS & EC Water Conductivity Meter",
            author: "Cycles of Concentration (CoC)",
            type: "Water Treatment Testing",
            icon: "🧪",
            desc: "Instant testing of cooling tower basin TDS vs makeup water TDS to calibrate blowdown valves and monitor Cycles of Concentration.",
            inQuery: "Digital TDS Meter Conductivity EC meter water testing",
            inPriceEst: "From ₹699",
            usQuery: "Digital TDS Meter Conductivity EC meter water testing",
            usPriceEst: "From $19"
        },
        {
            id: "water-treatment-handbook",
            title: "The Nalco Water Handbook (3rd Edition)",
            author: "Daniel Flynn, Nalco Company",
            type: "Scale & Corrosion Control",
            icon: "📗",
            desc: "Comprehensive manual on cooling water scaling, biological fouling, legionella control, and chemical treatment dosing.",
            inQuery: "The Nalco Water Handbook Daniel Flynn McGraw Hill",
            inPriceEst: "From ₹2,400",
            usQuery: "The Nalco Water Handbook Daniel Flynn McGraw Hill",
            usPriceEst: "From $125"
        }
    ]
};

/**
 * Determines whether the current visitor is from India
 * Checks manual user preference in localStorage first, then timezone, then language/locale.
 */
export function isIndianVisitor() {
    try {
        const stored = localStorage.getItem("ppc_affiliate_store");
        if (stored === "IN") return true;
        if (stored === "US") return false;
    } catch (e) {}

    // 1. Timezone UTC offset check: India Standard Time (IST) is strictly UTC+05:30 (-330 minutes)
    let isOffsetIndia = false;
    try {
        const offset = new Date().getTimezoneOffset();
        // -330 is UTC+5:30 (India & Sri Lanka)
        if (offset === -330) {
            isOffsetIndia = true;
        }
    } catch (e) {}

    let timeZone = "";
    try {
        timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
    } catch (e) {}

    const lang = (navigator.language || "").toLowerCase();
    const languages = (navigator.languages || []).map(l => (l || "").toLowerCase());

    const isTzIndia = timeZone.includes("Kolkata") || timeZone.includes("Calcutta") ||
                      timeZone.includes("Colombo") || timeZone.includes("Dhaka") ||
                      timeZone.includes("IST");

    const indianLangs = ["hi", "ta", "te", "bn", "mr", "gu", "kn", "ml", "pa", "or", "as", "ur-in"];
    const isLangIndia = lang.endsWith("-in") ||
                        indianLangs.some(prefix => lang.startsWith(prefix)) ||
                        languages.some(l => l.endsWith("-in") || indianLangs.some(prefix => l.startsWith(prefix)));

    if (isOffsetIndia || isTzIndia || isLangIndia) return true;

    try {
        if (detectUserZone() === "IN") return true;
    } catch (e) {}

    return false;
}

/**
 * Builds the Amazon affiliate search URL for a product
 */
export function buildAffiliateUrl(query, isIndia = true) {
    const encoded = encodeURIComponent(query);
    if (isIndia) {
        return `https://www.amazon.in/s?k=${encoded}&tag=${AFFILIATE_CONFIG.tagIndia}`;
    } else {
        return `https://www.amazon.com/s?k=${encoded}&tag=${AFFILIATE_CONFIG.tagUS}`;
    }
}

/**
 * Renders the geotargeted affiliate recommendation card
 * @param {string|HTMLElement} target - Container ID or HTMLElement
 * @param {string} category - "steam", "boiler", "pipe", or "cooling"
 */
export function renderAffiliateSection(target, category = "steam") {
    const container = typeof target === "string" ? document.getElementById(target) : target;
    if (!container) return;

    const products = AFFILIATE_CATALOG[category] || AFFILIATE_CATALOG.steam;
    let activeStore = isIndianVisitor() ? "IN" : "US";

    function updateView() {
        const isIndia = activeStore === "IN";
        const storeFlag = isIndia ? "🇮🇳" : "🇺🇸";
        const storeName = isIndia ? "Amazon.in (India)" : "Amazon.com (US)";
        const currency = isIndia ? "₹" : "$";

        container.innerHTML = `
            <section class="affiliate-recommendations-section" aria-label="Recommended Engineering Handbooks and Instrumentation">
                <div class="affiliate-header-bar">
                    <div class="affiliate-title-group">
                        <span class="affiliate-badge-icon">⭐</span>
                        <div>
                            <h3 class="affiliate-main-title">Recommended Engineering Handbooks &amp; Field Tools</h3>
                            <p class="affiliate-subtitle">Authoritative literature &amp; diagnostic instrumentation for plant engineers and operators.</p>
                        </div>
                    </div>

                    <!-- Geotargeted Store Switcher Toggle -->
                    <div class="affiliate-store-toggle" role="group" aria-label="Select Amazon Storefront">
                        <button type="button" class="affiliate-store-btn ${isIndia ? 'active' : ''}" data-store="IN">
                            🇮🇳 Amazon.in (₹)
                        </button>
                        <button type="button" class="affiliate-store-btn ${!isIndia ? 'active' : ''}" data-store="US">
                            🇺🇸 Amazon.com ($)
                        </button>
                    </div>
                </div>

                <!-- Products Grid -->
                <div class="affiliate-grid">
                    ${products.map(p => {
                        const url = buildAffiliateUrl(isIndia ? p.inQuery : p.usQuery, isIndia);
                        const priceEst = isIndia ? p.inPriceEst : p.usPriceEst;

                        return `
                            <article class="affiliate-card">
                                <div class="affiliate-card-top">
                                    <span class="affiliate-product-icon">${p.icon}</span>
                                    <span class="affiliate-type-badge">${p.type}</span>
                                </div>
                                <h4 class="affiliate-product-title">${p.title}</h4>
                                <div class="affiliate-author">${p.author}</div>
                                <p class="affiliate-desc">${p.desc}</p>
                                <div class="affiliate-card-bottom">
                                    <span class="affiliate-price-tag">${priceEst}</span>
                                    <a href="${url}" target="_blank" rel="sponsored nofollow noopener" class="affiliate-cta-btn">
                                        <span>Check on ${isIndia ? 'Amazon.in' : 'Amazon.com'}</span>
                                        <span class="affiliate-cta-arrow">↗</span>
                                    </a>
                                </div>
                            </article>
                        `;
                    }).join("")}
                </div>

                <!-- Mandatory Amazon Associates Compliance Disclosure -->
                <div class="affiliate-compliance-footer">
                    <span class="affiliate-compliance-icon">ℹ️</span>
                    <span><strong>Amazon Associates Disclosure:</strong> PowerPlantCalc participates in the Amazon Associates Program (${storeFlag} ${storeName}). As an Amazon Associate, we earn from qualifying purchases. Product recommendations support our free engineering software at zero additional cost to you.</span>
                </div>
            </section>
        `;

        // Attach store switcher event listeners
        container.querySelectorAll(".affiliate-store-btn").forEach(btn => {
            btn.addEventListener("click", () => {
                activeStore = btn.getAttribute("data-store") || "IN";
                try {
                    localStorage.setItem("ppc_affiliate_store", activeStore);
                } catch (e) {}
                updateView();
                window.dispatchEvent(new CustomEvent("affiliateStoreChanged", { detail: { store: activeStore } }));
            });
        });
    }

    updateView();
}

// Track active in-result recommendation containers for instantaneous store-switching
const activeInResultContainers = new Set();

window.addEventListener("affiliateStoreChanged", () => {
    activeInResultContainers.forEach(el => {
        if (el && el._currentOptions) {
            renderInResultRecommendation(el, el._currentOptions);
        }
    });
});

/**
 * Renders an authoritative in-result contextual recommendation directly beneath
 * calculation results when calculations finish. Converts calculation intent into high-intent CTR.
 *
 * @param {string|HTMLElement} target - Container ID or HTMLElement
 * @param {Object} options - Recommendation parameters
 */
export function renderInResultRecommendation(target, options) {
    const container = typeof target === "string" ? document.getElementById(target) : target;
    if (!container || !options) return;

    // Cache latest options on element for dynamic store switcher response
    container._currentOptions = options;
    activeInResultContainers.add(container);

    const isIndia = isIndianVisitor();
    const query = isIndia ? (options.inQuery || options.query) : (options.usQuery || options.query);
    const url = buildAffiliateUrl(query, isIndia);
    const priceEst = isIndia ? options.inPriceEst : options.usPriceEst;
    const storeName = isIndia ? "Amazon.in" : "Amazon.com";
    const storeFlag = isIndia ? "🇮🇳" : "🇺🇸";

    container.innerHTML = `
        <div class="in-result-tip-card">
            <div class="in-result-tip-header">
                <div class="in-result-tip-badge-wrap">
                    <span class="in-result-tip-icon">${options.icon || "💡"}</span>
                    <span class="in-result-tip-badge">${options.badge || "Field Engineering Tip"}</span>
                </div>
                <span class="in-result-tip-store-indicator">${storeFlag} Verified on ${storeName}</span>
            </div>
            <h4 class="in-result-tip-headline">${options.headline}</h4>
            <p class="in-result-tip-text">${options.text}</p>
            <div class="in-result-tip-action-bar">
                <div class="in-result-tip-product-info">
                    <span class="in-result-tip-tool-label">Recommended Tool:</span>
                    <strong class="in-result-tip-product-title">${options.productTitle}</strong>
                    ${priceEst ? `<span class="in-result-tip-price">(${priceEst})</span>` : ""}
                </div>
                <a href="${url}" target="_blank" rel="sponsored nofollow noopener" class="in-result-tip-btn">
                    <span>Check on ${storeName}</span>
                    <span class="in-result-tip-btn-arrow">↗</span>
                </a>
            </div>
        </div>
    `;
    container.style.display = "block";
}

