import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { detectPackageManager } from '../src/detector.js';

describe('detector: detectPackageManager', () => {
  let tmpDir;

  before(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'prins-detect-test-'));
  });

  after(() => {
    if (tmpDir && fs.existsSync(tmpDir)) {
      try {
        fs.rmSync(tmpDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
      } catch {
        // Safe fallback for Windows filesystem handle release delay
      }
    }
  });

  test('detects pnpm from pnpm-lock.yaml', () => {
    const pnpmDir = path.join(tmpDir, 'pnpm-project');
    fs.mkdirSync(pnpmDir, { recursive: true });
    fs.writeFileSync(path.join(pnpmDir, 'pnpm-lock.yaml'), '');

    const pm = detectPackageManager(pnpmDir);
    assert.equal(pm.name, 'pnpm');
    assert.equal(pm.addCmd, 'add');
    assert.equal(pm.bin, 'pnpm');
  });

  test('detects yarn from yarn.lock', () => {
    const yarnDir = path.join(tmpDir, 'yarn-project');
    fs.mkdirSync(yarnDir, { recursive: true });
    fs.writeFileSync(path.join(yarnDir, 'yarn.lock'), '');

    const pm = detectPackageManager(yarnDir);
    assert.equal(pm.name, 'yarn');
    assert.equal(pm.addCmd, 'add');
    assert.equal(pm.bin, 'yarn');
  });

  test('detects bun from bun.lockb or bun.lock', () => {
    const bunDir = path.join(tmpDir, 'bun-project');
    fs.mkdirSync(bunDir, { recursive: true });
    fs.writeFileSync(path.join(bunDir, 'bun.lock'), '');

    const pm = detectPackageManager(bunDir);
    assert.equal(pm.name, 'bun');
    assert.equal(pm.addCmd, 'add');
    assert.equal(pm.bin, 'bun');
  });

  test('detects npm from package-lock.json', () => {
    const npmDir = path.join(tmpDir, 'npm-project');
    fs.mkdirSync(npmDir, { recursive: true });
    fs.writeFileSync(path.join(npmDir, 'package-lock.json'), '');

    const pm = detectPackageManager(npmDir);
    assert.equal(pm.name, 'npm');
    assert.equal(pm.addCmd, 'install');
    assert.equal(pm.bin, 'npm');
  });

  test('defaults to npm when no lockfile exists', () => {
    const emptyDir = path.join(tmpDir, 'empty-project');
    fs.mkdirSync(emptyDir, { recursive: true });

    const pm = detectPackageManager(emptyDir);
    assert.equal(pm.name, 'npm');
    assert.equal(pm.addCmd, 'install');
  });
});
