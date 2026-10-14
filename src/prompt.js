// Interactive user confirmation prompt

import readline from 'node:readline/promises';

export async function promptConfirmation(message, defaultYes = true) {
  if (!process.stdin.isTTY) {
    // Non-interactive environment without -y flag defaults to false for safety
    return false;
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  try {
    const answer = await rl.question(message);
    const trimmed = answer.trim().toLowerCase();

    if (trimmed === '') {
      return defaultYes;
    }

    return trimmed === 'y' || trimmed === 'yes';
  } finally {
    rl.close();
  }
}
