export const ROLES = Object.freeze({ STUDENT: 'student', INSTRUCTOR: 'instructor', ADMIN: 'admin' });
export const ROLE_LIST = Object.values(ROLES);

export const COURSE_STATUS = Object.freeze({
  DRAFT: 'draft',
  IN_REVIEW: 'in_review',
  PUBLISHED: 'published',
  REJECTED: 'rejected',
  ARCHIVED: 'archived',
});
export const COURSE_STATUS_LIST = Object.values(COURSE_STATUS);
/** moderation state machine; who may trigger each move is enforced in course.service */
export const COURSE_TRANSITIONS = {
  [COURSE_STATUS.DRAFT]: [COURSE_STATUS.IN_REVIEW],
  [COURSE_STATUS.IN_REVIEW]: [COURSE_STATUS.PUBLISHED, COURSE_STATUS.REJECTED, COURSE_STATUS.DRAFT],
  [COURSE_STATUS.REJECTED]: [COURSE_STATUS.IN_REVIEW, COURSE_STATUS.DRAFT],
  [COURSE_STATUS.PUBLISHED]: [COURSE_STATUS.ARCHIVED],
  [COURSE_STATUS.ARCHIVED]: [COURSE_STATUS.PUBLISHED, COURSE_STATUS.IN_REVIEW, COURSE_STATUS.DRAFT],
};
export const canMoveCourse = (from, to) => (COURSE_TRANSITIONS[from] || []).includes(to);

export const LEVELS = ['beginner', 'intermediate', 'advanced', 'all'];
export const LESSON_TYPES = ['video', 'article', 'quiz'];
export const QUESTION_TYPES = ['single', 'multiple', 'truefalse'];

export const ENROLL_STATUS = Object.freeze({ ACTIVE: 'active', COMPLETED: 'completed', REFUNDED: 'refunded', REVOKED: 'revoked' });
export const ENROLL_SOURCE = Object.freeze({ FREE: 'free', PAID: 'paid', ADMIN: 'admin' });
export const PAY_PURPOSE = Object.freeze({ COURSE: 'course' });

export const NOTIFY_TYPE = Object.freeze({
  ENROLLED: 'course.enrolled',
  COURSE_COMPLETED: 'course.completed',
  CERTIFICATE: 'certificate.issued',
  COURSE_APPROVED: 'course.approved',
  COURSE_REJECTED: 'course.rejected',
  NEW_STUDENT: 'instructor.new_student',
  NEW_QUESTION: 'thread.question',
  NEW_ANSWER: 'thread.answer',
  REFUNDED: 'payment.refunded',
  NUDGE: 'learning.nudge',
  INSTRUCTOR_APPROVED: 'instructor.approved',
});
