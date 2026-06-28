import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  root: path.resolve(__dirname),
  publicDir: path.resolve(__dirname, "../desktop/assets"),
  plugins: [react()],
  base: "./",
  server: { host: "0.0.0.0", port: 5173, strictPort: true },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, "index.html"),
        hover: path.resolve(__dirname, "hover.html")
      }
    }
  }
});
