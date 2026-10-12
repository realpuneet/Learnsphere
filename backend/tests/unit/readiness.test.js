import test from 'node:test';
import assert from 'node:assert/strict';
import { courseReadiness, validateQuestions } from '../../src/utils/readiness.js';

const base = () => ({ title: 'A fine title', description: 'x'.repeat(60), category: 'c1', thumbnail: 'https://img', outcomes: ['learn'], sections: [{ _id: 's1' }] });

test('a complete course has nothing missing', () => {
  assert.deepEqual(courseReadiness(base(), [{ _id: 'l1', section: 's1', type: 'video', videoUrl: 'https://v', title: 'L' }]), []);
});
test('reports every missing piece', () => {
  const missing = courseReadiness({ title: 'x', sections: [] }, []);
  assert.ok(missing.length >= 6);
});
test('empty sections and incomplete lessons are flagged', () => {
  const c = { ...base(), sections: [{ _id: 's1' }, { _id: 's2' }] };
  const m = courseReadiness(c, [{ _id: 'l1', section: 's1', type: 'video', title: 'No video' }, { _id: 'l2', section: 's1', type: 'article', title: 'Empty', content: ' ' }, { _id: 'l3', section: 's1', type: 'quiz', title: 'Quiz' }]);
  assert.ok(m.some((x) => /empty sections/i.test(x)));
  assert.ok(m.some((x) => /needs a video/.test(x)));
  assert.ok(m.some((x) => /needs content/.test(x)));
  assert.ok(m.some((x) => /no questions/.test(x)));
});
test('quiz questions: single needs exactly one correct option', () => {
  const opt = (c) => ({ text: Math.random().toString(), correct: c });
  assert.match(validateQuestions([{ type: 'single', options: [opt(true), opt(true)] }]), /exactly one/);
  assert.match(validateQuestions([{ type: 'single', options: [opt(false), opt(false)] }]), /at least one correct/);
  assert.equal(validateQuestions([{ type: 'multiple', options: [opt(true), opt(true), opt(false)] }]), null);
  assert.match(validateQuestions([{ type: 'single', options: [{ text: 'Same', correct: true }, { text: 'same', correct: false }] }]), /different/);
});
