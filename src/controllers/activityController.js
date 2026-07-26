const { db, admin } = require('../config/firebase');
const { getMessages } = require('../config/messages');
const rewardsController = require('./rewardsController');

// جلب جميع الأنشطة المتاحة للطفل
exports.getActivities = async (req, res) => {
  const t = getMessages(req);
  try {
    const snapshot = await db.collection('activities').get();
    const activities = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.status(200).json(activities);
  } catch (error) {
    res.status(500).json({ error: t.fetchActivitiesFailed });
  }
};

// التحقق من كود النشاط وفتحه للطفل
exports.verifyActivityCode = async (req, res) => {
  const t = getMessages(req);
  try {
    const { activityId, code } = req.body;
    const doc = await db.collection('activities').doc(activityId).get();

    if (!doc.exists) return res.status(404).json({ error: t.activityNotFound });
    
    const data = doc.data();
    if (data.activityCode !== code.trim()) {
      return res.status(403).json({ error: t.wrongActivityCode });
    }

    res.status(200).json({ success: true, activity: { id: doc.id, ...data } });
  } catch (error) {
    res.status(500).json({ error: t.verifyCodeError });
  }
};

// إرسال نتيجة نشاط وحساب التقييم والعبارة التحفيزية
exports.submitActivity = async (req, res) => {
  const t = getMessages(req);
  try {
    const { childId, activityId, activityTitle, score, duration, isFirstAttempt, retries } = req.body;
    
    // تحديد العبارة التحفيزية بناءً على النتيجة من 10
    let motivationalQuote = '';
    if (score >= 9) motivationalQuote = t.motivationalSuper;
    else if (score >= 7) motivationalQuote = t.motivationalExcellent;
    else if (score >= 5) motivationalQuote = t.motivationalGood;
    else motivationalQuote = t.motivationalRetry;

    const logData = {
      childId,
      activityId,
      activityTitle,
      score: Number(score),
      duration: Number(duration), // بالثواني
      motivationalQuote,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };

    const docRef = await db.collection('activity_logs').add(logData);

    // ── معالجة المكافآت: حساب النقاط، تحديث السلسلة، الشارات، المستوى ──
    let rewards = null;
    try {
      const activityResult = {
        score: Number(score),
        isPerfect: Number(score) === 10,
        isFirstAttempt: isFirstAttempt !== undefined ? Boolean(isFirstAttempt) : true,
        retries: Number(retries) || 0
      };
      rewards = await rewardsController.processActivityReward(childId, activityResult);

      // حفظ سجل النقاط في points_history
      if (rewards && rewards.earnedPoints > 0) {
        await db.collection('points_history').add({
          childId,
          points: rewards.earnedPoints,
          type: 'activity_completion',
          activityId: activityId || null,
          activityTitle: activityTitle || 'Activity',
          score: Number(score),
          level: rewards.level,
          leveledUp: rewards.leveledUp || false,
          newBadges: rewards.newBadges || [],
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }
    } catch (rewardError) {
      console.error('Error processing activity reward:', rewardError);
      // لا نوقف الاستجابة إذا فشلت المكافآت - النتيجة محفوظة بالفعل
    }

    res.status(201).json({ logId: docRef.id, ...logData, rewards });
  } catch (error) {
    res.status(500).json({ error: t.saveResultError });
  }
};

// جلب الإحصائيات لولي الأمر
exports.getParentStats = async (req, res) => {
  const t = getMessages(req);
  try {
    // الـ route يرسل :parentId وهو معرف وثيقة familySubscriptions
    const familySubscriptionId = req.params.parentId || req.params.familySubscriptionId;
    
    // جلب الأطفال التابعين لهذا الولي (الحقل قد يكون familySubscriptionId أو subscriptionId)
    const childrenSnap = await db.collection('childrens')
      .where('familySubscriptionId', '==', familySubscriptionId).get();
    
    // إذا لم نجد أطفال بالحقل familySubscriptionId، نحاول بـ subscriptionId
    let childrenDocs = childrenSnap.docs;
    if (childrenDocs.length === 0) {
      const altSnap = await db.collection('childrens')
        .where('subscriptionId', '==', familySubscriptionId).get();
      childrenDocs = altSnap.docs;
    }
    const childIds = childrenDocs.map(doc => doc.id);
    const childrenMap = {};
    childrenDocs.forEach(doc => {
      childrenMap[doc.id] = doc.data().name;
    });

    if (childIds.length === 0) {
      return res.status(200).json({ logs: [], summary: { totalActivities: 0, avgScore: 0 } });
    }

    // جلب السجلات الخاصة بالأطفال
    const logsSnap = await db.collection('activity_logs').where('childId', 'in', childIds).get();
    let totalScore = 0;
    
    const logs = logsSnap.docs.map(doc => {
      const data = doc.data();
      totalScore += (data.score || 0);
      return {
        id: doc.id,
        childName: childrenMap[data.childId] || t.unknownChild,
        activityTitle : data.quizTitle || data.activityTitle || '',
        ...data,
        createdAt: data.createdAt ? data.createdAt.toDate() : new Date()
      };
    });

    // ترتيب السجلات بالتاريخ الأحدث أولاً
    logs.sort((a, b) => b.createdAt - a.createdAt);

    const totalActivities = logs.length;
    const avgScore = totalActivities > 0 ? (totalScore / totalActivities).toFixed(1) : 0;

    res.status(200).json({
      logs,
      summary: { totalActivities, avgScore }
    });
  } catch (error) {
    res.status(500).json({ error: t.parentStatsError });
  }
};

// جلب قائمة أبناء ولي الأمر
exports.getChildren = async (req, res) => {
  const t = getMessages(req);
  try {
    const familySubscriptionId = req.params.parentId;
    
    let childrenSnap = await db.collection('childrens')
      .where('familySubscriptionId', '==', familySubscriptionId).get();
    
    if (childrenSnap.empty) {
      childrenSnap = await db.collection('childrens')
        .where('subscriptionId', '==', familySubscriptionId).get();
    }
    
    const children = childrenSnap.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name || '',
        accessCode: data.accessCode || '',
        isActive: data.isActive !== false,
        avatar:data.avatar || null
      };
    });
    
    res.status(200).json(children);
  } catch (error) {
    res.status(500).json({ error: t.fetchChildrenError });
  }
};

