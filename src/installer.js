// Spawns package manager install delegation

import { spawn } from 'node:child_process';
import { detectPackageManager } from './detector.js';

export function installPackages(packages, flags = [], options = {}) {
  const cwd = options.cwd || process.cwd();
  const pm = options.pm || detectPackageManager(cwd);

  const isWin = process.platform === 'win32';
  const executable = (isWin && pm.bin !== 'bun') ? `${pm.bin}.cmd` : pm.bin;

  const args = [pm.addCmd, ...packages, ...flags];

  return new Promise((resolve, reject) => {
    const proc = spawn(executable, args, {
      cwd,
      stdio: 'inherit',
      windowsHide: true,
      shell: isWin
    });

    proc.on('error', (err) => {
      reject(new Error(`Failed to launch package manager (${pm.bin}): ${err.message}`));
    });

    proc.on('close', (code) => {
      resolve(code ?? 0);
    });
  });
}
