// What the editor's buttons do to the text. A second press always takes back the first one.
// Every function takes and returns { lines, from, to }: the text and the selection ({ line, ch }, equal for a cursor).
import { textBlocks, takeAlignMark } from './lib.js';

const same = (a, b) => a.line === b.line && a.ch === b.ch;
const replaceLine = (lines, i, text) => lines.map((l, n) => (n === i ? text : l));

// ---------- Bold, italic, inline code ----------
const runBefore = (text, i, c) => { let n = 0; while (i - n > 0 && text[i - n - 1] === c) n += 1; return n; };
const runAfter = (text, i, c) => { let n = 0; while (i + n < text.length && text[i + n] === c) n += 1; return n; };

/** Does a run of signs (one = italic, two = bold, three = both) contain this sign? */
const holds = (run, sign) => (sign.length === 2 ? run >= 2 : run % 2 === 1);

/** The pair of this sign around a place in a line: { open, close } are the places of the two signs. */
function pairAround(text, from, to, sign) {
  const c = sign[0];
  let open = null;
  for (let i = 0; i < text.length;) {
    if (text[i] !== c) { i += 1; continue; }
    const n = runAfter(text, i, c);
    const end = i + n;
    if (holds(n, sign)) {
      if (open !== null && i > 0 && !/\s/.test(text[i - 1])) {
        if (open <= from && i >= to) return { open: open - sign.length, close: i };
        open = null;
      } else if (end < text.length && !/\s/.test(text[end])) open = end;
    }
    i = end;
  }
  return null;
}

function removePair(text, { open, close }, sign) {
  return text.slice(0, open) + text.slice(open + sign.length, close) + text.slice(close + sign.length);
}

/** One line: new text and new selection. */
function inlineOnLine(text, from, to, sign) {
  const n = sign.length;
  const c = sign[0];
  const around = Math.min(runBefore(text, from, c), runAfter(text, to, c));
  if (holds(around, sign)) return [removePair(text, { open: from - n, close: to }, sign), from - n, to - n];
  if (from !== to) {
    const inside = Math.min(runAfter(text, from, c), runBefore(text, to, c));
    if (holds(inside, sign) && to - from > 2 * n) return [removePair(text, { open: from, close: to - n }, sign), from, to - 2 * n];
  }
  for (const s of c === '*' ? [sign, '_'.repeat(n)] : [sign]) {
    const pair = pairAround(text, from, to, s);
    if (pair) return [removePair(text, pair, s), from - n, to - n];
  }
  return [text.slice(0, from) + sign + text.slice(from, to) + sign + text.slice(to), from + n, to + n];
}

/** The text of every chosen line: without list and heading signs, alignment words, and spaces at the ends. */
function chosenParts({ lines, from, to }) {
  const parts = [];
  for (const block of textBlocks(lines)) {
    for (let i = Math.max(block.start, from.line); i <= Math.min(block.end, to.line); i += 1) {
      const line = lines[i];
      let start = i === block.start ? block.at : /^[ \t>]*/.exec(line)[0].length;
      const mark = takeAlignMark(line.slice(start));
      if (mark && i === block.start) start = line.length - mark.rest.length;
      let a = i === from.line ? Math.max(start, from.ch) : start;
      let b = i === to.line ? to.ch : line.length;
      while (a < b && /\s/.test(line[a])) a += 1;
      while (b > a && /\s/.test(line[b - 1])) b -= 1;
      if (b > a) parts.push({ line: i, a, b });
    }
  }
  return parts;
}

export function toggleInline(state, sign) {
  const { lines, from, to } = state;
  if (same(from, to) || from.line === to.line) {
    const line = lines[from.line];
    let [a, b] = [from.ch, to.ch];
    while (a < b && /\s/.test(line[a])) a += 1;
    while (b > a && /\s/.test(line[b - 1])) b -= 1;
    if (a === b && from.ch !== to.ch) return state; // only spaces
    const [text, x, y] = inlineOnLine(line, a, b, sign);
    return { lines: replaceLine(lines, from.line, text), from: { line: from.line, ch: x }, to: { line: from.line, ch: y } };
  }
  const n = sign.length;
  const parts = chosenParts(state);
  const inside = ({ line, a, b }) => holds(Math.min(runAfter(lines[line], a, sign[0]), runBefore(lines[line], b, sign[0])), sign) && b - a > 2 * n;
  const off = parts.length > 0 && parts.every(inside);
  let out = lines;
  for (const part of parts) {
    if (!off && inside(part)) continue;
    const text = lines[part.line];
    const middle = text.slice(part.a, part.b);
    out = replaceLine(out, part.line, text.slice(0, part.a) + (off ? middle.slice(n, -n) : sign + middle + sign) + text.slice(part.b));
  }
  const first = parts.find((p) => p.line === from.line);
  const last = parts.find((p) => p.line === to.line);
  return {
    lines: out,
    from: first ? { line: from.line, ch: Math.min(from.ch, first.a) } : from,
    to: last ? { line: to.line, ch: to.ch + out[to.line].length - lines[to.line].length } : to,
  };
}

