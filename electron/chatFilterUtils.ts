export function normalizeWord(word: string): string {
  return word
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '');
}

export function messageMatchesBlocked(message: string, blockedWords: string[]): boolean {
  const normalized = normalizeWord(message);
  return blockedWords.some((w) => {
    const n = normalizeWord(w);
    return n.length > 0 && normalized.includes(n);
  });
}

export function dedupeMessages<T extends { id: string }>(msgs: T[]): T[] {
  const seen = new Set<string>();
  return msgs.filter((m) => {
    if (seen.has(m.id)) return false;
    seen.add(m.id);
    return true;
  });
}
