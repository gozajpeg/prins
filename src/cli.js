import path from 'node:path';
import fs from 'node:fs';
import { fetchMultiplePackages } from './registry.js';
import { assessPackageSafety } from './safety.js';
import { renderSingleCard, renderMultiTable } from './formatters.js';
import { promptConfirmation, promptInstall } from './prompt.js';
import { detectPackageManager } from './detector.js';
import { installPackages } from './installer.js';
import { bold, cyan, yellow, red, gray } from './colors.js';

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

    if (arg === '-y' || arg === '--yes') {
      yes = true;
    } else if (arg === '--dry-run') {
      dryRun = true;
    } else if (arg === '--strict') {
      strict = true;
    } else if (arg === '--json') {
      json = true;
    } else if (arg === '-h' || arg === '--help') {
      help = true;
    } else if (arg === '-v' || arg === '--version') {
      version = true;
    } else if (arg.startsWith('-')) {
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
    console.error(`${red('Error:')} No package specified.\n`);
    printHelp();
    return 1;
  }

  // Fetch package metadata
  if (!args.json) {
    process.stdout.write(cyan('Fetching package metadata from registry...'));
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
      types: pkg.hasTypes ? 'bundled' : 'none',
      publishedAt: pkg.publishedAt,
      repository: pkg.repository,
      deprecated: safety.deprecation.isDeprecated ? safety.deprecation.reason : false,
      safety: {
        isSafe: safety.scripts.isSafe,
        scripts: safety.scripts.hooks,
        licenseType: safety.license.type,
        isFresh: safety.age?.isFresh ?? false
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
    const hasScripts = assessedItems.some(item => !item.safety.scripts.isSafe);
    const defaultChoice = hasWarnings ? 'no' : 'yes';

    let promptMsg;
    if (hasScripts) {
      const countStr = assessedItems.length === 1 ? 'package' : `all ${assessedItems.length} packages`;
      promptMsg = `\nInstall ${countStr}? Type y to approve, N to cancel, or i to ignore scripts [y/N/i]: `;
    } else {
      const promptDefault = defaultChoice === 'yes' ? '[Y/n]' : '[y/N]';
      const countStr = assessedItems.length === 1 ? 'package' : `all ${assessedItems.length} packages`;
      promptMsg = `\nInstall ${countStr}? ${promptDefault}: `;
    }

    const decision = await promptInstall(promptMsg, {
      defaultChoice,
      allowIgnoreScripts: hasScripts
    });

    if (decision === 'no' || decision === 'abort') {
      console.log('Installation cancelled.');
      return 0;
    }

    if (decision === 'ignore-scripts') {
      console.log(yellow('Installing with lifecycle scripts disabled (--ignore-scripts)...'));
      if (!args.flags.includes('--ignore-scripts')) {
        args.flags.push('--ignore-scripts');
      }
    }
  }

  // Delegate install
  const pm = detectPackageManager();
  console.log(gray(`Delegating to ${pm.name}...`));
  const exitCode = await installPackages(args.packages, args.flags, { pm });
  return exitCode;
}

function getVersion() {
  try {
    const pkgJsonPath = path.resolve(import.meta.dirname, '../package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
    return pkg.version;
  } catch {
    return '1.0.0';
  }
}
