/**
 * Smoke E2E mínimo — abre janela Electron e encerra (substituto Playwright headless).
 * Uso: node scripts/e2e-smoke.mjs
 */
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const exe = path.join(root, 'release', 'win-unpacked', 'Velora.exe');

const child = spawn(exe, ['--smoke-test'], {
  cwd: path.dirname(exe),
  stdio: 'inherit',
  env: { ...process.env, VELORA_SMOKE: '1' },
});

const timeout = setTimeout(() => {
  console.error('Smoke timeout 15s');
  child.kill();
  process.exit(1);
}, 15_000);

child.on('exit', (code) => {
  clearTimeout(timeout);
  process.exit(code === 0 ? 0 : 1);
});
