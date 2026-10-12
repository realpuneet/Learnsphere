import { asyncHandler } from '../utils/asyncHandler.js';
import { created, noContent, ok } from '../utils/ApiResponse.js';
import * as courses from '../services/course.service.js';
import * as enroll from '../services/enrollment.service.js';
import { instructorDashboard } from '../services/analytics.service.js';

export const dashboard = asyncHandler(async (req, res) => ok(res, await instructorDashboard(req.user._id)));
export const list = asyncHandler(async (req, res) => {
  const r = await courses.listMine(req.user, req.query);
  return ok(res, r.items, 'OK', r.meta);
});
export const create = asyncHandler(async (req, res) => created(res, await courses.create(req.user, req.body), 'Draft created'));
export const get = asyncHandler(async (req, res) => ok(res, await courses.getForEdit(req.user, req.params.id)));
export const update = asyncHandler(async (req, res) => ok(res, await courses.update(req.user, req.params.id, req.body), 'Saved'));
export const remove = asyncHandler(async (req, res) => {
  await courses.remove(req.user, req.params.id);
  return noContent(res);
});
export const submit = asyncHandler(async (req, res) => ok(res, await courses.submit(req.user, req.params.id), 'Submitted'));
export const archive = asyncHandler(async (req, res) => ok(res, await courses.archive(req.user, req.params.id), 'Archived'));

export const addSection = asyncHandler(async (req, res) => created(res, await courses.addSection(req.user, req.params.id, req.body)));
export const updateSection = asyncHandler(async (req, res) => ok(res, await courses.updateSection(req.user, req.params.id, req.params.sectionId, req.body)));
export const deleteSection = asyncHandler(async (req, res) => {
  await courses.deleteSection(req.user, req.params.id, req.params.sectionId);
  return noContent(res);
});
export const reorderSections = asyncHandler(async (req, res) => ok(res, await courses.reorderSections(req.user, req.params.id, req.body.ids)));

export const addLesson = asyncHandler(async (req, res) => created(res, await courses.addLesson(req.user, req.params.id, req.params.sectionId, req.body)));
export const reorderLessons = asyncHandler(async (req, res) => {
  await courses.reorderLessons(req.user, req.params.id, req.params.sectionId, req.body.ids);
  return noContent(res);
});
export const updateLesson = asyncHandler(async (req, res) => ok(res, await courses.updateLesson(req.user, req.params.lessonId, req.body)));
export const deleteLesson = asyncHandler(async (req, res) => {
  await courses.deleteLesson(req.user, req.params.lessonId);
  return noContent(res);
});
export const getQuiz = asyncHandler(async (req, res) => ok(res, await courses.getQuizForEdit(req.user, req.params.lessonId)));
export const putQuiz = asyncHandler(async (req, res) => ok(res, await courses.upsertQuiz(req.user, req.params.lessonId, req.body), 'Quiz saved'));

export const students = asyncHandler(async (req, res) => {
  const r = await enroll.studentsOf(req.user, req.params.id, req.query);
  return ok(res, r.items, 'OK', r.meta);
});
