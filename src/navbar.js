/**
 * Shared Site Navbar & Mobile Menu Controller for PowerPlantCalc
 */

const THEME_KEY = "steam_calculator_theme";

export function initNavbar() {
    const themeToggleBtn = document.getElementById("themeToggle");
    const mobileMenuToggle = document.getElementById("mobileMenuToggle");
    const navLinksContainer = document.getElementById("navLinksContainer");

    // Theme Toggle Handler
    function applyTheme(theme) {
        if (theme === "dark") {
            document.documentElement.removeAttribute("data-theme");
            if (themeToggleBtn) {
                themeToggleBtn.querySelector(".theme-icon").textContent = "🌙";
                themeToggleBtn.querySelector(".theme-text").textContent = "Dark Mode";
            }
        } else {
            document.documentElement.setAttribute("data-theme", "light");
            if (themeToggleBtn) {
                themeToggleBtn.querySelector(".theme-icon").textContent = "☀️";
                themeToggleBtn.querySelector(".theme-text").textContent = "Light Mode";
            }
        }
    }

    const savedTheme = localStorage.getItem(THEME_KEY) || "light";
    applyTheme(savedTheme);

    if (themeToggleBtn) {
        themeToggleBtn.addEventListener("click", () => {
            const isLight = document.documentElement.getAttribute("data-theme") === "light";
            const next = isLight ? "dark" : "light";
            applyTheme(next);
            localStorage.setItem(THEME_KEY, next);
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
}
