const { parseSearchQuery } = require('../lib/search');

describe('parseSearchQuery', () => {
  test('parses author and grep and file', () => {
    const q = 'author:Alice file:src/index.js fix';
    const r = parseSearchQuery(q);
    expect(r.filePath).toBe('src/index.js');
    expect(r.greps).toContain('fix');
    expect(r.args.some(a => a.startsWith('--author=Alice'))).toBeTruthy();
  });

  test('parses date range', () => {
    const q = 'date:2020-01-01..2020-01-31 bug';
    const r = parseSearchQuery(q);
    expect(r.args.some(a => a.startsWith('--since=2020-01-01'))).toBeTruthy();
    expect(r.args.some(a => a.startsWith('--until=2020-01-31'))).toBeTruthy();
    expect(r.greps).toContain('bug');
  });

  test('parses hash', () => {
    const q = 'hash:abcdef1234';
    const r = parseSearchQuery(q);
    expect(r.hash).toBe('abcdef1234');
  });

  test('parses quoted author with space', () => {
    const q = 'author:"Alice Smith" feature';
    const r = parseSearchQuery(q);
    expect(r.args.some(a => a.includes('Alice Smith'))).toBeTruthy();
    expect(r.greps).toContain('feature');
  });

  test('parses multiple authors', () => {
    const q = 'author:Alice,Bob fix';
    const r = parseSearchQuery(q);
    expect(r.args.some(a => a.startsWith('--author=Alice'))).toBeTruthy();
    expect(r.args.some(a => a.startsWith('--author=Bob'))).toBeTruthy();
    expect(r.greps).toContain('fix');
  });
});
