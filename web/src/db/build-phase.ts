/** True while `next build` workers collect page data (avoid opening the real SQLite file). */
export function isNextProductionBuild(): boolean {
  return process.env.NEXT_PHASE === "phase-production-build";
}
