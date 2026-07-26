const { db, admin } = require('../config/firebase');
const { getMessages } = require('../config/messages');
const rewardsController = require('./rewardsController');

// جلب جميع الإختبارات المتاحة للطفل
exports.getQuizzes = async (req, res) => {
  const t = getMessages(req);
  try {
    const snapshot = await db.collection('quizzes').get();
    const quizzes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.status(200).json(quizzes);
  } catch (error) {
    res.status(500).json({ error: t.fetchQuizzesFailed });
  }
};

// التحقق من كود الاختبار وفتحه للطفل إذا كان داخل باقة الكتب الخاصة بالاشتراك
exports.verifyQuizCode = async (req, res) => {
  const t = getMessages(req);
  try {
    const quizKey = req.body.quizKey ?? req.body.quizCode ?? req.body.code ?? req.body.accessCode;
    const familySubscriptionId = req.body.familySubscriptionId ?? req.body.subscriptionId;

    if (!quizKey || !String(quizKey).trim()) {
      return res.status(400).json({ error: t.quizKeyRequired });
    }
    if (!familySubscriptionId) {
      return res.status(400).json({ error: t.familySubscriptionIdRequired });
    }

    // const normalizedCode = String(quizCode).trim();
    // let quizSnapshot = await db.collection('quizzes').where('quizKey', '==', normalizedCode).limit(1).get();

    const quizSnapshot = await db.collection('quizzes')
      .where('quizKey', '==', quizKey.trim())
      .limit(1)
      .get();

    if (quizSnapshot.empty) {
      return res.status(404).json({ error: t.quizNotFound });
    }

    const quizDoc = quizSnapshot.docs[0];
    const quizData = quizDoc.data();
    const quiz = { id: quizDoc.id, ...quizData };

    const subDoc = await db.collection('familySubscriptions').doc(familySubscriptionId).get();
    if (!subDoc.exists) {
      return res.status(404).json({ error: t.subscriptionNotFoundQuiz });
    }

    const familySubscriptionData = subDoc.data();
    if (familySubscriptionData.status !== 'active') {
      return res.status(403).json({ error: t.subscriptionNotActiveQuiz });
    }

     const quizBookId = quizData.bookId;
    if (!quizBookId) {
      return res.status(403).json({ error: t.quizNotLinkedToBook });
    }

    const booksPackId = familySubscriptionData.booksPackId
    if (!booksPackId) {
      return res.status(403).json({ error: t.subscriptionNotLinkedToBookPack });
    }

    const packDoc = await db.collection('booksPacks').doc(booksPackId).get();
    if (!packDoc.exists) {
      return res.status(403).json({ error: t.bookPackNotFound });
    }
    const packData = packDoc.data();

    // 8. التحقق من أن كتاب النشاط موجود ضمن باقة الكتب
    const packBooksIds = packData.bookIds || [];
    if (!packBooksIds.includes(quiz.bookId)) {
      return res.status(403).json({ error: t.quizNotInBookPack });
    }

    res.status(200).json({ success: true, quiz });
  } catch (error) {
    console.error('Error verifying quiz code:', error );
    res.status(500).json({ error: t.verifyCodeError });
  }
};

// إرسال نتيجة اختبار وحفظها في childresults مع الحفاظ على السجل العام
exports.submitQuiz = async (req, res) => {
  const t = getMessages(req);
  try {
    const { childId, quizId, activityId, quizTitle, activityTitle, score, duration, language, isFirstAttempt, retries } = req.body;

    if (!childId) {
      return res.status(400).json({ error: 'childId is required' });
    }

    let motivationalQuote = '';
    if (Number(score) >= 9) motivationalQuote = t.motivationalSuper;
    else if (Number(score) >= 7) motivationalQuote = t.motivationalExcellent;
    else if (Number(score) >= 5) motivationalQuote = t.motivationalGood;
    else motivationalQuote = t.motivationalRetry;

    const payload = {
      childId,
      quizId: quizId || activityId || null,
      quizTitle: quizTitle || activityTitle || 'Quiz',
      score: Number(score),
      duration: Number(duration),
      language: language || 'en',
      motivationalQuote,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };

    const resultRef = await db.collection('childresults').add(payload);
    await db.collection('activity_logs').add({ ...payload, resultId: resultRef.id });

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
          reason: 'activity_completion',
          activityId: quizId || activityId || null,
          activityTitle: quizTitle || activityTitle || 'Quiz',
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

    res.status(201).json({ resultId: resultRef.id, ...payload, rewards });
  } catch (error) {
    console.error('Error saving quiz result:', error);
    res.status(500).json({ error: t.saveResultError });
  }
};

// جلب الإحصائيات لولي الأمر
exports.getParentStats = async (req, res) => {
  const t = getMessages(req);
  try {
    const { parentId } = req.params;
    
    // جلب الأطفال التابعين لهذا الولي
    const childrenSnap = await db.collection('children').where('parentId', '==', parentId).get();
    const childIds = childrenSnap.docs.map(doc => doc.id);
    const childrenMap = {};
    childrenSnap.docs.forEach(doc => {
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

// CRUD: إضافة نشاط جديد من طرف الولي
exports.createActivity = async (req, res) => {
  const t = getMessages(req);
  try {
    const activityData = req.body;
    const docRef = await db.collection('quizzes').add(activityData);
    res.status(201).json({ id: docRef.id, ...activityData });
  } catch (error) {
    res.status(500).json({ error: t.createActivityError });
  }
};

// CRUD: حذف نشاط
exports.deleteActivity = async (req, res) => {
  const t = getMessages(req);
  try {
    await db.collection('quizzes').doc(req.params.id).delete();
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ error: t.deleteActivityError });
  }
};