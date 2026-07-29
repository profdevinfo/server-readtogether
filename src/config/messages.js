// Multi-language error/success messages for the API
// Supported languages: en (default), fr, ar

const messages = {
  en: {
    codeRequired: 'Code is required',
    invalidAccessCode: 'Invalid access code',
    childNotLinked: 'Child is not linked to any family subscription',
    childNotActive: 'Child is not active',
    subscriptionNotFound: 'Family subscription not found',
    subscriptionNotActive: 'Family subscription is not active',
    subscriptionExpired: 'Family subscription has expired',
    serverError: 'An error occurred on the server during login',
    invalidParentCode: 'Invalid parent code',
    // Login attempts & account lock
    tooManyAttempts: 'Too many failed attempts. Please try again in 1 hour.',
    accountLocked: 'Your account has been locked due to too many failed attempts. Please contact support.',
    deviceBlocked: 'Too many failed attempts from this device. Please try again later.',
    attemptsRemaining: 'attempts remaining',
    // Subscription warnings
    subscriptionExpiringSoon: 'Your subscription will expire in {days} days. Please renew to keep access.',
    // activityController
    fetchActivitiesFailed: 'Failed to fetch activities',
    activityNotFound: 'Activity not found',
    wrongActivityCode: 'Wrong activity access code!',
    verifyCodeError: 'An error occurred while verifying the code',
    saveResultError: 'An error occurred while saving the result',
    parentStatsError: 'Failed to load parent statistics',
    fetchChildrenError: 'Failed to fetch children list',
    nameRequired: 'Name is required',
    updateNameError: 'Failed to update child name',
    updateStatusError: 'Failed to update child status',
    createActivityError: 'Failed to create activity',
    deleteActivityError: 'Failed to delete activity',
    unknownChild: 'Unknown child',
    motivationalSuper: 'Super hero! Your reading performance is legendary!',
    motivationalExcellent: 'Excellent! You are making great progress!',
    motivationalGood: 'Very good, keep reading to get even better!',
    motivationalRetry: 'Good try! Read the story again and try once more!',
    // quizController
    fetchQuizzesFailed: 'Failed to fetch quizzes',
    quizKeyRequired: 'Activity code is required',
    familySubscriptionIdRequired: 'Family subscription ID is required',
    quizNotFound: 'Activity not found',
    subscriptionNotFoundQuiz: 'Family subscription not found',
    subscriptionNotActiveQuiz: 'Family subscription is not active',
    quizNotLinkedToBook: 'Activity is not linked to any book',
    subscriptionNotLinkedToBookPack: 'Subscription is not linked to any book pack',
    bookPackNotFound: 'Book pack not found',
    quizNotInBookPack: 'This activity does not belong to your subscription book pack',
  },
  fr: {
    codeRequired: 'Le code est requis',
    invalidAccessCode: "Code d'accès invalide",
    childNotLinked: "L'enfant n'est lié à aucun abonnement familial",
    childNotActive: "L'enfant n'est pas actif",
    subscriptionNotFound: 'Abonnement familial introuvable',
    subscriptionNotActive: "L'abonnement familial n'est pas actif",
    subscriptionExpired: "L'abonnement familial a expiré",
    serverError: "Une erreur s'est produite sur le serveur lors de la connexion",
    invalidParentCode: 'Code parent invalide',
    // Login attempts & account lock
    tooManyAttempts: "Trop de tentatives échouées. Veuillez réessayer dans 1 heure.",
    accountLocked: "Votre compte a été verrouillé en raison de trop nombreuses tentatives échouées. Veuillez contacter le support.",
    deviceBlocked: "Trop de tentatives échouées depuis cet appareil. Veuillez réessayer plus tard.",
    attemptsRemaining: "tentatives restantes",
    // Subscription warnings
    subscriptionExpiringSoon: "Votre abonnement expirera dans {days} jours. Veuillez le renouveler pour garder l'accès.",
    // activityController
    fetchActivitiesFailed: 'Échec de la récupération des activités',
    activityNotFound: 'Activité introuvable',
    wrongActivityCode: 'Mauvais code d\'accès à l\'activité !',
    verifyCodeError: 'Une erreur est survenue lors de la vérification du code',
    saveResultError: 'Une erreur est survenue lors de l\'enregistrement du résultat',
    parentStatsError: 'Échec du chargement des statistiques parent',
    fetchChildrenError: 'Échec de la récupération de la liste des enfants',
    nameRequired: 'Le nom est requis',
    updateNameError: 'Échec de la mise à jour du nom de l\'enfant',
    updateStatusError: 'Échec de la mise à jour du statut de l\'enfant',
    createActivityError: 'Échec de la création de l\'activité',
    deleteActivityError: 'Échec de la suppression de l\'activité',
    unknownChild: 'Enfant inconnu',
    motivationalSuper: 'Super héros ! Ta performance en lecture est légendaire !',
    motivationalExcellent: 'Excellent ! Tu fais de superbes progrès !',
    motivationalGood: 'Très bien, continue à lire pour devenir encore meilleur !',
    motivationalRetry: 'Bon essai ! Relis l\'histoire et réessaie !',
    // quizController
    fetchQuizzesFailed: 'Échec de la récupération des quiz',
    quizKeyRequired: 'Le code de l\'activité est requis',
    familySubscriptionIdRequired: 'L\'identifiant d\'abonnement familial est requis',
    quizNotFound: 'Activité introuvable',
    subscriptionNotFoundQuiz: 'Abonnement familial introuvable',
    subscriptionNotActiveQuiz: "L'abonnement familial n'est pas actif",
    quizNotLinkedToBook: 'L\'activité n\'est liée à aucun livre',
    subscriptionNotLinkedToBookPack: 'L\'abonnement n\'est lié à aucune collection de livres',
    bookPackNotFound: 'Collection de livres introuvable',
    quizNotInBookPack: 'Cette activité n\'appartient pas à la collection de livres de ton abonnement',
  },
  ar: {
    codeRequired: 'الرمز مطلوب',
    invalidAccessCode: 'رمز الدخول غير صحيح',
    childNotLinked: 'الطفل غير مرتبط بأي اشتراك عائلي',
    childNotActive: 'الطفل غير مفعل',
    subscriptionNotFound: 'الاشتراك العائلي غير موجود',
    subscriptionNotActive: 'الاشتراك العائلي غير مفعل',
    subscriptionExpired: 'الاشتراك العائلي منتهي',
    serverError: 'حدث خطأ في الخادم أثناء تسجيل الدخول',
    invalidParentCode: 'رمز الولي غير صحيح',
    // Login attempts & account lock
    tooManyAttempts: 'محاولات دخول كثيرة فاشلة. يرجى المحاولة مرة أخرى بعد ساعة واحدة.',
    accountLocked: 'تم توقيف حسابك بسبب كثرة محاولات الدخول الفاشلة. يرجى التواصل مع الدعم.',
    deviceBlocked: 'محاولات كثيرة فاشلة من هذا الجهاز. يرجى المحاولة لاحقاً.',
    attemptsRemaining: 'محاولات متبقية',
    // Subscription warnings
    subscriptionExpiringSoon: 'سينتهي اشتراكك خلال {days} يومًا. يرجى التجديد للحفاظ على الوصول.',
    // activityController
    fetchActivitiesFailed: 'فشل في جلب الأنشطة',
    activityNotFound: 'النشاط غير موجود',
    wrongActivityCode: 'رمز فتح النشاط خاطئ!',
    verifyCodeError: 'حدث خطأ أثناء التحقق من الرمز',
    saveResultError: 'حدث خطأ أثناء حفظ النتيجة',
    parentStatsError: 'فشل في تحميل إحصائيات الولي',
    fetchChildrenError: 'فشل في جلب قائمة الأبناء',
    nameRequired: 'الاسم مطلوب',
    updateNameError: 'فشل في تحديث اسم الطفل',
    updateStatusError: 'فشل في تحديث حالة الطفل',
    createActivityError: 'فشل في إنشاء النشاط',
    deleteActivityError: 'فشل في حذف النشاط',
    unknownChild: 'طفل غير معروف',
    motivationalSuper: 'بطل خارق! أداؤك أسطوري في القراءة!',
    motivationalExcellent: 'ممتاز جداً! أنت تحرز تقدماً رائعاً!',
    motivationalGood: 'جيد جداً، استمر في القراءة لتصبح أفضل!',
    motivationalRetry: 'محاولة جيدة! اقرأ القصة مرة أخرى وحاول مجدداً!',
    // quizController
    fetchQuizzesFailed: 'فشل في جلب الإختبارات',
    quizKeyRequired: 'رمز النشاط مطلوب',
    familySubscriptionIdRequired: 'معرف الاشتراك العائلي مطلوب',
    quizNotFound: 'النشاط غير موجود',
    subscriptionNotFoundQuiz: 'الاشتراك العائلي غير موجود',
    subscriptionNotActiveQuiz: 'الاشتراك العائلي غير نشط',
    quizNotLinkedToBook: 'النشاط غير مرتبط بأي كتاب',
    subscriptionNotLinkedToBookPack: 'الاشتراك غير مرتبط بأي باقة كتب',
    bookPackNotFound: 'باقة الكتب غير موجودة',
    quizNotInBookPack: 'هذا النشاط لا ينتمي إلى باقة الكتب الخاصة باشتراكك',
  },
};

/**
 * Resolve the language from an Express request.
 * Priority: body.lang > query.lang > Accept-Language header > default ('en')
 * @param {import('express').Request} req
 * @returns {string} locale key ('en' | 'fr' | 'ar')
 */
function getLocale(req) {
  const supported = ['en', 'fr', 'ar'];

  // 1. Explicit lang in request body
  if (req.body && req.body.lang && supported.includes(req.body.lang)) {
    return req.body.lang;
  }

  // 2. Explicit lang in query string
  if (req.query && req.query.lang && supported.includes(req.query.lang)) {
    return req.query.lang;
  }

  // 3. Accept-Language header
  const header = req.headers['accept-language'];
  if (header) {
    const primary = header.split(',')[0].trim().split('-')[0].toLowerCase();
    if (supported.includes(primary)) {
      return primary;
    }
  }

  // 4. Fallback
  return 'en';
}

/**
 * Get the message dictionary for the request's locale.
 * @param {import('express').Request} req
 * @returns {typeof messages.en}
 */
function getMessages(req) {
  return messages[getLocale(req)] || messages.en;
}

module.exports = { messages, getLocale, getMessages };
