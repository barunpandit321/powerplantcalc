import { resolve } from "path";
import { defineConfig } from "vite";

export default defineConfig({
    build: {
        rollupOptions: {
            input: {
                main: resolve(import.meta.dirname, "index.html"),
                steam: resolve(import.meta.dirname, "steam-calculator.html")
            }
        }
    }
});
