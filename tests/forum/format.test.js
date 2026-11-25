import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { toggleInline, toggleLines, toggleCode, toggleLink } from '../../assets/js/forum/format.js';

/** "ab|c" is a cursor, "a[[b]]c" a selection. */
function parse(text) {
  const at = (mark) => {
    const i = text.indexOf(mark);
    const before = text.slice(0, i).split('\n');
    text = text.slice(0, i) + text.slice(i + mark.length);
    return { line: before.length - 1, ch: before.at(-1).length };
  };
  if (text.includes('[[')) {
    const from = at('[[');
    const to = at(']]');
    return { lines: text.split('\n'), from, to };
  }
  const c = at('|');
  return { lines: text.split('\n'), from: c, to: c };
}
function show({ lines, from, to }) {
  const out = [...lines];
  const put = (p, mark) => { out[p.line] = out[p.line].slice(0, p.ch) + mark + out[p.line].slice(p.ch); };
  if (from.line === to.line && from.ch === to.ch) put(from, '|');
  else { put(to, ']]'); put(from, '[['); }
  return out.join('\n');
}
const run = (fn, ...args) => (text) => show(fn(parse(text), ...args));
const bold = run(toggleInline, '**');
const italic = run(toggleInline, '*');
const quote = run(toggleLines, 'quote');
const ul = run(toggleLines, 'ul');
const ol = run(toggleLines, 'ol');
const code = run(toggleCode);
const link = run(toggleLink);
const twice = (fn, text) => assert.equal(fn(fn(text)), text);

describe('bold and italic', () => {
  test('insert', () => { assert.equal(bold('|'), '**|**'); assert.equal(italic('abc |'), 'abc *|*'); });
  test('an empty pair is removed by the same button', () => {
    for (const t of ['|', 'abc |', 'abc |def', 'x\n\n|', '- |', '## |', '> |', '{yasla} |']) { twice(bold, t); twice(italic, t); }
  });
  test('three and four clicks', () => { assert.equal(bold(bold(bold('|'))), '**|**'); assert.equal(italic(italic(italic(italic('|')))), '|'); });
  test('both together, in any order', () => {
    assert.equal(italic(bold('|')), '***|***');
    assert.equal(bold(italic('|')), '***|***');
    assert.equal(bold('***|***'), '*|*');
    assert.equal(italic('***|***'), '**|**');
    assert.equal(italic(bold(italic(bold('|')))), '|');
  });
  test('selection', () => { assert.equal(bold('abc [[def]]'), 'abc **[[def]]**'); twice(bold, 'abc [[def]] x'); twice(italic, 'abc [[def]] x'); });
  test('selection that includes the signs', () => { assert.equal(bold('abc [[**def**]]'), 'abc [[def]]'); assert.equal(italic('[[*a*]]'), '[[a]]'); });
  test('bold text can become italic too and back', () => { assert.equal(italic('**[[a]]**'), '***[[a]]***'); assert.equal(italic('***[[a]]***'), '**[[a]]**'); assert.equal(italic('[[**a**]]'), '*[[**a**]]*'); });
  test('spaces at the ends stay outside', () => assert.equal(bold('a[[ b ]]c'), 'a **[[b]]** c'));
  test('cursor inside a bold word', () => { assert.equal(bold('x **ka|lın** y'), 'x ka|lın y'); assert.equal(italic('x *ka|lın* y'), 'x ka|lın y'); assert.equal(bold('__ka|lın__'), 'ka|lın'); assert.equal(italic('_ka|lın_'), 'ka|lın'); });
  test('part of a bold word selected', () => assert.equal(bold('x **ka[[l]]ın** y'), 'x ka[[l]]ın y'));
  test('between two bold words', () => assert.equal(bold('**a** b|c **d**'), '**a** b**|**c **d**'));
  test('list signs are not italic', () => { assert.equal(italic('* a|b'), '* a*|*b'); assert.equal(italic('* ab [[c]] * d'), '* ab *[[c]]* * d'); });
  test('several lines: every line of text, nothing else', () => {
    const before = '[[abc\n\n## Başlık\n- {yasla} madde\n\n```\nkod\n```\n\n$$x$$\n\nson]]';
    assert.equal(bold(before).replace(/\[\[|\]\]/g, ''), '**abc**\n\n## **Başlık**\n- {yasla} **madde**\n\n```\nkod\n```\n\n$$x$$\n\n**son**');
    assert.equal(bold(bold(before)), before);
  });
  test('only spaces selected', () => assert.equal(bold('a[[  ]]b'), 'a[[  ]]b'));
});

