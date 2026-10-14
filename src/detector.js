// Package manager lockfile detection

import fs from 'node:fs';
import path from 'node:path';

export function detectPackageManager(startDir = process.cwd()) {
  let current = path.resolve(startDir);

  while (true) {
    if (fs.existsSync(path.join(current, 'pnpm-lock.yaml'))) {
      return {
        name: 'pnpm',
        bin: 'pnpm',
        addCmd: 'add',
        installCmd: 'install',
        lockfile: 'pnpm-lock.yaml'
      };
    }

    if (fs.existsSync(path.join(current, 'yarn.lock'))) {
      return {
        name: 'yarn',
        bin: 'yarn',
        addCmd: 'add',
        installCmd: 'install',
        lockfile: 'yarn.lock'
      };
    }

    if (
      fs.existsSync(path.join(current, 'bun.lockb')) ||
      fs.existsSync(path.join(current, 'bun.lock'))
    ) {
      return {
        name: 'bun',
        bin: 'bun',
        addCmd: 'add',
        installCmd: 'install',
        lockfile: fs.existsSync(path.join(current, 'bun.lock')) ? 'bun.lock' : 'bun.lockb'
      };
    }

    if (fs.existsSync(path.join(current, 'package-lock.json'))) {
      return {
        name: 'npm',
        bin: 'npm',
        addCmd: 'install',
        installCmd: 'install',
        lockfile: 'package-lock.json'
      };
    }

    const parent = path.dirname(current);
    if (parent === current) {
      // Reached filesystem root
      break;
    }
    current = parent;
  }

  // Default fallback
  return {
    name: 'npm',
    bin: 'npm',
    addCmd: 'install',
    installCmd: 'install',
    lockfile: null
  };
}
