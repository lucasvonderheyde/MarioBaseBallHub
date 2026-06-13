/** Rotate stat lines so the hub ticker changes over time without randomness. */
export function rotateTickerLines(lines: string[], maxLines: number, seed: number): string[] {
  if (lines.length === 0) return [];
  if (lines.length <= maxLines) return lines;

  const offset = seed % lines.length;
  const rotated = [...lines.slice(offset), ...lines.slice(0, offset)];
  return rotated.slice(0, maxLines);
}
