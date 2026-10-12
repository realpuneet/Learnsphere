import test from 'node:test';
import assert from 'node:assert/strict';
import { gradeQuiz, nextLessonId, percentComplete } from '../../src/utils/progress.js';

const ids = (n) => Array.from({ length: n }, (_, i) => `l${i + 1}`);

test('percentComplete floors and ignores unknown ids', () => {
  assert.equal(percentComplete(ids(3), ['l1']), 33);
  assert.equal(percentComplete(ids(3), ['l1', 'l2', 'l3']), 100);
  assert.equal(percentComplete(ids(3), ['zzz']), 0);
  assert.equal(percentComplete([], ['l1']), 0);
});
test('percentComplete does not double count duplicates', () => {
  assert.equal(percentComplete(ids(4), ['l1', 'l1', 'l1']), 25);
});
test('nextLessonId resumes at the first incomplete lesson', () => {
  assert.equal(nextLessonId(ids(3), ['l1']), 'l2');
  assert.equal(nextLessonId(ids(3), ['l1', 'l2', 'l3']), 'l1');
  assert.equal(nextLessonId([], []), null);
});

const questions = [
  { _id: 'q1', type: 'single', points: 1, options: [{ _id: 'a', correct: false }, { _id: 'b', correct: true }] },
  { _id: 'q2', type: 'multiple', points: 2, options: [{ _id: 'c', correct: true }, { _id: 'd', correct: true }, { _id: 'e', correct: false }] },
];
test('gradeQuiz: all correct = 100%', () => {
  const g = gradeQuiz(questions, [{ question: 'q1', selected: ['b'] }, { question: 'q2', selected: ['c', 'd'] }]);
  assert.deepEqual([g.points, g.total, g.scorePct], [3, 3, 100]);
});
test('gradeQuiz: multiple-choice is all-or-nothing (no partial credit for guessing everything)', () => {
  const g = gradeQuiz(questions, [{ question: 'q1', selected: ['b'] }, { question: 'q2', selected: ['c', 'd', 'e'] }]);
  assert.equal(g.points, 1);
  assert.equal(g.perQuestion[1].correct, false);
});
test('gradeQuiz: unanswered questions score zero', () => {
  const g = gradeQuiz(questions, []);
  assert.equal(g.scorePct, 0);
});
test('gradeQuiz weights by points', () => {
  const g = gradeQuiz(questions, [{ question: 'q2', selected: ['d', 'c'] }]);
  assert.equal(g.scorePct, 67);
});
