const HISTORY_LIMIT = 40;
const AUTOSAVE_DELAY_MS = 1600;

export function autosaveDelayFor(totalCards: number) {
  if (totalCards > 240) return 5600;
  if (totalCards > 80) return 3600;
  return AUTOSAVE_DELAY_MS;
}

export function shouldAutoCaptureThumbnail(totalCards: number) {
  return totalCards <= 20;
}

export function historyLimitFor(cardCount: number) {
  if (cardCount > 240) return 8;
  if (cardCount > 80) return 16;
  if (cardCount > 40) return 28;
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
