import { createElement } from 'react';
import { parseMarkdown } from '../../lib/markdown.js';

const Inline = ({ nodes }) =>
  nodes.map((n, i) => {
    if (n.t === 'text') return n.v;
    if (n.t === 'code') return <code key={i} className="rounded bg-ink-100 px-1.5 py-0.5 text-[0.9em] text-brand-800">{n.v}</code>;
    if (n.t === 'strong') return <strong key={i}><Inline nodes={n.children} /></strong>;
    if (n.t === 'em') return <em key={i}><Inline nodes={n.children} /></em>;
    if (n.t === 'link') return <a key={i} href={n.href} target="_blank" rel="noopener noreferrer nofollow" className="font-medium text-brand-600 underline underline-offset-2"><Inline nodes={n.children} /></a>;
    return null;
  });

const HEADING = { 1: 'mt-6 text-2xl font-extrabold', 2: 'mt-5 text-xl font-bold', 3: 'mt-4 text-lg font-bold' };

/** Renders lesson markdown through a parser that emits an AST – no dangerouslySetInnerHTML anywhere. */
export function Markdown({ source, className = '' }) {
  const blocks = parseMarkdown(source);
  return (
    <div className={`space-y-3 leading-relaxed text-ink-700 ${className}`}>
      {blocks.map((b, i) => {
        switch (b.type) {
          case 'heading': return createElement(`h${b.level + 1}`, { key: i, className: `font-display text-ink-900 ${HEADING[b.level]}` }, <Inline nodes={b.children} />);
          case 'p': return <p key={i}><Inline nodes={b.children} /></p>;
          case 'ul': return <ul key={i} className="list-disc space-y-1 pl-6">{b.items.map((it, j) => <li key={j}><Inline nodes={it} /></li>)}</ul>;
          case 'ol': return <ol key={i} className="list-decimal space-y-1 pl-6">{b.items.map((it, j) => <li key={j}><Inline nodes={it} /></li>)}</ol>;
          case 'quote': return <blockquote key={i} className="border-l-4 border-brand-300 bg-brand-50/60 py-2 pl-4 italic"><Inline nodes={b.children} /></blockquote>;
          case 'code': return <pre key={i} className="overflow-x-auto rounded-xl bg-ink-900 p-4 text-sm text-ink-50"><code>{b.text}</code></pre>;
          case 'hr': return <hr key={i} className="border-ink-200" />;
          default: return null;
        }
      })}
    </div>
  );
}
