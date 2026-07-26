const express = require('express');
const router = express.Router();
const { auth, admin } = require('../config/firebase');
const authController = require('../controllers/authController');
const activityController = require('../controllers/activityController');
const quizController = require('../controllers/quizController');
const rewardsController = require('../controllers/rewardsController');

// router.post('/auth/child-login', authController.loginChild);
// router.post('/auth/parent-login', authController.loginParent);
// router.get('/activities', activityController.getActivities);
// router.post('/activities/verify', activityController.verifyActivityCode);
// router.post('/activities/submit', activityController.submitActivity);
// router.get('/quizzes', quizController.getQuizzes);
// router.post('/quizzes/verify', quizController.verifyQuizCode);
// router.post('/quizzes/submit', quizController.submitQuiz);

// مسارات المصادقة
router.post('/auth/child-login', authController.loginChild);
router.post('/auth/parent-login', authController.loginParent);

// مسارات الأنشطة للطفل
router.get('/activities', activityController.getActivities);
router.post('/activities/verify', activityController.verifyActivityCode);
router.post('/activities/submit', activityController.submitActivity);

// مسارات الإختبارات للطفل
router.get('/quizzes', quizController.getQuizzes);
router.post('/quizzes/verify', quizController.verifyQuizCode);
router.post('/quizzes/submit', quizController.submitQuiz);


// مسارات الإدارة والإحصائيات لولي الأمر
router.get('/parent/stats/:parentId', activityController.getParentStats);
router.get('/parent/children/:parentId', activityController.getChildren);
router.put('/parent/children/:childId/name', activityController.updateChildName);
router.put('/parent/children/:childId/avatar', activityController.updateChildAvatar);
router.put('/parent/children/:childId/status', activityController.toggleChildStatus);
router.post('/parent/activities', activityController.createActivity);
router.delete('/parent/activities/:id', activityController.deleteActivity);

// ═══ مسارات نظام المكافآت ═════════════════════════════════════
// مسارات الطفل
router.get('/rewards/:childId', rewardsController.getChildRewards);
router.get('/rewards/:childId/history', rewardsController.getPointsHistory);
router.get('/rewards/:childId/gifts', rewardsController.getChildGifts);
router.get('/rewards/:childId/praises', rewardsController.getChildPraises);
router.post('/rewards/redeem', rewardsController.redeemGift);

// مسارات الوالد
router.post('/parent/gifts', rewardsController.createParentGift);
router.post('/parent/praise', rewardsController.sendParentPraise);
router.put('/parent/praise/:praiseId/read', rewardsController.markPraiseRead);
router.get('/parent/gifts/:parentId', rewardsController.getParentGifts);
router.put('/parent/gifts/:giftId/approve', rewardsController.approveGift);
router.delete('/parent/gifts/:giftId', rewardsController.deleteGift);
router.get('/parent/leaderboard/:familySubscriptionId', rewardsController.getLeaderboard);






// Middleware للتحقق من أن المستخدم Admin
const isAdmin = async (req, res, next) => {
  const idToken = req.headers.authorization?.split('Bearer ')[1];
  
  if (!idToken) {
    return res.status(401).json({ error: 'غير مصرح - يجب تسجيل الدخول' });
  }
  try {
    const decodedToken = await auth.verifyIdToken(idToken);
    if (decodedToken.role !== 'admin') {
      return res.status(403).json({ error: 'يجب أن تكون Admin للقيام بهذا الإجراء' });
    }
    req.user = decodedToken;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Token غير صالح أو منتهي الصلاحية' });
  }
};


// إنشاء مستخدم جديد (الإضافة الجديدة)
router.post('/create-user', isAdmin, async (req, res) => {
  const { email, password, displayName, role } = req.body;
  // التحقق من البيانات المطلوبة
  if (!email || !password || !role) {
    return res.status(400).json({ 
      error: 'يجب إدخال البريد الإلكتروني، كلمة المرور، والدور' 
    });
  }
  if (!['admin', 'school', 'student', 'parent'].includes(role)) {
    return res.status(400).json({ 
      error: 'الدور غير صالح. الخيارات المتاحة: admin, school, student, parent' 
    });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' });
  }
  try {
    // 1. إنشاء المستخدم في Firebase Authentication
    const userRecord = await auth.createUser({
      email: email,
      password: password,
      displayName: displayName || null,
      emailVerified: false
    });
    // 2. تعيين الـ Custom Claims (الدور)
    await auth.setCustomUserClaims(userRecord.uid, { role });
    // 3. (اختياري) حفظ بيانات إضافية في Firestore
    await admin.firestore().collection('users').doc(userRecord.uid).set({
      uid: userRecord.uid,
      email: email,
      displayName: displayName || null,
      role: role,
      createdAt: new Date().toISOString(),
      createdBy: req.user.uid
    });
    console.log(`✅ تم إنشاء مستخدم جديد: ${email} بدور ${role}`);
    res.status(201).json({
      success: true,
      message: `تم إنشاء المستخدم ${email} بنجاح`,
      user: {
        uid: userRecord.uid,
        email: userRecord.email,
        displayName: userRecord.displayName,
        role: role
      }
    });
  } catch (error) {
    console.error('خطأ في إنشاء المستخدم:', error);
    // معالجة الأخطاء الشائعة
    if (error.code === 'auth/email-already-exists') {
      return res.status(409).json({ error: 'البريد الإلكتروني مستخدم بالفعل' });
    }
    if (error.code === 'auth/invalid-password') {
      return res.status(400).json({ error: 'كلمة المرور ضعيفة جداً' });
    }
    res.status(500).json({ 
      error: 'حدث خطأ أثناء إنشاء المستخدم',
      details: error.message 
    });
  }
});
// تعيين Role لمستخدم موجود (السابق)
router.post('/set-role', isAdmin, async (req, res) => {
  const { uid, role } = req.body;
  if (!uid || !['admin', 'school', 'student', 'parent'].includes(role)) {
    return res.status(400).json({ error: 'uid و role صالح مطلوبان' });
  }
  try {
    await auth.setCustomUserClaims(uid, { role });
    
    // تحديث Firestore
    await admin.firestore().collection('users').doc(uid).update({
      role: role,
      updatedAt: new Date().toISOString()
    });
    res.json({ 
      success: true, 
      message: `تم تعيين الدور ${role} للمستخدم ${uid}` 
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'حدث خطأ أثناء تعيين الدور' });
  }
});
// جلب قائمة المستخدمين
router.get('/users', isAdmin, async (req, res) => {
  try {
    const listUsers = await auth.listUsers(100);
    const users = listUsers.users.map(user => ({
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      role: user.customClaims?.role || null
    }));
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
module.exports = router;