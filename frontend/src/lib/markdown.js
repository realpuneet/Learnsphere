/**
 * Tiny, dependency-free, XSS-safe markdown parser for lesson notes.
 * Produces an AST (never HTML strings) so React renders text nodes only; links are limited to http(s)/mailto.
 *
 * Blocks: # headings, ``` code ```, - / * / 1. lists, > quotes, --- rules, paragraphs.
 * Inline: `code`, **bold**, *italic*, [text](url).
 */

export const safeHref = (u = '') => {
  try {
    const url = new URL(u, 'https://placeholder.invalid');
    return ['http:', 'https:', 'mailto:'].includes(url.protocol) && !u.startsWith('//') ? u : null;
  } catch {
    return null;
  }
};

const INLINE = /(`[^`\n]+`)|(\*\*[^*\n]+\*\*)|(\*[^*\n]+\*)|(\[[^\]\n]+\]\([^()\s]*(?:\([^()\s]*\)[^()\s]*)*\))/;

export function parseInline(text = '') {
  const out = [];
  let rest = text;
  while (rest) {
    const m = INLINE.exec(rest);
    if (!m) {
      out.push({ t: 'text', v: rest });
      break;
    }
    if (m.index > 0) out.push({ t: 'text', v: rest.slice(0, m.index) });
    const tok = m[0];
    if (m[1]) out.push({ t: 'code', v: tok.slice(1, -1) });
    else if (m[2]) out.push({ t: 'strong', children: parseInline(tok.slice(2, -2)) });
    else if (m[3]) out.push({ t: 'em', children: parseInline(tok.slice(1, -1)) });
    else {
      const [, label, href] = /^\[([^\]]+)\]\((.+)\)$/.exec(tok);
      const safe = safeHref(href);
      out.push(safe ? { t: 'link', href: safe, children: parseInline(label) } : { t: 'text', v: label });
    }
    rest = rest.slice(m.index + tok.length);
  }
  return out;
}

export function parseMarkdown(src = '') {
  const lines = String(src).replace(/\r\n?/g, '\n').split('\n');
  const blocks = [];
  let i = 0;
  const isBlockStart = (l) => /^(#{1,3}\s|```|[-*]\s|\d+\.\s|>\s?|---+\s*$)/.test(l);

  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }

    if (line.startsWith('```')) {
      const lang = line.slice(3).trim();
      const code = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) code.push(lines[i++]);
      i++; // closing fence (or EOF)
      blocks.push({ type: 'code', lang, text: code.join('\n') });
      continue;
    }
    const h = /^(#{1,3})\s+(.*)$/.exec(line);
    if (h) { blocks.push({ type: 'heading', level: h[1].length, children: parseInline(h[2]) }); i++; continue; }
    if (/^---+\s*$/.test(line)) { blocks.push({ type: 'hr' }); i++; continue; }
    if (/^>\s?/.test(line)) {
      const q = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) q.push(lines[i++].replace(/^>\s?/, ''));
      blocks.push({ type: 'quote', children: parseInline(q.join(' ')) });
      continue;
    }
    const ul = /^[-*]\s+/.test(line);
    const ol = /^\d+\.\s+/.test(line);
    if (ul || ol) {
      const re = ul ? /^[-*]\s+/ : /^\d+\.\s+/;
      const items = [];
      while (i < lines.length && re.test(lines[i])) items.push(parseInline(lines[i++].replace(re, '')));
      blocks.push({ type: ul ? 'ul' : 'ol', items });
      continue;
    }
    const para = [line];
    i++;
    while (i < lines.length && lines[i].trim() && !isBlockStart(lines[i])) para.push(lines[i++]);
    blocks.push({ type: 'p', children: parseInline(para.join(' ')) });
  }
  return blocks;
}
