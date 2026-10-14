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
