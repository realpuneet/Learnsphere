import test from 'node:test';
import assert from 'node:assert/strict';
import { parseMarkdown, parseInline, safeHref } from '../src/lib/markdown.js';

test('headings, paragraphs and lists', () => {
  const b = parseMarkdown('# Title\n\nSome **bold** text\n\n- one\n- two\n\n1. first\n2. second');
  assert.deepEqual(b.map((x) => x.type), ['heading', 'p', 'ul', 'ol']);
  assert.equal(b[0].level, 1);
  assert.equal(b[2].items.length, 2);
  assert.ok(b[1].children.some((c) => c.t === 'strong'));
});
test('fenced code is kept verbatim and not parsed as markdown', () => {
  const b = parseMarkdown('```js\nconst a = **1**;\n# not a heading\n```');
  assert.equal(b.length, 1);
  assert.equal(b[0].type, 'code');
  assert.equal(b[0].text, 'const a = **1**;\n# not a heading');
});
test('unterminated fence does not hang or drop content', () => {
  const b = parseMarkdown('```\nopen forever');
  assert.equal(b[0].text, 'open forever');
});
test('javascript: / data: links are neutralised (XSS)', () => {
  assert.equal(safeHref('javascript:alert(1)'), null);
  assert.equal(safeHref('data:text/html,<script>'), null);
  assert.equal(safeHref('//evil.example/x'), null);
  assert.equal(safeHref('https://ok.example/a'), 'https://ok.example/a');
  const t = parseInline('[click](javascript:alert(1))');
  assert.deepEqual(t, [{ t: 'text', v: 'click' }]);
});
test('raw HTML is never interpreted – it stays plain text', () => {
  const b = parseMarkdown('<img src=x onerror=alert(1)>');
  assert.equal(b[0].children[0].t, 'text');
  assert.equal(b[0].children[0].v, '<img src=x onerror=alert(1)>');
});
test('inline code, emphasis and links', () => {
  const t = parseInline('use `npm i` and *care* with [docs](https://a.dev)');
  assert.deepEqual(t.map((x) => x.t), ['text', 'code', 'text', 'em', 'text', 'link']);
});
test('blockquote and horizontal rule', () => {
  const b = parseMarkdown('> wise words\n\n---');
  assert.deepEqual(b.map((x) => x.type), ['quote', 'hr']);
});
