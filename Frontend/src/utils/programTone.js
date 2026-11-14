// Visual accent per program category (colour is always paired with the category name in the UI).
const tones = { combat: "red", strength: "green", conditioning: "yellow" };

export function programTone(category = "") {
  const key = category.toLowerCase();
  return Object.entries(tones).find(([name]) => key.includes(name))?.[1] ?? "pink";
}
