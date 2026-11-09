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

test('the carbon invitation link occurs exactly once and OG images use the supported path', () => {
  const study = studies.find((study) => study.presentation === 'chapters');
  assert.equal(workSchema.safeParse({ ...study, footerLink: { text: 'absent', href: '/call/' } }).success, false);
  assert.equal(workSchema.safeParse({ ...study, ogImage: 'https://example.com/image.png' }).success, false);
  assert.equal(workSchema.safeParse({ ...study, ogImage: '/social/linkedin-work-example.png' }).success, true);
});

test('essay dates remain optional, require an original date and preserve chronological order', () => {
  const essay = { kind: 'essay', author: 'Alan Harman-Box', title: 'Example', description: 'Example', heading: { em: 'Example' }, lead: 'Example' };
  assert.equal(writingSchema.safeParse(essay).success, true);
  assert.equal(writingSchema.safeParse({ ...essay, dateModified: '2026-11-06' }).success, false);
  assert.equal(writingSchema.safeParse({ ...essay, datePublished: '2026-11-06', dateModified: '2026-11-05' }).success, false);
  assert.equal(writingSchema.safeParse({ ...essay, datePublished: '2026-11-05', dateModified: '2026-11-06' }).success, true);
});

test('archive metadata preserves month precision and its original author', () => {
  const article = frontmatter('src/content/writing/roches-maxim.mdx');
  assert.equal(writingSchema.safeParse(article).success, true);
  for (const extra of [{ archiveMonth: '2021-03-01' }, { author: 'Alan Harman-Box' }, { datePublished: '2021-03-01' }, { dateModified: '2026-11-06' }]) {
    assert.equal(writingSchema.safeParse({ ...article, ...extra }).success, false);
  }
});
