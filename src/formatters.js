// Terminal formatting for single-card and multi-package table views

import { bold, dim, cyan, green, yellow, red, gray, stripAnsi } from './colors.js';

export function formatBytes(bytes) {
  if (bytes === null || bytes === undefined || isNaN(bytes)) return 'Unknown';
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB'];
  let i = -1;
  do {
    bytes /= 1024;
    i++;
  } while (bytes >= 1024 && i < units.length - 1);
  return `${bytes.toFixed(1).replace(/\.0$/, '')} ${units[i]}`;
}

export function renderSingleCard(pkg, safety) {
  const width = 76;
  const line = '+' + '-'.repeat(width - 2) + '+';

  const rows = [];
  rows.push(line);

  // Header line
  rows.push(`| ${bold(cyan(`PACKAGE SUMMARY: ${pkg.name}@${pkg.version}`))}`);
  rows.push(line);

  const formatRow = (label, valueRaw, coloredValue) => {
    const labelStr = (label + ':').padEnd(17, ' ');
    const displayValue = coloredValue !== undefined ? coloredValue : valueRaw;
    return `| ${dim(labelStr)}${displayValue}`;
  };

  // Author
  rows.push(formatRow('Author', pkg.author));

  // License
  const licenseColor = safety.license.isRisk ? yellow(pkg.license) : green(pkg.license);
  rows.push(formatRow('License', pkg.license, licenseColor));

  // Size
  const sizeStr = formatBytes(pkg.unpackedSize) + ' (direct)';
  rows.push(formatRow('Unpacked Size', sizeStr));

  // Dependencies
  const depsStr = `${pkg.dependenciesCount} direct packages`;
  rows.push(formatRow('Dependencies', depsStr));

  // Status
  const statusStr = safety.deprecation.isDeprecated ? 'Deprecated' : 'Active';
  const statusColor = safety.deprecation.isDeprecated ? red('Deprecated') : green('Active');
  rows.push(formatRow('Status', statusStr, statusColor));

  // Install scripts
  const scriptsLabel = safety.scripts.label;
  const scriptsColor = safety.scripts.isSafe ? green(scriptsLabel) : yellow(scriptsLabel);
  rows.push(formatRow('Install Scripts', scriptsLabel, scriptsColor));

  rows.push(line);

  const notes = [];
  if (safety.deprecation.isDeprecated && safety.deprecation.reason) {
    notes.push(`\n${red('Notice:')} ${safety.deprecation.reason}`);
  }
  if (!safety.scripts.isSafe) {
    notes.push(`${yellow('Script alert:')} ${safety.scripts.description}`);
  }

  return rows.join('\n') + (notes.length > 0 ? '\n' + notes.join('\n') : '');
}

