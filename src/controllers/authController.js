const { db, FieldValue } = require('../config/firebase');
const { getMessages } = require('../config/messages');
const {
  checkLoginAllowed,
  recordFailedAttempt,
  resetAttempts,
} = require('../services/loginAttempts');
const {
  checkDeviceAllowed,
  recordDeviceFailure,
  resetDeviceAttempts,
} = require('../services/deviceAttempts');

// Number of days before subscription expiry to trigger a warning
const EXPIRY_WARNING_DAYS = 15;

/**
 * Build the subscription status object returned to the client.
 * Returns { isActive, isExpired, daysRemaining, expiryWarning }.
 */
const buildSubscriptionStatus = (subData) => {
  const isActive = subData.isActive !== false;
  const endDate = subData.endDate ? new Date(subData.endDate) : null;
  const now = new Date();
  const isExpired = endDate ? endDate < now : false;
  const daysRemaining = endDate
    ? Math.ceil((endDate - now) / (1000 * 60 * 60 * 24))
    : null;
  const expiryWarning =
    endDate && !isExpired && daysRemaining !== null && daysRemaining <= EXPIRY_WARNING_DAYS;
  return { isActive, isExpired, daysRemaining, expiryWarning };
};

// Verify child login code and ensure it belongs to a familySubscription
exports.loginChild = async (req, res) => {
  const t = getMessages(req);
  try {
    const { code, deviceId } = req.body;
    if (!code) return res.status(400).json({ error: t.codeRequired });

    const trimmedCode = code.trim();
    const identifier = `child:${trimmedCode}`;

    // 0a. Device-based rate limiting (Layer 1) — check before code-based lock
    if (deviceId) {
      const deviceCheck = await checkDeviceAllowed(deviceId);
      if (!deviceCheck.allowed) {
        return res.status(429).json({
          error: t.deviceBlocked,
          lockReason: 'deviceBlocked',
          retryAfterMs: deviceCheck.retryAfterMs,
        });
      }
    }

    // 0b. Code-based lock status (Layer 2)
    const lockCheck = await checkLoginAllowed(identifier);
    if (!lockCheck.allowed) {
      const statusCode = lockCheck.reason === 'accountLocked' ? 403 : 429;
      return res.status(statusCode).json({
        error: t[lockCheck.reason],
        lockReason: lockCheck.reason,
      });
    }

    // 1. Look up the child in the childrens collection using the access code
    const snapshot = await db.collection('childrens').where('accessCode', '==', trimmedCode).get();

    if (snapshot.empty) {
      const result = await recordFailedAttempt(identifier);
      if (deviceId) await recordDeviceFailure(deviceId);
      return res.status(401).json({
        error: t.invalidAccessCode,
        attemptsRemaining: result.attemptsRemaining,
        locked: result.locked,
        cooldownActive: result.cooldownActive,
      });
    }

    const childDoc = snapshot.docs[0];
    const childData = { id: childDoc.id, ...childDoc.data() };

    // 2. Ensure the child belongs to a valid family subscription in familySubscriptions
    const subscriptionId = childData.subscriptionId || childData.familySubscriptionId;

    if (!childData.isActive) {
      // Default to true if not explicitly false
      return res.status(403).json({ error: t.childNotActive });
    }
    if (!subscriptionId) {
      return res.status(403).json({ error: t.childNotLinked });
    }

    const subDoc = await db.collection('familySubscriptions').doc(subscriptionId).get();

    if (!subDoc.exists) {
      return res.status(403).json({ error: t.subscriptionNotFound });
    }

    const subData = subDoc.data();

    // 3. Verify the subscription status (active & not expired)
    const subStatus = buildSubscriptionStatus(subData);
    if (!subStatus.isActive) {
      return res.status(403).json({ error: t.subscriptionNotActive });
    }
    if (subStatus.isExpired) {
      return res.status(403).json({ error: t.subscriptionExpired });
    }

    // 4. Successful login -> reset attempts counter
    await resetAttempts(identifier);
    if (deviceId) await resetDeviceAttempts(deviceId);

    // Attach subscription and package info to the child data
    const childDataWithSubscription = {
      ...childData,
      subscriptionId: subscriptionId,
      booksPackId: subData.booksPackId || null,
      isActive: subStatus.isActive,
      subscriptionStatus: subStatus,
    };

    res.status(200).json({ role: 'child', user: childDataWithSubscription });
  } catch (error) {
    console.error('Error during child login:', error);
    res.status(500).json({ error: t.serverError });
  }
};

// Verify parent login code
exports.loginParent = async (req, res) => {
  const t = getMessages(req);
  try {
    const { code, deviceId } = req.body;
    if (!code) return res.status(400).json({ error: t.codeRequired });

    const trimmedCode = code.trim();
    const identifier = `parent:${trimmedCode}`;

    // 0a. Device-based rate limiting (Layer 1) — check before code-based lock
    if (deviceId) {
      const deviceCheck = await checkDeviceAllowed(deviceId);
      if (!deviceCheck.allowed) {
        return res.status(429).json({
          error: t.deviceBlocked,
          lockReason: 'deviceBlocked',
          retryAfterMs: deviceCheck.retryAfterMs,
        });
      }
    }

    // 0b. Code-based lock status (Layer 2)
    const lockCheck = await checkLoginAllowed(identifier);
    if (!lockCheck.allowed) {
      const statusCode = lockCheck.reason === 'accountLocked' ? 403 : 429;
      return res.status(statusCode).json({
        error: t[lockCheck.reason],
        lockReason: lockCheck.reason,
      });
    }

    const snapshot = await db.collection('familySubscriptions').where('parentKey', '==', trimmedCode).get();

    if (snapshot.empty) {
      const result = await recordFailedAttempt(identifier);
      if (deviceId) await recordDeviceFailure(deviceId);
      return res.status(401).json({
        error: t.invalidParentCode,
        attemptsRemaining: result.attemptsRemaining,
        locked: result.locked,
        cooldownActive: result.cooldownActive,
      });
    }

    const parentData = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };

    // 1. Verify the subscription status (active & not expired)
    const subStatus = buildSubscriptionStatus(parentData);
    if (!subStatus.isActive) {
      return res.status(403).json({ error: t.subscriptionNotActive });
    }
    if (subStatus.isExpired) {
      return res.status(403).json({ error: t.subscriptionExpired });
    }

    // 2. Successful login -> reset attempts counter
    await resetAttempts(identifier);
    if (deviceId) await resetDeviceAttempts(deviceId);

    // Attach subscription status (including expiry warning) to the parent data
    const parentDataWithStatus = {
      ...parentData,
      subscriptionStatus: subStatus,
    };

    res.status(200).json({ role: 'parent', user: parentDataWithStatus });
  } catch (error) {
    console.error('Error during parent login:', error);
    res.status(500).json({ error: t.serverError });
  }
};