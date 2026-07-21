const { db, admin } = require('../config/firebase');
const {
  BADGES,
  LEVELS,
  POINTS_CONFIG,
  PARENT_GIFT_TYPES,
  GIFT_STATUS,
  calculateActivityPoints,
  checkBadgeEligibility,
  getLevelFromPoints
} = require('../types/rewards');
// ═══════════════════════════════════════════════════════════════
//  نظام المكافآت - وحدة التحكم (Rewards Controller)
// ═══════════════════════════════════════════════════════════════
// ── حساب وتحديث نقاط الطفل بعد إكمال نشاط ─────────────────────
exports.processActivityReward = async (childId, activityResult) => {
  const { score, isPerfect, isFirstAttempt, retries } = activityResult;

  // جلب أو إنشاء سجل نقاط الطفل
  const rewardRef = db.collection('child_rewards').doc(childId);
  const rewardDoc = await rewardRef.get();

  let rewardData = rewardDoc.exists
    ? rewardDoc.data()
    : {
        totalPoints: 0,
        activitiesCompleted: 0,
        perfectScores: 0,
        currentStreak: 0,
        longestStreak: 0,
        lastActivityDate: null,
        earnedBadges: [],
        level: 1,
        pointsEarnedToday: 0
      };

  // حساب الانتظام (Streak) وتصفير النقاط اليومية
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const lastDate = rewardData.lastActivityDate
    ? new Date(rewardData.lastActivityDate.toDate())
    : null;
    
  const lastDateStart = lastDate ? new Date(lastDate) : null;
  if (lastDateStart) lastDateStart.setHours(0, 0, 0, 0);

  let streak = rewardData.currentStreak || 0;
  let pointsEarnedToday = rewardData.pointsEarnedToday || 0;

  if (lastDateStart && lastDateStart.getTime() === today.getTime()) {
    // نفس اليوم، لا نزيد الـ streak، ونحتفظ بالنقاط اليومية
  } else if (lastDateStart && Math.floor((today - lastDateStart) / (1000 * 60 * 60 * 24)) === 1) {
    streak += 1; // يوم متتالي
    pointsEarnedToday = 0; // تصفير النقاط ليوم جديد
  } else {
    // إما أول مرة، أو انقطع التسلسل
    streak = 1;
    pointsEarnedToday = 0; 
  }

  // حساب النقاط المكتسبة
  const calculatedPoints = calculateActivityPoints({
    score,
    isPerfect,
    streakDays: streak,
    isFirstAttempt,
    hasRetries: (retries || 0) > 0
  });

  // تطبيق الحد اليومي (DAILY_LIMIT)
  let earnedPoints = calculatedPoints;
  let dailyLimitReached = false;
  if (pointsEarnedToday + calculatedPoints > POINTS_CONFIG.DAILY_LIMIT) {
    earnedPoints = Math.max(0, POINTS_CONFIG.DAILY_LIMIT - pointsEarnedToday);
    dailyLimitReached = true;
  }

  // تحديث الإحصائيات
  rewardData.totalPoints = (rewardData.totalPoints || 0) + earnedPoints;
  rewardData.pointsEarnedToday = pointsEarnedToday + earnedPoints;
  rewardData.activitiesCompleted = (rewardData.activitiesCompleted || 0) + 1;
  rewardData.perfectScores = (rewardData.perfectScores || 0) + (isPerfect ? 1 : 0);
  rewardData.currentStreak = streak;
  rewardData.longestStreak = Math.max(rewardData.longestStreak || 0, streak);
  rewardData.lastActivityDate = admin.firestore.FieldValue.serverTimestamp();

  // تحديث المستوى
  const levelInfo = getLevelFromPoints(rewardData.totalPoints);
  const leveledUp = levelInfo.level > (rewardData.level || 1);
  rewardData.level = levelInfo.level;

  // التحقق من الشارات الجديدة
  const stats = {
    activitiesCompleted: rewardData.activitiesCompleted,
    currentStreak: rewardData.currentStreak,
    perfectScores: rewardData.perfectScores
  };

  const newBadges = [];
  for (const badge of BADGES) {
    if (!rewardData.earnedBadges.includes(badge.id) && checkBadgeEligibility(badge, stats)) {
      rewardData.earnedBadges.push(badge.id);
      newBadges.push(badge);
      rewardData.totalPoints += badge.points;
    }
  }

  // إعادة حساب المستوى بعد إضافة نقاط الشارات
  const finalLevelInfo = getLevelFromPoints(rewardData.totalPoints);
  rewardData.level = finalLevelInfo.level;

  // حفظ التحديثات
  await rewardRef.set(rewardData, { merge: true });

  return {
    earnedPoints,
    calculatedPoints,
    dailyLimitReached,
    totalPoints: rewardData.totalPoints,
    level: finalLevelInfo,
    leveledUp,
    newBadges,
    streak: rewardData.currentStreak,
    longestStreak: rewardData.longestStreak,
    pointsEarnedToday: rewardData.pointsEarnedToday
  };
};

