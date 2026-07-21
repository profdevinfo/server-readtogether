/**
 * نظام المكافآت - أنواع البيانات المشتركة
 * Rewards System - Shared Types
 */
// ── أنواع المكافآت ──────────────────────────────────────────
export const REWARD_TYPES = {
  STREAK: 'streak',           // مكافأة الانتظام (أيام متتالية)
  MASTERY: 'mastery',         // مكافأة الإتقان (نتيجة عالية)
  EFFORT: 'effort',           // مكافأة الجهد (إكمال نشاط)
  BADGE: 'badge',             // شارة إنجاز
  PARENT_GIFT: 'parent_gift', // هدية من الوالد
  LEVEL_UP: 'level_up'         // ترقية مستوى
};
// ── فئات الشارات ─────────────────────────────────────────────
export const BADGE_CATEGORIES = {
  CONSISTENCY: 'consistency',  // الانتظام
  EXCELLENCE: 'excellence',    // التميز
  EXPLORATION: 'exploration',  // الاستكشاف
  PERSISTENCE: 'persistence',  // المثابرة
  READING: 'reading'           // القراءة
};
// ── مستويات المكافآت ──────────────────────────────────────────
export const REWARD_TIERS = {
  BRONZE: 'bronze',
  SILVER: 'silver',
  GOLD: 'gold',
  PLATINUM: 'platinum'
};
// ── تعريف الشارات المتاحة ────────────────────────────────────
export const BADGES = [
  {
    id: 'first_steps',
    nameKey: 'badge.first_steps',
    descriptionKey: 'badge.first_steps_desc',
    category: BADGE_CATEGORIES.EXPLORATION,
    icon: 'mdi-foot-print',
    color: '#10B981',
    requirement: { type: 'activities_completed', value: 1 },
    points: 10
  },
  {
    id: 'bookworm',
    nameKey: 'badge.bookworm',
    descriptionKey: 'badge.bookworm_desc',
    category: BADGE_CATEGORIES.READING,
    icon: 'mdi-book-open-page-variant',
    color: '#3B82F6',
    requirement: { type: 'activities_completed', value: 10 },
    points: 50
  },
  {
    id: 'streak_3',
    nameKey: 'badge.streak_3',
    descriptionKey: 'badge.streak_3_desc',
    category: BADGE_CATEGORIES.CONSISTENCY,
    icon: 'mdi-fire',
    color: '#F59E0B',
    requirement: { type: 'streak_days', value: 3 },
    points: 30
  },
  {
    id: 'streak_7',
    nameKey: 'badge.streak_7',
    descriptionKey: 'badge.streak_7_desc',
    category: BADGE_CATEGORIES.CONSISTENCY,
    icon: 'mdi-fire-flame-circled',
    color: '#EF4444',
    requirement: { type: 'streak_days', value: 7 },
    points: 70
  },
  {
    id: 'perfect_score',
    nameKey: 'badge.perfect_score',
    descriptionKey: 'badge.perfect_score_desc',
    category: BADGE_CATEGORIES.EXCELLENCE,
    icon: 'mdi-star-circle',
    color: '#FBBF24',
    requirement: { type: 'perfect_scores', value: 1 },
    points: 40
  },
  {
    id: 'scholar',
    nameKey: 'badge.scholar',
    descriptionKey: 'badge.scholar_desc',
    category: BADGE_CATEGORIES.EXCELLENCE,
    icon: 'mdi-school',
    color: '#8B5CF6',
    requirement: { type: 'perfect_scores', value: 5 },
    points: 100
  },
  {
    id: 'persistent',
    nameKey: 'badge.persistent',
    descriptionKey: 'badge.persistent_desc',
    category: BADGE_CATEGORIES.PERSISTENCE,
    icon: 'mdi-shield-star',
    color: '#EC4899',
    requirement: { type: 'activities_completed', value: 25 },
    points: 80
  },
  {
    id: 'master_reader',
    nameKey: 'badge.master_reader',
    descriptionKey: 'badge.master_reader_desc',
    category: BADGE_CATEGORIES.READING,
    icon: 'mdi-crown',
    color: '#F59E0B',
    requirement: { type: 'activities_completed', value: 50 },
    points: 150
  }
];
// ── مستويات الطفل ─────────────────────────────────────────────
export const LEVELS = [
  { level: 1, nameKey: 'level.beginner',    minPoints: 0,    icon: 'mdi-seed',         color: '#10B981' },
  { level: 2, nameKey: 'level.explorer',    minPoints: 50,   icon: 'mdi-compass',       color: '#3B82F6' },
  { level: 3, nameKey: 'level.achiever',    minPoints: 150,  icon: 'mdi-medal',        color: '#8B5CF6' },
  { level: 4, nameKey: 'level.expert',      minPoints: 300,  icon: 'mdi-trophy',        color: '#F59E0B' },
  { level: 5, nameKey: 'level.master',      minPoints: 500,  icon: 'mdi-crown',        color: '#EF4444' },
  { level: 6, nameKey: 'level.legend',      minPoints: 800,  icon: 'mdi-diamond-stone', color: '#EC4899' }
];
// ── أنواع هدايا الوالدين ─────────────────────────────────────
export const PARENT_GIFT_TYPES = {
  SCREEN_TIME: 'screen_time',       // وقت شاشة إضافي
  BEDTIME_EXTENSION: 'bedtime',      // تمديد وقت النوم
  SPECIAL_OUTING: 'outing',          // نزهة خاصة
  CUSTOM: 'custom'                   // مخصص
};
// ── حالات هدية الوالد ────────────────────────────────────────
export const GIFT_STATUS = {
  PENDING: 'pending',     // في الانتظار
  APPROVED: 'approved',   // موافق عليها
  REDEEMED: 'redeemed',   // تم استلامها
  EXPIRED: 'expired'      // منتهية الصلاحية
};
// ── حساب النقاط لكل نشاط ─────────────────────────────────────
export const POINTS_CONFIG = {
  BASE_COMPLETION: 5,        // نقاط إكمال أي نشاط
  SCORE_MULTIPLIER: 2,       // مضاعف النتيجة (score × 2)
  STREAK_BONUS: 10,          // مكافأة الانتظام اليومي
  PERFECT_SCORE_BONUS: 15,   // مكافأة النتيجة الكاملة
  FIRST_ATTEMPT_BONUS: 5,    // مكافأة المحاولة الأولى
  EFFORT_BONUS: 5,           // مكافأة الجهد والإصرار (مثل إعادة المحاولة)
  DAILY_LIMIT: 100           // الحد الأقصى للنقاط التي يمكن جمعها يوميا
};
// ── حساب المستوى من النقاط ────────────────────────────────────
export function getLevelFromPoints(points) {
  let currentLevel = LEVELS[0];
  let nextLevel = null;
  for (let i = 0; i < LEVELS.length; i++) {
    if (points >= LEVELS[i].minPoints) {
      currentLevel = LEVELS[i];
      nextLevel = LEVELS[i + 1] || null;
    }
  }
  const progressInLevel = nextLevel
    ? points - currentLevel.minPoints
    : 0;
  const pointsForNextLevel = nextLevel
    ? nextLevel.minPoints - currentLevel.minPoints
    : 0;
  const progressPercent = nextLevel
    ? Math.min(100, Math.round((progressInLevel / pointsForNextLevel) * 100))
    : 100;
  return {
    level: currentLevel.level,
    nameKey: currentLevel.nameKey,
    icon: currentLevel.icon,
    color: currentLevel.color,
    currentPoints: points,
    pointsToNext: nextLevel ? nextLevel.minPoints - points : 0,
    progressPercent,
    nextLevel
  };
}
// ── حساب النقاط لنشاط مكتمل ───────────────────────────────────
export function calculateActivityPoints({ score, isPerfect, streakDays, isFirstAttempt, hasRetries }) {
  let points = POINTS_CONFIG.BASE_COMPLETION;
  points += score * POINTS_CONFIG.SCORE_MULTIPLIER;
  if (isPerfect) points += POINTS_CONFIG.PERFECT_SCORE_BONUS;
  if (streakDays > 0) points += POINTS_CONFIG.STREAK_BONUS;
  if (isFirstAttempt) points += POINTS_CONFIG.FIRST_ATTEMPT_BONUS;
  if (hasRetries) points += POINTS_CONFIG.EFFORT_BONUS;
  return points;
}
// ── التحقق من استحقاق شارة ───────────────────────────────────
export function checkBadgeEligibility(badge, stats) {
  const { type, value } = badge.requirement;
  switch (type) {
    case 'activities_completed':
      return stats.activitiesCompleted >= value;
    case 'streak_days':
      return stats.currentStreak >= value;
    case 'perfect_scores':
      return stats.perfectScores >= value;
    default:
      return false;
  }
}