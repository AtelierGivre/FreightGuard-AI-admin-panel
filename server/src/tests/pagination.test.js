const test = require('node:test');
const assert = require('node:assert/strict');
const { parsePagination, MAX_LIMIT } = require('../utils/pagination');

test('pagination defaults keep existing clients working', () => {
  const page = parsePagination({});
  assert.equal(page.limit, 50);
  assert.equal(page.skip, 0);
  assert.deepEqual(page.meta(120), {
    total: 120,
    page: 1,
    limit: 50,
    skip: 0,
    pages: 3,
  });
});

test('pagination accepts page and explicit skip', () => {
  assert.deepEqual(
    { limit: parsePagination({ page: 3 }).limit, skip: parsePagination({ page: 3 }).skip },
    { limit: 50, skip: 100 },
  );
  assert.equal(parsePagination({ skip: 75 }).skip, 75);
  assert.equal(parsePagination({ skip: 75 }).page, 2);
});

test('pagination caps page size and ignores bad values', () => {
  assert.equal(parsePagination({ limit: 9999 }).limit, MAX_LIMIT);
  assert.equal(parsePagination({ limit: -4 }).limit, 50);
  assert.equal(parsePagination({ skip: -10 }).skip, 0);
  assert.equal(parsePagination({ page: 'abc' }).skip, 0);
});
