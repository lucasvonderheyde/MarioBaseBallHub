export function matchesCharacterSearch(
  character: { displayName: string; gameCharId: string },
  query: string,
): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return (
    character.displayName.toLowerCase().includes(needle) ||
    character.gameCharId.toLowerCase().includes(needle)
  );
}
