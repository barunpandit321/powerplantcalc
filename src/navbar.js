import { detectUserZone, getUserUnitSystem, setUserUnitSystem } from "./geo.js";

const THEME_KEY = "steam_calculator_theme";

export function initNavbar() {
    const themeToggleBtn = document.getElementById("themeToggle");
    const mobileMenuToggle = document.getElementById("mobileMenuToggle");
    const navLinksContainer = document.getElementById("navLinksContainer");
    const unitToggleBtn = document.getElementById("unitSystemToggle");

    // Unit System (US Customary vs Metric SI) Handler
    function updateUnitToggleButton(sys) {
        if (!unitToggleBtn) return;
        if (sys === "US") {
            unitToggleBtn.innerHTML = `<span class="unit-flag">🇺🇸</span><span class="unit-text">US (psi, °F)</span>`;
            unitToggleBtn.setAttribute("title", "Active: US Customary (psi, °F, lb/h, GPM). Click to switch to Metric SI.");
            unitToggleBtn.setAttribute("aria-label", "Active unit system: US Customary. Click to switch to Metric.");
            unitToggleBtn.classList.add("us-active");
        } else {
            unitToggleBtn.innerHTML = `<span class="unit-flag">🌍</span><span class="unit-text">Metric (SI)</span>`;
            unitToggleBtn.setAttribute("title", "Active: Metric SI (bar, °C, kg/h, m³/h). Click to switch to US Customary.");
            unitToggleBtn.setAttribute("aria-label", "Active unit system: Metric SI. Click to switch to US Customary.");
            unitToggleBtn.classList.remove("us-active");
        }
    }

    const initialUnitSystem = getUserUnitSystem();
    updateUnitToggleButton(initialUnitSystem);

    if (unitToggleBtn) {
        unitToggleBtn.addEventListener("click", () => {
            const current = getUserUnitSystem();
            const next = current === "US" ? "METRIC" : "US";
            setUserUnitSystem(next);
            updateUnitToggleButton(next);
            window.dispatchEvent(new CustomEvent("unitSystemChanged", { detail: { system: next } }));
        });
    }

    // Theme Toggle Handler
    function applyTheme(theme) {
        if (theme === "dark") {
            document.documentElement.setAttribute("data-theme", "dark");
            document.documentElement.classList.add("dark");
            if (themeToggleBtn) {
                const icon = themeToggleBtn.querySelector(".theme-icon");
                const text = themeToggleBtn.querySelector(".theme-text");
                if (icon) icon.textContent = "🌙";
                if (text) text.textContent = "Dark Mode";
            }
        } else {
            document.documentElement.setAttribute("data-theme", "light");
            document.documentElement.classList.remove("dark");
            if (themeToggleBtn) {
                const icon = themeToggleBtn.querySelector(".theme-icon");
                const text = themeToggleBtn.querySelector(".theme-text");
                if (icon) icon.textContent = "☀️";
                if (text) text.textContent = "Light Mode";
            }
        }
    }

    const savedTheme = localStorage.getItem(THEME_KEY) || "light";
    applyTheme(savedTheme);

    if (themeToggleBtn) {
        themeToggleBtn.addEventListener("click", () => {
            const isDark = document.documentElement.getAttribute("data-theme") === "dark";
            const next = isDark ? "light" : "dark";
            applyTheme(next);
            localStorage.setItem(THEME_KEY, next);
            window.dispatchEvent(new CustomEvent("themeChanged", { detail: { theme: next } }));
        });
    }

    // Mobile Hamburger Menu Handler
    if (mobileMenuToggle && navLinksContainer) {
        mobileMenuToggle.addEventListener("click", (e) => {
            e.stopPropagation();
            const isOpen = navLinksContainer.classList.contains("mobile-open");
            if (isOpen) {
                navLinksContainer.classList.remove("mobile-open");
                mobileMenuToggle.setAttribute("aria-expanded", "false");
                mobileMenuToggle.querySelector(".hamburger-icon").textContent = "☰";
            } else {
                navLinksContainer.classList.add("mobile-open");
                mobileMenuToggle.setAttribute("aria-expanded", "true");
                mobileMenuToggle.querySelector(".hamburger-icon").textContent = "✕";
            }
        });

        // Close mobile dropdown when clicking outside
        document.addEventListener("click", (e) => {
            if (!navLinksContainer.contains(e.target) && !mobileMenuToggle.contains(e.target)) {
                navLinksContainer.classList.remove("mobile-open");
                mobileMenuToggle.setAttribute("aria-expanded", "false");
                mobileMenuToggle.querySelector(".hamburger-icon").textContent = "☰";
            }
        });
    }

    // Tools Dropdown Menu Handler (Desktop & Mobile)
    const toolsDropdown = document.getElementById("toolsDropdown");
    const toolsDropdownBtn = document.getElementById("toolsDropdownBtn");

    if (toolsDropdown && toolsDropdownBtn) {
        toolsDropdownBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            const isOpen = toolsDropdown.classList.contains("open");
            toolsDropdown.classList.toggle("open", !isOpen);
            toolsDropdownBtn.setAttribute("aria-expanded", String(!isOpen));
        });

        // Close dropdown when clicking outside
        document.addEventListener("click", (e) => {
            if (!toolsDropdown.contains(e.target)) {
                toolsDropdown.classList.remove("open");
                toolsDropdownBtn.setAttribute("aria-expanded", "false");
            }
        });

        // Close on ESC key
        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape") {
                toolsDropdown.classList.remove("open");
                toolsDropdownBtn.setAttribute("aria-expanded", "false");
            }
        });
    }
}