describe('quote and lists', () => {
  test('empty line and back', () => { for (const fn of [quote, ul, ol]) for (const t of ['|', 'abc\n|', 'abc\n\n|', '> x\n|', '* x\n|', '1. x\n|']) twice(fn, t); });
  test('line with text and back', () => { for (const fn of [quote, ul, ol]) for (const t of ['ab|c', '{yasla} a|b', 'x\nab|c\ny', '**a|b**']) twice(fn, t); });
  test('signs', () => { assert.equal(quote('ab|'), '> ab|'); assert.equal(ul('ab|'), '* ab|'); assert.equal(ol('ab|'), '1. ab|'); });
  test('one kind of list becomes the other', () => { assert.equal(ol('* ab|'), '1. ab|'); assert.equal(ul('12. ab|'), '* ab|'); assert.equal(ul('- ab|'), 'ab|'); });
  test('several lines, numbers count, empty lines stay', () => {
    assert.equal(ol('[[a\n\nb\nc]]'), '[[1. a\n\n2. b\n3. c]]');
    assert.equal(ol(ol('[[a\n\nb\nc]]')), '[[a\n\nb\nc]]');
    assert.equal(ul('[[* a\nb]]'), '[[* a\n* b]]');
  });
  test('list inside a quote', () => { assert.equal(ul('> a|'), '> * a|'); assert.equal(ul('> * a|'), '> a|'); assert.equal(quote('> * a|'), '* a|'); });
  test('indented item keeps its indent', () => assert.equal(ul('    * a|'), '    a|'));
  test('selection that ends at the start of the next line', () => assert.equal(ul('[[a\n]]b'), '[[* a\n]]b'));
  test('cursor before the sign', () => assert.equal(ul('|* a'), '|a'));
});

describe('code', () => {
  test('empty line: block and back', () => { assert.equal(code('|'), '```\n|\n```'); twice(code, '|'); twice(code, 'abc\n\n|\n\ndef'); });
  test('inside a sentence: inline and back', () => { assert.equal(code('abc |'), 'abc `|`'); twice(code, 'abc |'); twice(code, 'abc [[def]]'); assert.equal(code('a `b|c` d'), 'a b|c d'); });
  test('several lines: block and back', () => { assert.equal(code('[[abc\ndef]]'), '```\n[[abc\ndef]]\n```'); twice(code, '[[abc\ndef]]'); twice(code, 'x\n[[abc\n\ndef]]\ny'); });
  test('cursor inside a block removes the block', () => assert.equal(code('x\n```js\na|b\nc\n```\ny'), 'x\na|b\nc\ny'));
  test('selection of the whole block', () => assert.equal(code('[[```\nab\n```]]'), '[[ab]]'));
  test('a block that was never closed', () => assert.equal(code('```\na|b'), 'a|b'));
});

describe('link', () => {
  test('insert and back', () => { assert.equal(link('abc |'), 'abc [|](https://)'); twice(link, 'abc |'); twice(link, '|'); twice(link, 'abc |def'); });
  test('selection and back, nothing is eaten', () => { assert.equal(link('abc [[def]] x'), 'abc [[[def]]](https://) x'); twice(link, 'abc [[def]] x'); });
  test('cursor inside a link keeps its text', () => { assert.equal(link('a [me|tin](https://x.y) b'), 'a me|tin b'); assert.equal(link('a [metin](https://x|.y) b'), 'a metin| b'); });
  test('images are left alone', () => assert.equal(link('![gö|rsel](https://x.y)'), '![gö|rsel](https://x.y)'));
  test('several lines: only the first line is linked', () => assert.equal(link('[[abc\ndef]]'), '[[[abc\ndef]]](https://)'.replace('[[[abc\ndef]]](https://)', '[[abc\ndef]]')));
});
