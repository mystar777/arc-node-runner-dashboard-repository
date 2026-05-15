/**
 * Git 훅 설치 — Cursor Co-authored-by 차단
 *
 * 기본(--global): 모든 저장소에 적용 (git config --global core.hooksPath)
 * --local: 이 저장소만 .githooks 사용 (전역보다 우선하므로 일반적으로 불필요)
 */
import { execSync } from 'node:child_process';
import { chmodSync, copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const hooks = ['prepare-commit-msg', 'commit-msg'];
const args = process.argv.slice(2);
const localOnly = args.includes('--local');
const globalOnly = args.includes('--global-only') || !args.includes('--local');

function chmodHook(p) {
  try {
    chmodSync(p, 0o755);
  } catch {
    /* Windows */
  }
}

function installGlobal() {
  const globalDir = join(homedir(), '.githooks-global');
  mkdirSync(globalDir, { recursive: true });

  for (const name of hooks) {
    const src = join(root, '.githooks', name);
    const dest = join(globalDir, name);
    if (!existsSync(src)) {
      console.error(`[setup:hooks] Missing template: ${src}`);
      process.exit(1);
    }
    copyFileSync(src, dest);
    chmodHook(dest);
  }

  const hookPath = globalDir.replace(/\\/g, '/');
  execSync(`git config --global core.hooksPath "${hookPath}"`, { stdio: 'inherit' });

  const current = execSync('git config --global --get core.hooksPath', { encoding: 'utf8' }).trim();
  console.log(`[setup:hooks:global] core.hooksPath (global) = ${current}`);
  console.log('[setup:hooks:global] All Git repos on this machine use these hooks.');
}

function installLocal() {
  const hooksDir = join(root, '.githooks');
  for (const name of hooks) {
    chmodHook(join(hooksDir, name));
  }
  execSync('git config core.hooksPath .githooks', { cwd: root, stdio: 'inherit' });
  const current = execSync('git config --get core.hooksPath', { cwd: root, encoding: 'utf8' }).trim();
  console.log(`[setup:hooks:local] core.hooksPath (this repo) = ${current}`);
  console.warn('[setup:hooks:local] Local hooksPath overrides global for this repo only.');
}

if (globalOnly) installGlobal();
if (localOnly) installLocal();
if (!globalOnly && !localOnly) {
  installGlobal();
}