// تحديث اسم و Avatar الطفل
exports.updateChildName = async (req, res) => {
  const t = getMessages(req);
  try {
    const { childId } = req.params;
    const { name, avatar } = req.body;
    
    const updateData = {};
    if (name && name.trim()) {
      updateData.name = name.trim();
    }
    if (avatar !== undefined) {
      const normalizedAvatar = avatar && typeof avatar === 'object' && avatar.style && avatar.seed
        ? { style: String(avatar.style), seed: String(avatar.seed) }
        : null;

      if (normalizedAvatar) {
        updateData.avatar = normalizedAvatar;
      }
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: t.nameRequired });
    }
    
    await db.collection('childrens').doc(childId).update(updateData);
    res.status(200).json({ success: true, ...updateData });
  } catch (error) {
    res.status(500).json({ error: t.updateNameError });
  }
};

// تحديث Avatar الطفل
exports.updateChildAvatar = async (req, res) => {
  try {
    const { childId } = req.params;
    const { avatar } = req.body;

    const normalizedAvatar = avatar && typeof avatar === 'object' && avatar.style && avatar.seed
      ? { style: String(avatar.style), seed: String(avatar.seed) }
      : null;

    if (!normalizedAvatar) {
      return res.status(400).json({ error: 'بيانات avatar غير صالحة' });
    }

    await db.collection('childrens').doc(childId).update({ avatar: normalizedAvatar });
    res.status(200).json({ success: true, avatar: normalizedAvatar });
  } catch (error) {
    res.status(500).json({ error: 'فشل في تحديث صورة الطفل' });
  }
};

// تفعيل أو تعطيل حساب الطفل
exports.toggleChildStatus = async (req, res) => {
  const t = getMessages(req);
  try {
    const { childId } = req.params;
    const { isActive } = req.body;
    
    await db.collection('childrens').doc(childId).update({ isActive: !!isActive });
    res.status(200).json({ success: true, isActive: !!isActive });
  } catch (error) {
    res.status(500).json({ error: t.updateStatusError });
  }
};

// CRUD: إضافة نشاط جديد من طرف الولي
exports.createActivity = async (req, res) => {
  const t = getMessages(req);
  try {
    const activityData = req.body;
    const docRef = await db.collection('activities').add(activityData);
    res.status(201).json({ id: docRef.id, ...activityData });
  } catch (error) {
    res.status(500).json({ error: t.createActivityError });
  }
};

// CRUD: حذف نشاط
exports.deleteActivity = async (req, res) => {
  const t = getMessages(req);
  try {
    await db.collection('activities').doc(req.params.id).delete();
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ error: t.deleteActivityError });
  }
};