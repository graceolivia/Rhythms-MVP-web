/**
 * Dev-only time simulation utility.
 *
 * Monkey-patches the global Date so every new Date() / Date.now() call in the
 * app (including inside date-fns and Zustand stores) returns the offset time.
 *
 * Never imported by production code paths — only DevOverlay and main.tsx
 * reference this module, both of which are gated on DEV_MODE.
 */

const SESSION_KEY = '__rhythms_dev_day_offset__';

const RealDate = globalThis.Date;

function buildPatchedDate(offsetMs: number): typeof Date {
  class PatchedDate extends RealDate {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    constructor(...args: any[]) {
      if (args.length === 0) {
        super(RealDate.now() + offsetMs);
      } else if (args.length === 1) {
        super(args[0]);
      } else {
        // Year, month, day[, hours, minutes, seconds, ms] form
        super(args[0], args[1], args[2], args[3], args[4], args[5], args[6]);
      }
    }
    static now() {
      return RealDate.now() + offsetMs;
    }
    static parse(s: string) {
      return RealDate.parse(s);
    }
    static UTC(...args: Parameters<typeof Date.UTC>) {
      return RealDate.UTC(...args);
    }
  }
  return PatchedDate as unknown as typeof Date;
}

/** Apply the stored offset (if any) — call once before the React app mounts. */
export function initDevTime() {
  const days = getDevDayOffset();
  if (days !== 0) {
    globalThis.Date = buildPatchedDate(days * 24 * 60 * 60 * 1000);
  }
}

/** Returns the currently active day offset (0 = real time). */
export function getDevDayOffset(): number {
  const raw = sessionStorage.getItem(SESSION_KEY);
  if (!raw) return 0;
  const n = parseInt(raw, 10);
  return isNaN(n) ? 0 : n;
}

/**
 * Persist a new day offset and reload the page so all stores rehydrate
 * against the patched clock.
 */
export function setDevDayOffset(days: number) {
  if (days === 0) {
    sessionStorage.removeItem(SESSION_KEY);
  } else {
    sessionStorage.setItem(SESSION_KEY, String(days));
  }
  window.location.reload();
}
