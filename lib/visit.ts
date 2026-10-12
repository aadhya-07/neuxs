// "New since last visit" bookkeeping for the sidebar badge.
// Pure localStorage — no backend, no fake data. Feed publishes its count,
// the sidebar badge subscribes.

const LAST_VISIT_KEY = "nexus-last-visit";
export const NEW_COUNT_EVENT = "nexus:newcount";
export const SCOPE_EVENT = "nexus:scope";

export function readLastVisit(): number {
  try {
    const v = Number(localStorage.getItem(LAST_VISIT_KEY));
    return Number.isFinite(v) && v > 0 ? v : 0;
  } catch {
    return 0;
  }
}

export function stampVisit(now = Date.now()): void {
  try {
    localStorage.setItem(LAST_VISIT_KEY, String(now));
  } catch {
    // ignore
  }
}

export function publishNewCount(n: number): void {
  try {
    window.dispatchEvent(new CustomEvent<number>(NEW_COUNT_EVENT, { detail: n }));
  } catch {
    // ignore
  }
}

export function publishScope(scope: string): void {
  try {
    window.dispatchEvent(new CustomEvent<string>(SCOPE_EVENT, { detail: scope }));
  } catch {
    // ignore
  }
}
