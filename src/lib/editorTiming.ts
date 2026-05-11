const HISTORY_LIMIT = 50;
const AUTOSAVE_DELAY_MS = 900;

export function autosaveDelayFor(totalCards: number) {
  if (totalCards > 240) return 4200;
  if (totalCards > 80) return 2600;
  return AUTOSAVE_DELAY_MS;
}

export function shouldAutoCaptureThumbnail(totalCards: number) {
  return totalCards <= 40;
}

export function historyLimitFor(cardCount: number) {
  if (cardCount > 240) return 12;
  if (cardCount > 80) return 24;
  return HISTORY_LIMIT;
}

export function queueIdleTask(callback: () => void) {
  const idleWindow = window as Window & {
    requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
    cancelIdleCallback?: (handle: number) => void;
  };

  if (idleWindow.requestIdleCallback && idleWindow.cancelIdleCallback) {
    const handle = idleWindow.requestIdleCallback(callback, { timeout: 2000 });
    return () => idleWindow.cancelIdleCallback?.(handle);
  }

  const handle = window.setTimeout(callback, 120);
  return () => window.clearTimeout(handle);
}
