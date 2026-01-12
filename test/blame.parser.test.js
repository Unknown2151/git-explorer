const { parseLinePorcelain } = require('../lib/blame');

test('parseLinePorcelain parses simple porcelain output', () => {
  const sample = `aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa 1 1 1
author Alice
author-mail <alice@example.com>
author-time 1600000000
author-tz +0000
summary Initial commit
filename file.txt
	First line of file
bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb 2 2 1
author Bob
author-mail <bob@example.com>
author-time 1600000100
author-tz +0000
summary Second commit
filename file.txt
	Second line of file
`;

  const res = parseLinePorcelain(sample);
  expect(Array.isArray(res)).toBe(true);
  expect(res.length).toBe(2);
  expect(res[0].commit).toBe('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
  expect(res[0].author).toBe('Alice');
  expect(res[0].authorMail).toBe('<alice@example.com>');
  expect(res[0].authorTime).toBe(1600000000);
  expect(res[0].summary).toBe('Initial commit');
  expect(res[0].code).toBe('First line of file');

  expect(res[1].commit).toBe('bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb');
  expect(res[1].author).toBe('Bob');
  expect(res[1].code).toBe('Second line of file');
});
