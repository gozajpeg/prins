// Package manager lockfile detection

import fs from 'node:fs';
import path from 'node:path';

const LOCKFILES = [
  ['pnpm-lock.yaml', 'pnpm', 'add'],
  ['yarn.lock', 'yarn', 'add'],
  ['bun.lockb', 'bun', 'add'],
  ['bun.lock', 'bun', 'add'],
  ['package-lock.json', 'npm', 'install']
];

export function detectPackageManager(startDir = process.cwd()) {
  let current = path.resolve(startDir);
  while (true) {
    for (const [file, name, addCmd] of LOCKFILES) {
      if (fs.existsSync(path.join(current, file))) {
        return { name, bin: name, addCmd, installCmd: 'install', lockfile: file };
      }
    }
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return { name: 'npm', bin: 'npm', addCmd: 'install', installCmd: 'install', lockfile: null };
}
