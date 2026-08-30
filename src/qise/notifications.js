/*
 * The daily notification is a separate, optional retention tool. It does not
 * contain a reading, a face-derived value, or a claim about the person. Its
 * only job is to make a quiet return to the app possible once the user has
 * already used it once.
 *
 * This module owns both the policy and the tiny preference store used by the
 * page and the service worker. Keeping the policy here means the active-app
 * timer and installed-PWA background path cannot drift into two different
 * definitions of "once a day".
 */

export const NOTIFICATION_VERSION = "qise-notifications-v1";
export const NOTIFICATION_DB_NAME = "qise_notifications";
export const NOTIFICATION_DB_VERSION = 1;
export const NOTIFICATION_STORE = "notification_settings";
export const NOTIFICATION_DELIVERY_STORE = "notification_deliveries";
export const NOTIFICATION_KEY = "preferences";

export const NOTIFICATION_TITLE = "Mien Shiang";
export const NOTIFICATION_BODY = "Today’s reading is ready.";
export const NOTIFICATION_TAG = "qise-daily-reading";

export const NOTIFICATION_CADENCES = Object.freeze(["daily", "weekdays", "weekly", "off"]);
export const QUIET_HOURS = Object.freeze({ start: 21 * 60, end: 8 * 60 });
export const NOTIFICATION_TIME = Object.freeze({ min: 8 * 60, max: 21 * 60 - 1 });

export const DEFAULT_NOTIFICATION_PREFERENCES = Object.freeze({
  version: NOTIFICATION_VERSION,
  enabled: false,
  cadence: "daily",
  weekday: 1,
  hour: 8,
  minute: 30,
  pausedUntilDay: null,
  lastDeliveredDay: null,
  lastReadingDay: null,
  updatedAtIso: null,
});

function integerIn(value, min, max, fallback) {
  const number = Number(value);
  return Number.isInteger(number) && number >= min && number <= max ? number : fallback;
}

function validDay(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, date] = value.split("-").map(Number);
  const parsed = new Date(year, month - 1, date);
  return parsed.getFullYear() === year
    && parsed.getMonth() === month - 1
    && parsed.getDate() === date;
}

function validIso(value) {
  return value === null || (
    typeof value === "string" && !Number.isNaN(Date.parse(value))
  );
}

/**
 * Normalize untrusted persisted preferences without widening the policy.
 * Unknown keys are deliberately discarded before the object reaches IDB.
 */
export function normaliseNotificationPreferences(input = {}) {
  const source = input && typeof input === "object" ? input : {};
  const cadence = NOTIFICATION_CADENCES.includes(source.cadence)
    ? source.cadence
    : DEFAULT_NOTIFICATION_PREFERENCES.cadence;
  const enabled = source.enabled === true && cadence !== "off";
  const minutes = Math.min(
    NOTIFICATION_TIME.max,
    Math.max(NOTIFICATION_TIME.min,
      integerIn(source.hour, 0, 23, DEFAULT_NOTIFICATION_PREFERENCES.hour) * 60
      + integerIn(source.minute, 0, 59, DEFAULT_NOTIFICATION_PREFERENCES.minute)),
  );
  return {
    version: NOTIFICATION_VERSION,
    enabled,
    cadence,
    weekday: integerIn(source.weekday, 0, 6, DEFAULT_NOTIFICATION_PREFERENCES.weekday),
    hour: Math.floor(minutes / 60),
    minute: minutes % 60,
    pausedUntilDay: validDay(source.pausedUntilDay) ? source.pausedUntilDay : null,
    lastDeliveredDay: validDay(source.lastDeliveredDay) ? source.lastDeliveredDay : null,
    lastReadingDay: validDay(source.lastReadingDay) ? source.lastReadingDay : null,
    updatedAtIso: validIso(source.updatedAtIso) ? source.updatedAtIso : null,
  };
}

export function updateNotificationPreferences(current, patch = {}, now = new Date()) {
  return normaliseNotificationPreferences({
    ...normaliseNotificationPreferences(current),
    ...(patch && typeof patch === "object" ? patch : {}),
    updatedAtIso: now.toISOString(),
  });
}

export function canonicalDayFor(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function canonicalDayAfter(date = new Date(), days = 0) {
  return canonicalDayFor(dayAtLocalOffset(date, days));
}

export function localMinutesFor(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  return d.getHours() * 60 + d.getMinutes();
}

function dayAtLocalOffset(date, offset) {
  const d = new Date(date instanceof Date ? date.getTime() : new Date(date).getTime());
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + offset);
  return d;
}

function scheduledDay(day, preferences) {
  if (preferences.cadence === "weekdays") return day.getDay() >= 1 && day.getDay() <= 5;
  if (preferences.cadence === "weekly") return day.getDay() === preferences.weekday;
  return preferences.cadence === "daily";
}

function atNotificationTime(day, preferences) {
  const d = new Date(day.getTime());
  d.setHours(preferences.hour, preferences.minute, 0, 0);
  return d;
}

function pausedOn(day, preferences) {
  return Boolean(preferences.pausedUntilDay && canonicalDayFor(day) < preferences.pausedUntilDay);
}

function withinQuietHours(minutes) {
  return minutes >= QUIET_HOURS.start || minutes < QUIET_HOURS.end;
}

/**
 * Explain exactly why a notification will or will not be shown now.
 * `hasReadingToday` is intentionally supplied by the app rather than inferred
 * from notification history: a completed reading must suppress the reminder.
 */
