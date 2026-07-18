import { defineConfig, loadEnv } from "vite";
import babel from "@rolldown/plugin-babel";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "");
  const runtimeMode = mode === "server" || mode === "desktop" ? mode : "static";
  const outputDirectory = {
    static: "dist/static",
    server: "server/webassets/dist",
    desktop: "desktop/frontend/dist"
  }[runtimeMode];
  return {
    plugins: [react(), babel({ presets: [reactCompilerPreset()] })],
    base: runtimeMode === "static" ? env.VITE_BASE_PATH || "/" : runtimeMode === "desktop" ? "./" : "/",
    define: {
      __ERDSKETCH_RUNTIME_MODE__: JSON.stringify(runtimeMode)
    },
    build: {
      outDir: outputDirectory,
      emptyOutDir: true
    },
    server: {
      port: 5173,
      proxy: {
        "/api": env.VITE_API_TARGET || "http://127.0.0.1:8080"
      }
    }
  };
});
