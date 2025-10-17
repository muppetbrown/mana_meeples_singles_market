// @ts-expect-error TS(2307): Cannot find module 'vite' or its corresponding typ... Remove this comment to see the full error message
import { defineConfig } from "vite";
// @ts-expect-error TS(2307): Cannot find module '@vitejs/plugin-react' or its c... Remove this comment to see the full error message
import react from "@vitejs/plugin-react";


export default defineConfig({
plugins: [react()],
build: { sourcemap: true, outDir: "dist" },
server: { port: 5173, strictPort: true }
});