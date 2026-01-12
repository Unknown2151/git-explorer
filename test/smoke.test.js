const { spawn } = require('child_process');
const path = require('path');

jest.setTimeout(120000);

test('smoke script completes successfully', (done) => {
  const runner = path.join(__dirname, '..', 'scripts', 'run-smoke.js');
  const p = spawn('node', [runner], { stdio: 'inherit' });
  p.on('close', (code) => {
    try {
      expect(code).toBe(0);
      done();
    } catch (err) { done(err); }
  });
  p.on('error', (err) => done(err));
});
