import { test } from "node:test";
import assert from "node:assert/strict";

import {
  DEFAULT_NOTIFICATION_PREFERENCES, NOTIFICATION_BODY, NOTIFICATION_CADENCES,
  NOTIFICATION_DELIVERY_STORE, NOTIFICATION_KEY, NOTIFICATION_STORE, QUIET_HOURS, NOTIFICATION_TIME,
  canonicalDayAfter, canonicalDayFor, localMinutesFor, nextNotificationAt, notificationEligibility,
  notificationPayload, normaliseNotificationPreferences, openNotificationStore,
  recordNotificationDelivered, updateNotificationPreferences,
} from "../../src/qise/notifications.js";

const day = (hour, minute = 0, date = 31, month = 7) => new Date(2026, month, date, hour, minute, 0, 0);
const enabled = (patch = {}) => normaliseNotificationPreferences({
  enabled: true, cadence: "daily", hour: 8, minute: 30, ...patch,
});

test("notification policy is default-off and has no reading-derived payload", () => {
  assert.equal(DEFAULT_NOTIFICATION_PREFERENCES.enabled, false);
  assert.deepEqual(NOTIFICATION_CADENCES, ["daily", "weekdays", "weekly", "off"]);
  assert.equal(NOTIFICATION_TIME.min, 480);
  assert.equal(NOTIFICATION_TIME.max, 1259);
  assert.deepEqual(QUIET_HOURS, { start: 1260, end: 480 });
  const payload = notificationPayload("2026-08-31");
  assert.equal(payload.body, NOTIFICATION_BODY);
  assert.deepEqual(payload.data, { url: "./qise.html", canonicalDay: "2026-08-31" });
  assert.equal(JSON.stringify(payload).includes("metrics"), false);
  assert.equal(JSON.stringify(payload).includes("face"), false);
});

test("normalisation clamps the time to the quiet-hours boundary and drops unknown keys", () => {
  const prefs = normaliseNotificationPreferences({
    enabled: true, cadence: "daily", hour: 23, minute: 59,
    sourceCaptureId: "must-not-persist", imageData: "must-not-persist",
  });
  assert.equal(prefs.hour, 20);
  assert.equal(prefs.minute, 59);
  assert.equal(prefs.sourceCaptureId, undefined);
  assert.equal(prefs.imageData, undefined);
  assert.equal(prefs.version, "qise-notifications-v1");
  assert.equal(normaliseNotificationPreferences({ pausedUntilDay: "2026-02-31" }).pausedUntilDay, null);
});

test("eligibility fails closed until a prior reading exists and stays quiet after today's reading", () => {
  const now = day(9);
  assert.equal(notificationEligibility({ now, preferences: DEFAULT_NOTIFICATION_PREFERENCES, hasPriorReading: true }).reason, "disabled");
  assert.equal(notificationEligibility({ now, preferences: enabled(), hasPriorReading: false }).reason, "first-reading-required");
  assert.equal(notificationEligibility({ now, preferences: enabled(), hasPriorReading: true, hasReadingToday: true }).reason, "reading-complete");
  assert.equal(notificationEligibility({ now, preferences: enabled(), hasPriorReading: true }).eligible, true);
  assert.equal(notificationEligibility({
    now, preferences: enabled({ lastDeliveredDay: canonicalDayFor(now) }), hasPriorReading: true,
  }).reason, "already-delivered");
});

test("eligibility honours selected time, quiet hours and pause without using a timer as proof", () => {
  const prefs = enabled({ hour: 10, minute: 15 });
  assert.equal(notificationEligibility({ now: day(10, 14), preferences: prefs, hasPriorReading: true }).reason, "before-selected-time");
  assert.equal(notificationEligibility({ now: day(10, 15), preferences: prefs, hasPriorReading: true }).eligible, true);
  assert.equal(notificationEligibility({ now: day(21), preferences: prefs, hasPriorReading: true }).reason, "quiet-hours");
  assert.equal(notificationEligibility({
    now: day(11), preferences: enabled({ pausedUntilDay: "2026-09-02" }), hasPriorReading: true,
  }).reason, "paused");
  assert.equal(localMinutesFor(day(8, 30)), 510);
});

