/**
 * 이 저장소에서 Git 훅 경로를 .githooks 로 고정합니다.
 * Cursor 터미널의 Co-authored-by: Cursor 주입을 차단합니다.
 */
import { execSync } from 'node:child_process';
import { chmodSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const hooksDir = join(root, '.githooks');

const hooks = ['prepare-commit-msg', 'commit-msg'];

for (const name of hooks) {
  const p = join(hooksDir, name);
  if (!existsSync(p)) {
    console.error(`[setup:hooks] Missing hook: ${p}`);
    process.exit(1);
  }
  try {
    chmodSync(p, 0o755);
  } catch {
    /* Windows: chmod may be no-op */
  }
}

execSync('git config core.hooksPath .githooks', { cwd: root, stdio: 'inherit' });

const path = execSync('git config --get core.hooksPath', { cwd: root, encoding: 'utf8' }).trim();
console.log(`[setup:hooks] core.hooksPath = ${path}`);
console.log('[setup:hooks] prepare-commit-msg + commit-msg active (blocks Cursor Co-authored-by).');
