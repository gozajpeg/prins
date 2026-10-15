// CLI entrypoint and orchestrator

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchMultiplePackages } from './registry.js';
import { assessPackageSafety } from './safety.js';
import { renderSingleCard, renderMultiTable } from './formatters.js';
import { promptConfirmation } from './prompt.js';
import { installPackages } from './installer.js';
import { detectPackageManager } from './detector.js';
import { bold, cyan, yellow, red, gray } from './colors.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function getVersion() {
  try {
    const pkgPath = path.join(__dirname, '..', 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    return pkg.version || '1.0.0';
  } catch {
    return '1.0.0';
  }
}

export function parseArgs(rawArgs) {
  const packages = [];
  const flags = [];
  let yes = false;
  let dryRun = false;
  let strict = false;
  let json = false;
  let help = false;
  let version = false;

  for (let i = 0; i < rawArgs.length; i++) {
    const arg = rawArgs[i];
    if (arg === '-h' || arg === '--help') {
      help = true;
    } else if (arg === '-v' || arg === '--version') {
      version = true;
    } else if (arg === '-y' || arg === '--yes') {
      yes = true;
    } else if (arg === '--dry-run') {
      dryRun = true;
    } else if (arg === '--strict') {
      strict = true;
    } else if (arg === '--json') {
      json = true;
    } else if (arg.startsWith('-')) {
      // Pass-through flags for package manager (-D, -E, --save-dev, etc.)
      flags.push(arg);
    } else {
      packages.push(arg);
    }
  }

  return {
    packages,
    flags,
    yes,
    dryRun,
    strict,
    json,
    help,
    version
  };
}

export function printHelp() {
  console.log(`
${bold('prins')} - npm pre-install package inspector

${bold('USAGE:')}
  prins <package...> [options]

${bold('OPTIONS:')}
  -y, --yes          Skip confirmation prompt and install immediately
  --dry-run          Preview metadata only; do not install
  --strict           Exit with code 1 if any package has install scripts, deprecations, or copyleft
  --json             Output metadata in JSON format
  -D, --save-dev     Forwarded to package manager to save as devDependency
  -E, --save-exact   Forwarded to package manager to save exact version
  -v, --version      Show version number
  -h, --help         Show this help message

${bold('PACKAGE MANAGER DETECTION:')}
  Automatically detects lockfiles across pnpm, yarn, bun, and npm to delegate installation.
`);
}

export async function run(rawArgs = process.argv.slice(2)) {
  const args = parseArgs(rawArgs);

  if (args.help) {
    printHelp();
    return 0;
  }

  if (args.version) {
    console.log(getVersion());
    return 0;
  }

  if (args.packages.length === 0) {
    console.error(`${red('Error:')} No packages specified.`);
    console.error('Specify packages to inspect and install, for example: prins express cors');
    return 1;
  }

  // Fetch metadata from registry
  if (!args.json && process.stdout.isTTY) {
    process.stdout.write(gray(`Fetching metadata from npm registry...\r`));
  }

  const { succeeded, failed } = await fetchMultiplePackages(args.packages);

  // Clear fetching line
  if (!args.json && process.stdout.isTTY) {
    process.stdout.write('\r\x1b[2K');
  }

  if (failed.length > 0) {
    for (const fail of failed) {
      console.error(`${red('Error:')} ${fail.error}`);
    }
    return 1;
  }

  const assessedItems = succeeded.map(pkg => ({
    pkg,
    safety: assessPackageSafety(pkg)
  }));

  // JSON mode
  if (args.json) {
    const jsonOutput = assessedItems.map(({ pkg, safety }) => ({
      name: pkg.name,
      version: pkg.version,
      author: pkg.author,
      license: pkg.license,
      unpackedSize: pkg.unpackedSize,
      dependenciesCount: pkg.dependenciesCount,
      deprecated: safety.deprecation.isDeprecated ? safety.deprecation.reason : false,
      safety: {
        isSafe: safety.scripts.isSafe,
        scripts: safety.scripts.hooks,
        licenseType: safety.license.type
      }
    }));
    console.log(JSON.stringify(jsonOutput, null, 2));
    return 0;
  }

  // Render view
  if (assessedItems.length === 1) {
    console.log(renderSingleCard(assessedItems[0].pkg, assessedItems[0].safety));
  } else {
    console.log(renderMultiTable(assessedItems));
  }

  // Strict mode verification
  if (args.strict) {
    const issues = assessedItems.filter(item => !item.safety.isClean);
    if (issues.length > 0) {
      console.error(`\n${red('Strict mode error:')} ${issues.length} package(s) have safety warnings or copyleft licenses.`);
      return 1;
    }
  }

  // Dry run exits without installing
  if (args.dryRun) {
    return 0;
  }

  // Prompt confirmation
  if (!args.yes) {
    if (!process.stdin.isTTY) {
      console.error(red('Error: Non-interactive environment detected.'));
      console.error('Pass -y to confirm installation or --dry-run to preview metadata.');
      return 1;
    }

    const hasWarnings = assessedItems.some(item => !item.safety.isClean);
    const defaultYes = !hasWarnings;

    let promptMsg;
    if (assessedItems.length === 1) {
      promptMsg = defaultYes
        ? '\nInstall package? [Y/n]: '
        : '\nInstall package? [y/N]: ';
    } else {
      promptMsg = defaultYes
        ? `\nInstall all ${assessedItems.length} packages? [Y/n]: `
        : `\nInstall all ${assessedItems.length} packages? [y/N]: `;
    }

    const confirmed = await promptConfirmation(promptMsg, defaultYes);
    if (!confirmed) {
      console.log('Installation cancelled.');
      return 0;
    }
  }

  // Delegate install
  const pm = detectPackageManager();
  console.log(gray(`Delegating to ${pm.name}...`));
  const exitCode = await installPackages(args.packages, args.flags, { pm });
  return exitCode;
}
