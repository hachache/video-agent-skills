import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

const tests = fs.readdirSync('tests').filter(file => file.endsWith('.test.mjs')).map(file => `tests/${file}`);
const python = process.env.PYTHON || (process.platform === 'win32' ? 'python' : 'python3');
for (const [command, args] of [[process.execPath, ['--test', ...tests]], [python, ['-m', 'unittest', 'discover', '-s', 'tests', '-p', 'test_*.py']]]) {
  const result = spawnSync(command, args, { stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}