// ── جلب حالة مكافآت الطفل ─────────────────────────────────────
exports.getChildRewards = async (req, res) => {
  try {
    const { childId } = req.params;
    const rewardRef = db.collection('child_rewards').doc(childId);
    const rewardDoc = await rewardRef.get();

    if (!rewardDoc.exists) {
      return res.status(200).json({
        totalPoints: 0,
        activitiesCompleted: 0,
        perfectScores: 0,
        currentStreak: 0,
        longestStreak: 0,
        earnedBadges: [],
        level: getLevelFromPoints(0),
        availableBadges: BADGES
      });
    }

    const data = rewardDoc.data();
    const levelInfo = getLevelFromPoints(data.totalPoints || 0);

    // الشارات المتاحة (غير المكتسبة)
    const earnedBadgeIds = data.earnedBadges || [];
    const availableBadges = BADGES.filter(b => !earnedBadgeIds.includes(b.id));

    return res.status(200).json({
      ...data,
      level: levelInfo,
      earnedBadges: BADGES.filter(b => earnedBadgeIds.includes(b.id)),
      availableBadges
    });
  } catch (error) {
    console.error('getChildRewards error:', error);
    return res.status(500).json({ error: 'فشل في جلب المكافآت' });
  }
};

// ── جلب سجل النقاط (Transactions) ────────────────────────────
exports.getPointsHistory = async (req, res) => {
  try {
    const { childId } = req.params;
    const snapshot = await db.collection('points_history')
      .where('childId', '==', childId)
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get();

    const history = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return res.status(200).json(history);
  } catch (error) {
    console.error('getPointsHistory error:', error);
    return res.status(500).json({ error: 'فشل في جلب سجل النقاط' });
  }
};

// ── الوالد: إنشاء هدية للطفل ─────────────────────────────────
exports.createParentGift = async (req, res) => {
  try {
    const { childId, parentId } = req.body;
    const { type, title, description, requiredPoints, expiresAt } = req.body.gift;

    if (!childId || !type || !title) {
      return res.status(400).json({ error: 'البيانات غير مكتملة' });
    }

    const giftData = {
      childId,
      parentId,
      type,
      title,
      description: description || '',
      requiredPoints: requiredPoints || 0,
      status: GIFT_STATUS.PENDING,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      expiresAt: expiresAt ? new Date(expiresAt) : null
    };

    const docRef = await db.collection('parent_gifts').add(giftData);
    return res.status(201).json({ id: docRef.id, ...giftData });
  } catch (error) {
    console.error('createParentGift error:', error);
    return res.status(500).json({ error: 'فشل في إنشاء الهدية' });
  }
};

// ── جلب هدايا الطفل ──────────────────────────────────────────
exports.getChildGifts = async (req, res) => {
  try {
    const { childId } = req.params;
    const snapshot = await db.collection('parent_gifts')
      .where('childId', '==', childId)
      .orderBy('createdAt', 'desc')
      .get();

    const gifts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return res.status(200).json(gifts);
  } catch (error) {
    console.error('getChildGifts error:', error);
    return res.status(500).json({ error: 'فشل في جلب الهدايا' });
  }
};

// ── الوالد: جلب هدايا أبنائه ─────────────────────────────────
exports.getParentGifts = async (req, res) => {
  try {
    const { parentId } = req.params;
    const snapshot = await db.collection('parent_gifts')
      .where('parentId', '==', parentId)
      .orderBy('createdAt', 'desc')
      .get();

    const gifts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return res.status(200).json(gifts);
  } catch (error) {
    console.error('getParentGifts error:', error);
    return res.status(500).json({ error: 'فشل في جلب الهدايا' });
  }
};

