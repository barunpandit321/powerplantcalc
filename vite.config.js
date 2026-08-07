import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { defineConfig } from "vite";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
    build: {
        rollupOptions: {
            input: {
                main: resolve(__dirname, "index.html"),
                steam: resolve(__dirname, "steam-calculator.html"),
                privacy: resolve(__dirname, "privacy-policy.html"),
                contact: resolve(__dirname, "contact.html"),
                terms: resolve(__dirname, "terms-and-conditions.html"),
                about: resolve(__dirname, "about.html"),
                cooling: resolve(__dirname, "cooling-tower-calculator.html")
            }
        }
    }
});
