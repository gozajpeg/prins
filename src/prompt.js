// Interactive user confirmation prompt

import readline from 'node:readline/promises';

export async function promptConfirmation(message, defaultYes = true) {
  if (!process.stdin.isTTY) return false;
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = (await rl.question(message)).trim().toLowerCase();
    return answer === '' ? defaultYes : (answer === 'y' || answer === 'yes');
  } finally {
    rl.close();
  }
}

export async function promptInstall(message, options = {}) {
  if (!process.stdin.isTTY) return 'abort';
  const { defaultChoice = 'no', allowIgnoreScripts = false } = options;
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = (await rl.question(message)).trim().toLowerCase();
    if (answer === '') {
      return defaultChoice;
    }
    if (answer === 'y' || answer === 'yes') {
      return 'yes';
    }
    if (allowIgnoreScripts && (answer === 'i' || answer === 'ignore' || answer === 'ignore-scripts')) {
      return 'ignore-scripts';
    }
    return 'no';
  } finally {
    rl.close();
  }
}