export function renderMultiTable(items) {
  const headers = ['Package', 'Version', 'Author', 'License', 'Size', 'Deps', 'Scripts', 'Status'];

  const rows = items.map(({ pkg, safety }) => {
    return {
      pkg: pkg.name,
      version: pkg.version,
      author: pkg.author,
      license: pkg.license,
      licenseIsRisk: safety.license.isRisk,
      size: formatBytes(pkg.unpackedSize),
      deps: `${pkg.dependenciesCount} direct`,
      scripts: safety.scripts.shortLabel,
      scriptsIsSafe: safety.scripts.isSafe,
      status: safety.deprecation.isDeprecated ? 'Deprecated' : 'Active',
      isDeprecated: safety.deprecation.isDeprecated,
      deprecationReason: safety.deprecation.reason,
      scriptDescription: !safety.scripts.isSafe ? safety.scripts.description : null,
      bytes: pkg.unpackedSize || 0
    };
  });

  const colWidths = {
    pkg: Math.max(7, ...rows.map(r => r.pkg.length)),
    version: Math.max(7, ...rows.map(r => r.version.length)),
    author: Math.max(6, Math.min(22, Math.max(...rows.map(r => r.author.length)))),
    license: Math.max(7, ...rows.map(r => r.license.length)),
    size: Math.max(6, ...rows.map(r => r.size.length)),
    deps: Math.max(6, ...rows.map(r => r.deps.length)),
    scripts: Math.max(7, ...rows.map(r => r.scripts.length)),
    status: Math.max(6, ...rows.map(r => r.status.length))
  };

  const totalBytes = rows.reduce((sum, r) => sum + r.bytes, 0);

  const lines = [];

  const tableInnerWidth =
    colWidths.pkg + colWidths.version + colWidths.author + colWidths.license +
    colWidths.size + colWidths.deps + colWidths.scripts + colWidths.status + 25;

  const headerTitle = `PRE-INSTALL SUMMARY (${items.length} package${items.length === 1 ? '' : 's'} requested)`;
  const outerWidth = Math.max(tableInnerWidth, headerTitle.length + 4);
  const borderLine = '+' + '-'.repeat(outerWidth - 2) + '+';

  lines.push(borderLine);
  lines.push(`| ${bold(cyan(headerTitle))}`);
  lines.push(borderLine);

  // Table header
  const th = `| ${headers[0].padEnd(colWidths.pkg)} | ${headers[1].padEnd(colWidths.version)} | ${headers[2].padEnd(colWidths.author)} | ${headers[3].padEnd(colWidths.license)} | ${headers[4].padEnd(colWidths.size)} | ${headers[5].padEnd(colWidths.deps)} | ${headers[6].padEnd(colWidths.scripts)} | ${headers[7].padEnd(colWidths.status)} |`;
  lines.push(th);

  // Separator
  const sep = `| :${'-'.repeat(colWidths.pkg - 1)} | :${'-'.repeat(colWidths.version - 1)} | :${'-'.repeat(colWidths.author - 1)} | :${'-'.repeat(colWidths.license - 1)} | :${'-'.repeat(colWidths.size - 1)} | :${'-'.repeat(colWidths.deps - 1)} | :${'-'.repeat(colWidths.scripts - 1)} | :${'-'.repeat(colWidths.status - 1)} |`;
  lines.push(sep);

  // Data rows
  for (const r of rows) {
    const authorTruncated = r.author.length > colWidths.author
      ? r.author.slice(0, colWidths.author - 1) + '…'
      : r.author;

    const licenseCol = r.licenseIsRisk ? yellow(r.license.padEnd(colWidths.license)) : green(r.license.padEnd(colWidths.license));
    const scriptsCol = r.scriptsIsSafe ? green(r.scripts.padEnd(colWidths.scripts)) : yellow(r.scripts.padEnd(colWidths.scripts));
    const statusCol = r.isDeprecated ? red(r.status.padEnd(colWidths.status)) : green(r.status.padEnd(colWidths.status));

    const line = `| ${bold(r.pkg.padEnd(colWidths.pkg))} | ${r.version.padEnd(colWidths.version)} | ${authorTruncated.padEnd(colWidths.author)} | ${licenseCol} | ${r.size.padEnd(colWidths.size)} | ${r.deps.padEnd(colWidths.deps)} | ${scriptsCol} | ${statusCol} |`;
    lines.push(line);
  }

  lines.push(borderLine);

  // Total summary
  const totalStr = `TOTAL: ${items.length} package${items.length === 1 ? '' : 's'} | ~${formatBytes(totalBytes)} unpacked`;
  lines.push(`| ${bold(totalStr)}`);
  lines.push(borderLine);

  // Warnings / notes
  const notes = [];
  for (const r of rows) {
    if (r.isDeprecated && r.deprecationReason) {
      notes.push(`${red('Notice')} (${r.pkg}@${r.version}): ${r.deprecationReason}`);
    }
    if (r.scriptDescription) {
      notes.push(`${yellow('Script alert')} (${r.pkg}@${r.version}): ${r.scriptDescription}`);
    }
  }

  return lines.join('\n') + (notes.length > 0 ? '\n\n' + notes.join('\n') : '');
}