export function notificationEligibility({
  now = new Date(),
  preferences = DEFAULT_NOTIFICATION_PREFERENCES,
  hasPriorReading = false,
  hasReadingToday = false,
} = {}) {
  const prefs = normaliseNotificationPreferences(preferences);
  const day = canonicalDayFor(now);
  const minutes = localMinutesFor(now);
  if (!prefs.enabled) return { eligible: false, reason: "disabled", canonicalDay: day };
  if (!hasPriorReading) return { eligible: false, reason: "first-reading-required", canonicalDay: day };
  if (hasReadingToday) return { eligible: false, reason: "reading-complete", canonicalDay: day };
  if (prefs.lastDeliveredDay === day) return { eligible: false, reason: "already-delivered", canonicalDay: day };
  if (pausedOn(now, prefs)) return { eligible: false, reason: "paused", canonicalDay: day };
  if (!scheduledDay(now, prefs)) return { eligible: false, reason: "not-scheduled-day", canonicalDay: day };
  if (minutes < prefs.hour * 60 + prefs.minute) {
    return { eligible: false, reason: "before-selected-time", canonicalDay: day };
  }
  if (withinQuietHours(minutes)) return { eligible: false, reason: "quiet-hours", canonicalDay: day };
  return { eligible: true, reason: "due", canonicalDay: day };
}

/** Find the next scheduled wall-clock time, bounded against malformed input. */
export function nextNotificationAt(now = new Date(), preferences = DEFAULT_NOTIFICATION_PREFERENCES) {
  const prefs = normaliseNotificationPreferences(preferences);
  if (!prefs.enabled) return null;
  // The longest supported pause is 30 days; the wider bound also keeps a
  // weekly reminder from becoming unschedulable across a month boundary.
  for (let offset = 0; offset <= 370; offset++) {
    const day = dayAtLocalOffset(now, offset);
    if (!scheduledDay(day, prefs) || pausedOn(day, prefs)) continue;
    const candidate = atNotificationTime(day, prefs);
    if (candidate > now && !withinQuietHours(candidate.getHours() * 60 + candidate.getMinutes())) {
      return candidate;
    }
  }
  return null;
}

export function recordNotificationDelivered(preferences, day = canonicalDayFor()) {
  return normaliseNotificationPreferences({
    ...normaliseNotificationPreferences(preferences),
    lastDeliveredDay: validDay(day) ? day : null,
    updatedAtIso: new Date().toISOString(),
  });
}

export function notificationPayload(canonicalDay = canonicalDayFor()) {
  return {
    title: NOTIFICATION_TITLE,
    body: NOTIFICATION_BODY,
    tag: NOTIFICATION_TAG,
    renotify: false,
    icon: "./icon-192.png",
    badge: "./icon-192.png",
    data: { url: "./qise.html", canonicalDay },
  };
}

const request = (req) => new Promise((resolve, reject) => {
  req.onsuccess = () => resolve(req.result);
  req.onerror = () => reject(req.error || new Error("qise/notifications: request failed"));
});

/** Separate IDB database so this tool can be erased without touching reading data. */
export async function openNotificationStore(indexedDBFactory) {
  const idb = indexedDBFactory || (typeof indexedDB !== "undefined" ? indexedDB : null);
  if (!idb) throw new Error("qise/notifications: no IndexedDB available on this host");

  const req = idb.open(NOTIFICATION_DB_NAME, NOTIFICATION_DB_VERSION);
  req.onupgradeneeded = () => {
    const db = req.result;
    if (!db.objectStoreNames.contains(NOTIFICATION_STORE)) {
      db.createObjectStore(NOTIFICATION_STORE, { keyPath: "id" });
    }
    if (!db.objectStoreNames.contains(NOTIFICATION_DELIVERY_STORE)) {
      db.createObjectStore(NOTIFICATION_DELIVERY_STORE, { keyPath: "day" });
    }
  };
  const db = await request(req);
  const tx = (storeName, mode) => db.transaction(storeName, mode).objectStore(storeName);

  return {
    db,

    async get() {
      const stored = await request(tx(NOTIFICATION_STORE, "readonly").get(NOTIFICATION_KEY));
      return normaliseNotificationPreferences(stored || DEFAULT_NOTIFICATION_PREFERENCES);
    },

    async put(preferences) {
      const clean = normaliseNotificationPreferences(preferences);
      await request(tx(NOTIFICATION_STORE, "readwrite").put({ id: NOTIFICATION_KEY, ...clean }));
      return clean;
    },

    async update(patch, now = new Date()) {
      return this.put(updateNotificationPreferences(await this.get(), patch, now));
    },

    async deleteAll() {
      await Promise.all([
        request(tx(NOTIFICATION_STORE, "readwrite").clear()),
        request(tx(NOTIFICATION_DELIVERY_STORE, "readwrite").clear()),
      ]);
      return { cleared: true };
    },

    /** Atomically reserve one delivery per local calendar day across contexts. */
    async claimDelivery(day) {
      if (!validDay(day)) return false;
      try {
        await request(tx(NOTIFICATION_DELIVERY_STORE, "readwrite").add({
          day, claimedAtIso: new Date().toISOString(),
        }));
        return true;
      } catch (error) {
        if (error?.name === "ConstraintError") return false;
        throw error;
      }
    },

    async releaseDelivery(day) {
      if (validDay(day)) await request(tx(NOTIFICATION_DELIVERY_STORE, "readwrite").delete(day));
    },
  };
}
