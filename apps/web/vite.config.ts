import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],

  // Explicitly set project root
  root: path.resolve(__dirname, "."),

  // Public assets directory
  publicDir: "public",

  build: {
    outDir: "dist",        // build output
    emptyOutDir: true,     // fix "outDir not emptied" warning
    sourcemap: false,
  },

  server: {
    port: 5173,
    open: true,
    cors: true,
  },

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});
