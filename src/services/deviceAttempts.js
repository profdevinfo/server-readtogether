const { db, FieldValue } = require('../config/firebase');

/**
 * Device-based rate limiting service.
 *
 * Layer 1 of the two-layer defense against random code guessing:
 *  - Tracks failed login attempts per *device* (not per code).
 *  - A device is identified by a client-generated UUID stored in localStorage.
 *  - After DEVICE_MAX_ATTEMPTS failed attempts within a rolling 1-hour window,
 *    the device is temporarily blocked for DEVICE_BLOCK_MS.
 *
 * This is intentionally more lenient than the per-code lock (Layer 2) because
 * devices may be shared among family members.
 *
 * State is stored in Firestore collection `deviceAttempts`, one document per
 * deviceId. The document holds:
 *   - failedAttempts: number of failures in the current window
 *   - windowStart:    timestamp marking the start of the current 1-hour window
 *   - blockedUntil:   timestamp until which the device is temporarily blocked
 *   - lastFailedAt:   timestamp of the last failure
 */

const DEVICE_MAX_ATTEMPTS = 10; // failures allowed per window
const WINDOW_MS = 60 * 60 * 1000; // 1-hour rolling window
const DEVICE_BLOCK_MS = 60 * 60 * 1000; // 1-hour block duration

/**
 * Get the current device attempt record.
 * @param {string} deviceId - client-generated device identifier
 */
const getDeviceRecord = async (deviceId) => {
  const docRef = db.collection('deviceAttempts').doc(deviceId);
  const doc = await docRef.get();
  if (!doc.exists) {
    return {
      failedAttempts: 0,
      windowStart: null,
      blockedUntil: null,
      lastFailedAt: null,
    };
  }
  return doc.data();
};

/**
 * Check whether login is currently allowed for the given device.
 * Returns: { allowed: boolean, reason?: 'deviceBlocked', retryAfterMs?: number }
 *
 * @param {string} deviceId
 */
const checkDeviceAllowed = async (deviceId) => {
  if (!deviceId) {
    // No deviceId provided — allow login (the route layer enforces presence).
    return { allowed: true };
  }

  const record = await getDeviceRecord(deviceId);
  const now = new Date();

  // Device is temporarily blocked
  if (record.blockedUntil) {
    const blockedUntilDate = new Date(record.blockedUntil);
    if (blockedUntilDate > now) {
      const retryAfterMs = blockedUntilDate - now;
      return { allowed: false, reason: 'deviceBlocked', retryAfterMs };
    }
    // Block expired -> reset the window so the device gets a fresh start
    await db.collection('deviceAttempts').doc(deviceId).set({
      failedAttempts: 0,
      windowStart: null,
      blockedUntil: null,
      lastFailedAt: record.lastFailedAt || null,
    }, { merge: true });
  }

  // If the rolling window has elapsed, reset the counter
  if (record.windowStart) {
    const windowStartDate = new Date(record.windowStart);
    if (now - windowStartDate > WINDOW_MS) {
      await db.collection('deviceAttempts').doc(deviceId).set({
        failedAttempts: 0,
        windowStart: null,
        blockedUntil: null,
        lastFailedAt: record.lastFailedAt || null,
      }, { merge: true });
    }
  }

  return { allowed: true };
};

/**
 * Record a failed login attempt for a device.
 * Handles the rolling-window counter and temporary block logic.
 * Returns: { blocked: boolean, blockedUntil?: Date, attemptsRemaining: number }
 *
 * @param {string} deviceId
 */
const recordDeviceFailure = async (deviceId) => {
  if (!deviceId) return { blocked: false, attemptsRemaining: DEVICE_MAX_ATTEMPTS };

  const docRef = db.collection('deviceAttempts').doc(deviceId);
  const record = await getDeviceRecord(deviceId);
  const now = new Date();

  // If already blocked and block still active, do not increment
  if (record.blockedUntil && new Date(record.blockedUntil) > now) {
    return { blocked: true, attemptsRemaining: 0 };
  }

  // Determine if we are still inside the current rolling window
  let windowStart = record.windowStart ? new Date(record.windowStart) : null;
  let failedAttempts = record.failedAttempts || 0;

  if (!windowStart || (now - windowStart) > WINDOW_MS) {
    // Start a new window
    windowStart = now;
    failedAttempts = 0;
  }

  failedAttempts += 1;

  // Threshold reached -> block the device temporarily
  if (failedAttempts >= DEVICE_MAX_ATTEMPTS) {
    const blockedUntil = new Date(now.getTime() + DEVICE_BLOCK_MS);
    await docRef.set({
      failedAttempts,
      windowStart: windowStart,
      blockedUntil: blockedUntil,
      lastFailedAt: now,
    }, { merge: true });
    return { blocked: true, blockedUntil, attemptsRemaining: 0 };
  }

  // Otherwise just increment within the window
  await docRef.set({
    failedAttempts,
    windowStart: windowStart,
    blockedUntil: null,
    lastFailedAt: now,
  }, { merge: true });

  return { blocked: false, attemptsRemaining: DEVICE_MAX_ATTEMPTS - failedAttempts };
};

/**
 * Reset the device attempt record after a successful login.
 * @param {string} deviceId
 */
const resetDeviceAttempts = async (deviceId) => {
  if (!deviceId) return;
  await db.collection('deviceAttempts').doc(deviceId).set({
    failedAttempts: 0,
    windowStart: null,
    blockedUntil: null,
    lastFailedAt: null,
  }, { merge: true });
};

module.exports = {
  DEVICE_MAX_ATTEMPTS,
  WINDOW_MS,
  DEVICE_BLOCK_MS,
  getDeviceRecord,
  checkDeviceAllowed,
  recordDeviceFailure,
  resetDeviceAttempts,
};