// ---------- Quote and lists ----------
const QUOTE = /^[ \t]{0,3}>[ \t]?/;
const LIST = { ul: /^([ \t]*)[-*+][ \t]+/, ol: /^([ \t]*)\d{1,9}[.)][ \t]+/ };

/** Place where list signs of a line begin: after quote signs. */
function afterQuotes(line) {
  let at = 0;
  for (let m; (m = QUOTE.exec(line.slice(at))); ) at += m[0].length;
  return at;
}

export function toggleLines(state, kind) {
  const { lines, from, to } = state;
  const last = to.line > from.line && to.ch === 0 ? to.line - 1 : to.line;
  const all = Array.from({ length: last - from.line + 1 }, (_, i) => from.line + i);
  const filled = all.filter((i) => lines[i].trim());
  const chosen = filled.length ? filled : [from.line];
  const has = (line) => (kind === 'quote' ? QUOTE.test(line) : LIST[kind].test(line.slice(afterQuotes(line))));
  const off = chosen.every((i) => has(lines[i]));
  const out = [...lines];
  let number = 0;
  for (const i of chosen) {
    const line = lines[i];
    if (kind === 'quote') {
      if (off) out[i] = line.replace(QUOTE, '');
      else if (!has(line)) out[i] = `> ${line}`;
      continue;
    }
    const at = afterQuotes(line);
    const rest = line.slice(at);
    const bare = rest.replace(LIST.ul, '$1').replace(LIST.ol, '$1');
    const indent = /^[ \t]*/.exec(bare)[0];
    number += 1;
    out[i] = line.slice(0, at) + (off ? bare : `${indent}${kind === 'ul' ? '* ' : `${number}. `}${bare.slice(indent.length)}`);
  }
  // The cursor stays at the same letter; a selection that began at the start of its line still does.
  const move = (p, isStart) => {
    if (out[p.line] === lines[p.line]) return p;
    if (isStart && p.ch === 0) return p;
    const fromEnd = lines[p.line].length - p.ch;
    return { line: p.line, ch: Math.max(0, out[p.line].length - fromEnd) };
  };
  return same(from, to)
    ? { lines: out, from: move(from, lines[from.line] !== ''), to: move(from, lines[from.line] !== '') }
    : { lines: out, from: move(from, true), to: move(to, false) };
}

// ---------- Code ----------
/** Code blocks: first and last line (no last line if it was never closed). */
function codeBlocks(lines) {
  const found = [];
  let open = null;
  lines.forEach((line, i) => {
    const m = /^[ \t]{0,3}(`{3,}|~{3,})(.*)$/.exec(line);
    if (!m) return;
    if (!open) open = { start: i, sign: m[1] };
    else if (m[1].startsWith(open.sign) && !m[2].trim()) { found.push({ start: open.start, end: i }); open = null; }
  });
  if (open) found.push({ start: open.start, end: null });
  return found;
}

export function toggleCode(state) {
  const { lines, from, to } = state;
  const block = codeBlocks(lines).find((b) => b.start <= from.line && (b.end === null || to.line <= b.end));
  if (block) {
    const out = lines.filter((_, i) => i !== block.start && i !== block.end);
    const lastLine = (block.end ?? lines.length) - 2; // last line of the content, after the first sign line is gone
    const move = (p, isEnd) => {
      if (p.line === block.start) return { line: Math.min(block.start, out.length - 1), ch: 0 };
      if (p.line === block.end) return lastLine < block.start ? { line: Math.min(block.start, out.length - 1), ch: 0 } : { line: lastLine, ch: isEnd ? out[lastLine].length : 0 };
      return { line: p.line - 1, ch: p.ch };
    };
    if (!out.length) out.push('');
    return { lines: out, from: move(from, false), to: move(to, true) };
  }
  if (from.line === to.line && lines[from.line].trim()) return toggleInline(state, '`');
  const out = [...lines.slice(0, from.line), '```', ...lines.slice(from.line, to.line + 1), '```', ...lines.slice(to.line + 1)];
  return { lines: out, from: { line: from.line + 1, ch: from.ch }, to: { line: to.line + 1, ch: to.ch } };
}

// ---------- Link ----------
const URL_START = 'https://';

export function toggleLink(state) {
  const { lines, from, to } = state;
  if (from.line !== to.line) return state;
  const line = lines[from.line];
  for (const m of line.matchAll(/(!?)\[([^\][]*)\]\(([^()]*)\)/g)) {
    const start = m.index + m[1].length;
    const end = m.index + m[0].length;
    if (from.ch < m.index || to.ch > end || (same(from, to) && (from.ch === m.index || from.ch === end))) continue;
    if (m[1]) return state; // an image
    const text = line.slice(0, start) + m[2] + line.slice(end);
    const move = (ch) => ({ line: from.line, ch: start + Math.max(0, Math.min(ch - start - 1, m[2].length)) });
    return { lines: replaceLine(lines, from.line, text), from: move(from.ch), to: move(to.ch) };
  }
  const text = `${line.slice(0, from.ch)}[${line.slice(from.ch, to.ch)}](${URL_START})${line.slice(to.ch)}`;
  return { lines: replaceLine(lines, from.line, text), from: { line: from.line, ch: from.ch + 1 }, to: { line: to.line, ch: to.ch + 1 } };
}