// ── استبدال هدية بالنقاط ─────────────────────────────────────
exports.redeemGift = async (req, res) => {
  try {
    const { giftId, childId } = req.body;

    const giftRef = db.collection('parent_gifts').doc(giftId);
    const giftDoc = await giftRef.get();

    if (!giftDoc.exists) {
      return res.status(404).json({ error: 'الهدية غير موجودة' });
    }

    const gift = giftDoc.data();
    if (gift.status !== GIFT_STATUS.APPROVED) {
      return res.status(400).json({ error: 'الهدية غير متاحة للاستبدال' });
    }

    // التحقق من رصيد النقاط
    const rewardRef = db.collection('child_rewards').doc(childId);
    const rewardDoc = await rewardRef.get();
    const rewardData = rewardDoc.data();

    if ((rewardData?.totalPoints || 0) < gift.requiredPoints) {
      return res.status(400).json({ error: 'نقاط غير كافية' });
    }

    // خصم النقاط وتحديث حالة الهدية
    await rewardRef.set({
      totalPoints: admin.firestore.FieldValue.increment(-gift.requiredPoints)
    }, { merge: true });

    await giftRef.update({ status: GIFT_STATUS.REDEEMED });

    // تسجيل في سجل النقاط
    await db.collection('points_history').add({
      childId,
      points: -gift.requiredPoints,
      type: 'gift_redemption',
      description: `استبدال: ${gift.title}`,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return res.status(200).json({ success: true, message: 'تم استبدال الهدية بنجاح' });
  } catch (error) {
    console.error('redeemGift error:', error);
    return res.status(500).json({ error: 'فشل في استبدال الهدية' });
  }
};

// ── الوالد: الموافقة على هدية ────────────────────────────────
exports.approveGift = async (req, res) => {
  try {
    const { giftId } = req.params;
    const giftRef = db.collection('parent_gifts').doc(giftId);
    await giftRef.update({ status: GIFT_STATUS.APPROVED });
    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: 'فشل في الموافقة على الهدية' });
  }
};

// ── الوالد: حذف هدية ──────────────────────────────────────────
exports.deleteGift = async (req, res) => {
  try {
    const { giftId } = req.params;
    await db.collection('parent_gifts').doc(giftId).delete();
    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: 'فشل في حذف الهدية' });
  }
};

// ── جلب لوحة المتصدرين (Leaderboard) ──────────────────────────
exports.getLeaderboard = async (req, res) => {
  try {
    const { familySubscriptionId } = req.params;
    // جلب أطفال العائلة
    const childrenSnap = await db.collection('childrens')
      .where('familySubscriptionId', '==', familySubscriptionId).get();

    const childIds = childrenSnap.docs.map(d => d.id);
    if (childIds.length === 0) return res.status(200).json([]);

    // جلب نقاط كل طفل
    const rewardsSnap = await db.collection('child_rewards')
      .where(admin.firestore.FieldPath.documentId(), 'in', childIds).get();

    const leaderboard = childrenSnap.docs.map(childDoc => {
      const child = childDoc.data();
      const reward = rewardsSnap.docs.find(r => r.id === childDoc.id);
      const points = reward?.data()?.totalPoints || 0;
      return {
        childId: childDoc.id,
        childName: child.name,
        totalPoints: points,
        level: getLevelFromPoints(points).level,
        badges: reward?.data()?.earnedBadges?.length || 0
      };
    }).sort((a, b) => b.totalPoints - a.totalPoints);

    return res.status(200).json(leaderboard);
  } catch (error) {
    console.error('getLeaderboard error:', error);
    return res.status(500).json({ error: 'فشل في جلب لوحة المتصدرين' });
  }
};

// ── إرسال تشجيع من الوالد ──────────────────────────────────────
exports.sendParentPraise = async (req, res) => {
  try {
    const { childId, parentId, message, type } = req.body;
    if (!childId || !parentId || !message) {
      return res.status(400).json({ error: 'البيانات غير مكتملة' });
    }
    const praiseData = {
      childId,
      parentId,
      message,
      type: type || 'praise',
      isRead: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };
    const docRef = await db.collection('child_praises').add(praiseData);
    return res.status(201).json({ id: docRef.id, ...praiseData });
  } catch (error) {
    console.error('sendParentPraise error:', error);
    return res.status(500).json({ error: 'فشل في إرسال التشجيع' });
  }
};

// ── جلب التشجيعات للطفل ────────────────────────────────────────
exports.getChildPraises = async (req, res) => {
  try {
    const { childId } = req.params;
    const snapshot = await db.collection('child_praises')
      .where('childId', '==', childId)
      .orderBy('createdAt', 'desc')
      .limit(20)
      .get();
    const praises = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return res.status(200).json(praises);
  } catch (error) {
    console.error('getChildPraises error:', error);
    return res.status(500).json({ error: 'فشل في جلب التشجيعات' });
  }
};

// ── تعيين التشجيع كمقروء ───────────────────────────────────────
exports.markPraiseRead = async (req, res) => {
  try {
    const { praiseId } = req.params;
    await db.collection('child_praises').doc(praiseId).update({ isRead: true });
    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: 'فشل تحديث حالة التشجيع' });
  }
};

module.exports = {
  ...exports,
  BADGES,
  LEVELS,
  POINTS_CONFIG,
  PARENT_GIFT_TYPES,
  GIFT_STATUS
};
