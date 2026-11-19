import { test } from 'node:test';
import assert from 'node:assert/strict';
import { writingRoute } from '../src/lib/writing.ts';

test('an essay with no legacy route is served at writing/<id>', () => {
  assert.equal(writingRoute('a-future-essay'), 'writing/a-future-essay');
});

test('legacy routes keep their fixed /blog/ URLs', () => {
  assert.equal(writingRoute('roches-maxim'), 'blog/2021/03/where-do-i-make-data-transformations-in-power-bi-roches-maxim');
});

test('an id that cannot make a buildable route fails instead of linking nowhere', () => {
  assert.throws(() => writingRoute('Not A Slug'), /no buildable route/);
});
