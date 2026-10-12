import test from 'node:test';
import assert from 'node:assert/strict';
import { COURSE_STATUS as S, COURSE_STATUS_LIST, COURSE_TRANSITIONS, canMoveCourse } from '../../src/utils/constants.js';
import { detectVideoProvider } from '../../src/utils/video.js';
import { safeUrl, normalizeLinks } from '../../src/utils/links.js';
import { slugify, formatDuration } from '../../src/utils/helpers.js';

test('every course status has transitions that point at real statuses', () => {
  for (const s of COURSE_STATUS_LIST) {
    assert.ok(COURSE_TRANSITIONS[s], `missing ${s}`);
    for (const t of COURSE_TRANSITIONS[s]) assert.ok(COURSE_STATUS_LIST.includes(t));
  }
});
test('moderation flow: draft -> review -> published; published cannot go back to review', () => {
  assert.ok(canMoveCourse(S.DRAFT, S.IN_REVIEW));
  assert.ok(canMoveCourse(S.IN_REVIEW, S.PUBLISHED));
  assert.ok(canMoveCourse(S.IN_REVIEW, S.REJECTED));
  assert.ok(!canMoveCourse(S.DRAFT, S.PUBLISHED));
  assert.ok(!canMoveCourse(S.PUBLISHED, S.IN_REVIEW));
  assert.ok(canMoveCourse(S.ARCHIVED, S.IN_REVIEW));
});
test('video provider detection', () => {
  assert.equal(detectVideoProvider('https://www.youtube.com/watch?v=abc'), 'youtube');
  assert.equal(detectVideoProvider('https://youtu.be/abc'), 'youtube');
  assert.equal(detectVideoProvider('https://vimeo.com/123'), 'vimeo');
  assert.equal(detectVideoProvider('https://cdn.x/y/index.m3u8?t=1'), 'hls');
  assert.equal(detectVideoProvider('https://cdn.x/a.mp4'), 'file');
  assert.equal(detectVideoProvider(''), null);
});
test('profile links only allow http(s)', () => {
  assert.equal(safeUrl('javascript:alert(1)'), undefined);
  assert.equal(safeUrl('not a url'), undefined);
  assert.equal(safeUrl('https://example.com/a'), 'https://example.com/a');
  assert.equal(normalizeLinks({ website: 'data:text/html,x', github: 'https://github.com/u' }).website, undefined);
});
test('slugify and duration formatting', () => {
  assert.equal(slugify('React 18: Build Apps!'), 'react-18-build-apps');
  assert.equal(formatDuration(3720), '1h 2m');
  assert.equal(formatDuration(300), '5m');
});
