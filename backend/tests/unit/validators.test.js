import test from 'node:test';
import assert from 'node:assert/strict';
import * as av from '../../src/validators/auth.validator.js';
import * as cv from '../../src/validators/course.validator.js';
import * as adm from '../../src/validators/admin.validator.js';
import * as lv from '../../src/validators/learning.validator.js';

const id = 'a'.repeat(24);

test('register lowercases email and enforces password strength', () => {
  assert.equal(av.register.parse({ name: 'Asha', email: 'ASHA@Example.com', password: 'abcd1234' }).email, 'asha@example.com');
  assert.throws(() => av.register.parse({ name: 'Asha', email: 'a@b.co', password: 'short1' }));
  assert.throws(() => av.register.parse({ name: 'Asha', email: 'a@b.co', password: 'onlyletters' }));
});
test('lesson body: video url must be a real url, defaults to video', () => {
  assert.equal(cv.createLesson.parse({ title: 'Intro' }).type, 'video');
  assert.throws(() => cv.createLesson.parse({ title: 'Intro', videoUrl: 'javascript:alert(1)' }));
  assert.doesNotThrow(() => cv.createLesson.parse({ title: 'Intro', videoUrl: 'https://cdn.example.com/a.mp4' }));
});
test('quiz body requires at least two options per question', () => {
  const q = { text: 'Pick one', options: [{ text: 'A', correct: true }] };
  assert.throws(() => cv.quizBody.parse({ questions: [q] }));
  const ok = cv.quizBody.parse({ questions: [{ ...q, options: [{ text: 'A', correct: true }, { text: 'B' }] }] });
  assert.equal(ok.passPercent, 60);
  assert.equal(ok.questions[0].options[1].correct, false);
});
test('course review decision: rejection needs a reason', () => {
  assert.throws(() => cv.review.parse({ decision: 'reject' }));
  assert.doesNotThrow(() => cv.review.parse({ decision: 'reject', reason: 'Audio is too quiet' }));
  assert.doesNotThrow(() => cv.review.parse({ decision: 'approve' }));
});
test('coupon body', () => {
  assert.throws(() => adm.couponBody.parse({ code: 'bad code!', type: 'percent', value: 10 }));
  const c = adm.couponBody.parse({ code: 'SAVE-10', type: 'percent', value: '10' });
  assert.equal(c.value, 10);
  assert.equal(c.maxUses, 0);
});
test('quiz attempt payload validates ids', () => {
  assert.throws(() => lv.attempt.parse({ answers: [{ question: 'nope', selected: [] }] }));
  assert.doesNotThrow(() => lv.attempt.parse({ answers: [{ question: id, selected: [id] }] }));
});
test('settings are partial and bounded', () => {
  assert.doesNotThrow(() => adm.settings.parse({ gstPercent: 18 }));
  assert.throws(() => adm.settings.parse({ platformFeePercent: 95 }));
});
