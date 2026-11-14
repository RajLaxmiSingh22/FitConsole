// One-shot hand-off between workspace sections, e.g. "open this trainer's profile" from a member page.
let pending = null;

export function setNavigationIntent(intent) {
  pending = intent;
}

export function consumeNavigationIntent(type) {
  if (pending?.type !== type) return null;
  const intent = pending;
  pending = null;
  return intent;
}

export function openSection(section, intent) {
  if (intent) setNavigationIntent(intent);
  window.dispatchEvent(new CustomEvent("fitconsole:navigate", { detail: section }));
}
