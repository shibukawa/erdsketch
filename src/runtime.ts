export type RuntimeMode = "static" | "server" | "desktop";

declare const __ERDSKETCH_RUNTIME_MODE__: RuntimeMode;

export const runtimeMode: RuntimeMode = __ERDSKETCH_RUNTIME_MODE__;

export function usesGoServer() {
  return runtimeMode === "server";
}

export function usesWailsDesktop() {
  return runtimeMode === "desktop";
}
