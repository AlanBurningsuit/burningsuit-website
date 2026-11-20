import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { parse } from 'yaml';
import { workSchema, writingSchema } from '../src/lib/content-schema.ts';

const frontmatter = (file) => parse(readFileSync(file, 'utf8').match(/^---\n([\s\S]*?)\n---/)[1]);
const studies = readdirSync('src/content/work').filter((file) => file.endsWith('.mdx')).map((file) => frontmatter(`src/content/work/${file}`));

test('all approved studies validate with their naming gate closed', () => {
  assert.equal(studies.length, 4);
  for (const study of studies) assert.equal(workSchema.parse(study).namePublished, false);
});

test('the schema rejects a named block behind a closed or invalid gate in every composition', () => {
  for (const study of studies) {
    const named = { client: 'Synthetic example', quote: 'Example text', cite: 'Example author' };
    for (const namePublished of [undefined, false, 'true', 1]) {
      assert.equal(workSchema.safeParse({ ...study, named, namePublished }).success, false);
    }
    assert.equal(workSchema.safeParse({ ...study, named, namePublished: true }).success, true);
  }
});

test('headings and strict fields fail closed for every study composition', () => {
  for (const study of studies) {
    for (const heading of ['', '   ', {}, { before: ' ', em: '' }, { after: '\t' }]) {
      assert.equal(workSchema.safeParse({ ...study, heading }).success, false);
    }
    assert.equal(workSchema.safeParse({ ...study, unknown: 'extra' }).success, false);
  }
});

test('every study needs all four facts, a limits line and both closing links; OG images use the supported path', () => {
  for (const study of studies) {
    assert.deepEqual(Object.keys(study.facts), ['format', 'who', 'length', 'material']);
    for (const fact of ['format', 'who', 'length', 'material']) {
      assert.equal(workSchema.safeParse({ ...study, facts: { ...study.facts, [fact]: undefined } }).success, false);
    }
    assert.equal(workSchema.safeParse({ ...study, facts: { ...study.facts, kept: 'extra' } }).success, false);
    assert.equal(workSchema.safeParse({ ...study, limits: ' ' }).success, false);
    assert.equal(workSchema.safeParse({ ...study, closing: { ...study.closing, then: undefined } }).success, false);
    assert.equal(workSchema.safeParse({ ...study, closing: { ...study.closing, link: { text: 'Example', href: 'https://example.com/' } } }).success, false);
    assert.equal(workSchema.safeParse({ ...study, ogImage: 'https://example.com/image.png' }).success, false);
    assert.equal(workSchema.safeParse({ ...study, ogImage: '/social/linkedin-work-example.png' }).success, true);
  }
});

test('essay dates: a talk date suffices, a modification needs the original date and follows it', () => {
  const essay = { kind: 'essay', author: 'Alan Harman-Box', title: 'Example', description: 'Example', heading: { em: 'Example' }, lead: 'Example', givenAt: [{ event: 'Example', date: '2026-02-19' }] };
  assert.equal(writingSchema.safeParse(essay).success, true);
  assert.equal(writingSchema.safeParse({ ...essay, dateModified: '2026-11-06' }).success, false);
  assert.equal(writingSchema.safeParse({ ...essay, datePublished: '2026-11-06', dateModified: '2026-11-05' }).success, false);
  assert.equal(writingSchema.safeParse({ ...essay, datePublished: '2026-11-05', dateModified: '2026-11-06' }).success, true);
});

test('archive metadata preserves month precision', () => {
  const article = frontmatter('src/content/writing/roches-maxim.mdx');
  assert.equal(writingSchema.safeParse(article).success, true);
  for (const extra of [{ archiveMonth: '2021-03-01' }, { datePublished: '2021-03-01' }, { dateModified: '2026-11-06' }]) {
    assert.equal(writingSchema.safeParse({ ...article, ...extra }).success, false);
  }
});

