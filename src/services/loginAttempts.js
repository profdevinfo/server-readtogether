const { db, FieldValue } = require('../config/firebase');

/**
 * Login attempts & account lock service.
 *
 * Strategy (applies to both child & parent):
 *  - First 5 failed attempts  -> temporary lock for 1 hour (cooldown)
 *  - After cooldown, 5 more failed attempts -> permanent account lock (isActive = false)
 *
 * State is stored in Firestore collection `loginAttempts`, one document per
 * identifier (child accessCode or parent parentKey). The document holds:
 *   - failedAttempts: number of consecutive failures since last success
 *   - cooldownUntil:   timestamp until which login is temporarily blocked
 *   - locked:          boolean, true when account is permanently locked
 *   - lastFailedAt:   timestamp of the last failure
 */

const MAX_ATTEMPTS = 5;
const COOLDOWN_MS = 60 * 60 * 1000; // 1 hour

/**
 * Get the current attempt record for an identifier.
 * @param {string} identifier - accessCode (child) or parentKey (parent)
 */
const getAttemptRecord = async (identifier) => {
  const docRef = db.collection('loginAttempts').doc(identifier);
  const doc = await docRef.get();
  if (!doc.exists) {
    return { failedAttempts: 0, cooldownUntil: null, locked: false, lastFailedAt: null };
  }
  return doc.data();
};

/**
 * Check whether login is currently allowed for the given identifier.
 * Returns an object: { allowed: boolean, reason?: string, attemptsRemaining?: number }
 */
const checkLoginAllowed = async (identifier) => {
  const record = await getAttemptRecord(identifier);

  // Permanent lock
  if (record.locked) {
    return { allowed: false, reason: 'accountLocked' };
  }

  // Temporary cooldown
  if (record.cooldownUntil) {
    const cooldownDate = new Date(record.cooldownUntil);
    if (cooldownDate > new Date()) {
      return { allowed: false, reason: 'tooManyAttempts' };
    }
    // Cooldown expired -> reset attempts counter (start a new cycle of 5)
    await db.collection('loginAttempts').doc(identifier).set({
      failedAttempts: 0,
      cooldownUntil: null,
      locked: false,
      lastFailedAt: record.lastFailedAt || null,
    }, { merge: true });
  }

  const attemptsRemaining = MAX_ATTEMPTS - (record.failedAttempts || 0);
  return { allowed: true, attemptsRemaining };
};

/**
 * Record a failed login attempt. Handles cooldown & permanent lock logic.
 * Returns an object describing the new state.
 */
const recordFailedAttempt = async (identifier) => {
  const docRef = db.collection('loginAttempts').doc(identifier);
  const record = await getAttemptRecord(identifier);

  // If currently in cooldown, do not increment (cooldown already active)
  if (record.cooldownUntil && new Date(record.cooldownUntil) > new Date()) {
    return { locked: record.locked, cooldownActive: true };
  }

  const newAttempts = (record.failedAttempts || 0) + 1;

  // First cycle: 5 attempts -> temporary cooldown (1 hour)
  if (newAttempts >= MAX_ATTEMPTS && !record.locked && !record.hadCooldown) {
    await docRef.set({
      failedAttempts: newAttempts,
      cooldownUntil: FieldValue.serverTimestamp(),
      locked: false,
      hadCooldown: true, // mark that the first cooldown has been used
      lastFailedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    return { locked: false, cooldownActive: true };
  }

  // Second cycle (after cooldown): 5 more attempts -> permanent lock
  if (newAttempts >= MAX_ATTEMPTS * 2 && record.hadCooldown) {
    await docRef.set({
      failedAttempts: newAttempts,
      cooldownUntil: null,
      locked: true,
      hadCooldown: true,
      lastFailedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    return { locked: true, cooldownActive: false };
  }

  // Otherwise just increment
  await docRef.set({
    failedAttempts: newAttempts,
    cooldownUntil: record.cooldownUntil || null,
    locked: record.locked || false,
    hadCooldown: record.hadCooldown || false,
    lastFailedAt: FieldValue.serverTimestamp(),
  }, { merge: true });

  return { locked: false, cooldownActive: false, attemptsRemaining: MAX_ATTEMPTS - newAttempts };
};

/**
 * Reset the attempt record after a successful login.
 */
const resetAttempts = async (identifier) => {
  await db.collection('loginAttempts').doc(identifier).set({
    failedAttempts: 0,
    cooldownUntil: null,
    locked: false,
    hadCooldown: false,
    lastFailedAt: null,
  }, { merge: true });
};

module.exports = {
  MAX_ATTEMPTS,
  COOLDOWN_MS,
  getAttemptRecord,
  checkLoginAllowed,
  recordFailedAttempt,
  resetAttempts,
};
