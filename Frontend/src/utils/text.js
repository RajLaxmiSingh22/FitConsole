// Shortens text to at most `max` characters, cutting at the last whole word and adding an ellipsis.
export function clampWords(text = "", max = 110) {
  const clean = String(text).replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max + 1);
  const at = cut.lastIndexOf(" ");
  return `${(at > max * 0.5 ? cut.slice(0, at) : clean.slice(0, max)).replace(/[.,;:!?-]+$/, "")}…`;
}