test("Alison Box's restored posts keep her byline, the day they were published and her own revision month", () => {
  const ids = ['7-secrets-of-the-matrix-visual', 'the-8th-secret-of-the-matrix-visual', 'categorising-measures-into-numeric-ranges-or-bins', 'find-top-or-bottom-n-percent-dax'];
  for (const id of ids) {
    const article = frontmatter(`src/content/writing/${id}.mdx`);
    assert.equal(writingSchema.safeParse(article).success, true, id);
    assert.equal(article.kind, 'archive');
    assert.equal(article.author, 'Alison Box');
    assert.ok(article.updateNotice, id);
    // The update notes date the modification; it may not precede the original day.
    assert.equal(article.dateModified, '2026-11-19', id);
    // A day and a month together, a modification before publication, or no publication date at all fail closed.
    for (const extra of [{ archiveMonth: '2019-04' }, { dateModified: '2018-12-31' }, { datePublished: undefined }]) {
      assert.equal(writingSchema.safeParse({ ...article, ...extra }).success, false, `${id} ${JSON.stringify(extra)}`);
    }
  }
  const revised = frontmatter('src/content/writing/7-secrets-of-the-matrix-visual.mdx');
  assert.equal(revised.revisedMonth, '2022-07');
  for (const revisedMonth of ['2019-04', '2018-12', '2022-7']) assert.equal(writingSchema.safeParse({ ...revised, revisedMonth }).success, false);
});

test('an essay keeps its marked heading and carries no archive context', () => {
  const essay = frontmatter('src/content/writing/we-are-all-middle-management-now.mdx');
  assert.equal(writingSchema.safeParse(essay).success, true);
  for (const extra of [{ heading: "We're all middle management now" }, { revisedMonth: '2026-11' }, { updateNotice: 'Example' }, { author: 'Alison Box' }]) {
    assert.equal(writingSchema.safeParse({ ...essay, ...extra }).success, false, JSON.stringify(extra));
  }
});

test('every Writing entry is dated: an essay needs a talk or a publication day, an archive post a day or a month', () => {
  const essay = frontmatter('src/content/writing/we-are-all-middle-management-now.mdx');
  for (const undated of [{ givenAt: undefined, datePublished: undefined }, { givenAt: [], datePublished: undefined }]) {
    assert.equal(writingSchema.safeParse({ ...essay, ...undated }).success, false, JSON.stringify(undated));
  }
  assert.equal(writingSchema.safeParse({ ...essay, givenAt: undefined, datePublished: '2026-09-17' }).success, true);
  const roche = frontmatter('src/content/writing/roches-maxim.mdx');
  assert.equal(writingSchema.safeParse({ ...roche, archiveMonth: undefined }).success, false);
});

test('every archive post keeps its original byline and the day it was published', () => {
  const bylines = {
    'roches-maxim': 'Stuart Box',
    '7-secrets-of-the-matrix-visual': 'Alison Box', 'the-8th-secret-of-the-matrix-visual': 'Alison Box',
    'categorising-measures-into-numeric-ranges-or-bins': 'Alison Box', 'find-top-or-bottom-n-percent-dax': 'Alison Box',
    'how-dax-treats-nulls-zeros': 'Alison Box', 'using-dynamic-values-smart-narrative-and-text-box': 'Alison Box',
    'using-continuous-x-axis-column-charts-year-and-month-labels': 'Alison Box', 'filtering-using-dax-measures': 'Alison Box',
    // Published under Alan's own byline in September 2021.
    'i-have-the-powerquery-using-power-query-to-call-rest-apis': 'Alan Harman-Box',
  };
  const archive = readdirSync('src/content/writing').filter((file) => file.endsWith('.mdx')).map((file) => file.slice(0, -4))
    .filter((id) => frontmatter(`src/content/writing/${id}.mdx`).kind === 'archive');
  assert.deepEqual(archive.sort(), Object.keys(bylines).sort());
  for (const [id, author] of Object.entries(bylines)) {
    const article = frontmatter(`src/content/writing/${id}.mdx`);
    assert.equal(writingSchema.safeParse(article).success, true, id);
    assert.equal(article.author, author, id);
  }
});
