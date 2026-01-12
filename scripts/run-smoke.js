const { spawn } = require('child_process');
const path = require('path');

const script = path.join(__dirname, 'smoke_hunk_test.sh');

const p = spawn('bash', [script], { stdio: 'inherit' });

p.on('close', (code) => {
  process.exit(code);
});

p.on('error', (err) => {
  console.error('Failed to run smoke script', err);
  process.exit(2);
});