test("weekday and weekly cadences are calendar rules, not elapsed-millisecond guesses", () => {
  const monday = day(9, 0, 31); // 31 August 2026
  const tuesday = day(9, 0, 1, 8); // 1 September 2026
  const saturday = day(9, 0, 5, 8);
  assert.equal(notificationEligibility({ now: monday, preferences: enabled({ cadence: "weekdays" }), hasPriorReading: true }).eligible, true);
  assert.equal(notificationEligibility({ now: saturday, preferences: enabled({ cadence: "weekdays" }), hasPriorReading: true }).reason, "not-scheduled-day");
  assert.equal(notificationEligibility({ now: tuesday, preferences: enabled({ cadence: "weekly", weekday: 2 }), hasPriorReading: true }).eligible, true);
  assert.equal(notificationEligibility({ now: monday, preferences: enabled({ cadence: "weekly", weekday: 2 }), hasPriorReading: true }).reason, "not-scheduled-day");
});

test("nextNotificationAt skips quiet hours and unscheduled days", () => {
  const before = nextNotificationAt(day(7, 55), enabled({ hour: 8, minute: 30 }));
  assert.equal(before.getHours(), 8);
  assert.equal(before.getMinutes(), 30);
  const after = nextNotificationAt(day(21, 1), enabled({ hour: 8, minute: 30 }));
  assert.equal(canonicalDayFor(after), "2026-09-01");
  const fridayNight = nextNotificationAt(day(21, 1, 4, 8), enabled({ cadence: "weekdays", hour: 8, minute: 30 }));
  assert.equal(canonicalDayFor(fridayNight), "2026-09-07");
  assert.equal(canonicalDayAfter(day(9), 30), "2026-09-30");
  assert.equal(canonicalDayFor(nextNotificationAt(day(9), enabled({ pausedUntilDay: "2026-09-30" }))), "2026-09-30");
  assert.equal(nextNotificationAt(day(9), DEFAULT_NOTIFICATION_PREFERENCES), null);
});

test("delivered state is explicit and round-trips through the separate notification store", async () => {
  const prefs = enabled();
  const delivered = recordNotificationDelivered(prefs, "2026-08-31");
  assert.equal(delivered.lastDeliveredDay, "2026-08-31");
  assert.equal(updateNotificationPreferences(delivered, { enabled: false }).enabled, false);

  const idb = fakeIndexedDB();
  const store = await openNotificationStore(idb);
  assert.equal((await store.get()).enabled, false);
  await store.put(delivered);
  const saved = await store.get();
  assert.equal(saved.lastDeliveredDay, "2026-08-31");
  assert.equal(saved.imageData, undefined);
  assert.equal(idb.data.get(NOTIFICATION_KEY).id, NOTIFICATION_KEY);
  assert.equal(NOTIFICATION_DELIVERY_STORE, "notification_deliveries");
  assert.equal(await store.claimDelivery("2026-08-31"), true);
  assert.equal(await store.claimDelivery("2026-08-31"), false);
  await store.releaseDelivery("2026-08-31");
  await store.deleteAll();
  assert.equal(idb.data.size, 0);
  assert.equal(NOTIFICATION_STORE, "notification_settings");
});

function fakeIndexedDB() {
  const data = new Map();
  const names = new Set();
  const tick = (fn) => {
    const req = {};
    queueMicrotask(() => {
      try { req.result = fn(); req.onsuccess?.(); }
      catch (error) { req.error = error; req.onerror?.(); }
    });
    return req;
  };
  const store = {
    get: (key) => tick(() => data.get(key)),
    put: (record) => tick(() => { data.set(record.id, record); return record.id; }),
    clear: () => tick(() => { data.clear(); return undefined; }),
    add: (record) => tick(() => {
      if (data.has(record.day)) {
        const error = new Error("duplicate");
        error.name = "ConstraintError";
        throw error;
      }
      data.set(record.day, record);
      return record.day;
    }),
    delete: (key) => tick(() => { data.delete(key); return undefined; }),
  };
  const db = {
    objectStoreNames: { contains: (name) => names.has(name) },
    createObjectStore: (name) => { names.add(name); return store; },
    transaction: (_name) => ({ objectStore: () => store }),
  };
  return {
    data,
    open: () => {
      const req = { result: db };
      queueMicrotask(() => { req.onupgradeneeded?.(); req.onsuccess?.(); });
      return req;
    },
  };
}
