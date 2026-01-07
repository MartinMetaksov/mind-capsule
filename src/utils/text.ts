export function pluralize(word: string): string {
  const lower = word.toLowerCase();
  if (lower.endsWith("s") || lower.endsWith("x") || lower.endsWith("z")) {
    return `${word}es`;
  }
  if (lower.endsWith("ch") || lower.endsWith("sh")) {
    return `${word}es`;
  }
  const penultimate = lower[lower.length - 2];
  if (lower.endsWith("y") && penultimate && !"aeiou".includes(penultimate)) {
    return `${word.slice(0, -1)}ies`;
  }
  return `${word}s`;
}
