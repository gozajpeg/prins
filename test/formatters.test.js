import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { formatBytes, formatPublished, renderSingleCard, renderMultiTable } from '../src/formatters.js';
import { stripAnsi } from '../src/colors.js';

describe('formatters: formatBytes', () => {
  test('formats bytes correctly', () => {
    assert.equal(formatBytes(500), '500 B');
    assert.equal(formatBytes(1024), '1 KB');
    assert.equal(formatBytes(1536), '1.5 KB');
    assert.equal(formatBytes(1024 * 1024 * 2), '2 MB');
    assert.equal(formatBytes(1024 * 1024 * 1024 * 1.5), '1.5 GB');
  });

  test('handles null or missing bytes', () => {
    assert.equal(formatBytes(null), 'Unknown');
    assert.equal(formatBytes(undefined), 'Unknown');
    assert.equal(formatBytes(NaN), 'Unknown');
  });
});

describe('formatters: stripAnsi', () => {
  test('strips ANSI codes', () => {
    const colored = '\x1b[31mError\x1b[39m: \x1b[1mImportant\x1b[22m';
    assert.equal(stripAnsi(colored), 'Error: Important');
  });
});

describe('formatters: renderSingleCard', () => {
  test('renders card with matching structure', () => {
    const pkg = {
      name: 'axios',
      version: '1.7.2',
      author: 'jasonsaayman',
      license: 'MIT',
      unpackedSize: 1887436,
      dependenciesCount: 4
    };
    const safety = {
      scripts: {
        isSafe: true,
        label: 'None'
      },
      license: {
        isRisk: false
      },
      deprecation: {
        isDeprecated: false,
        reason: null
      }
    };

    const rendered = stripAnsi(renderSingleCard(pkg, safety));
    assert.match(rendered, /PACKAGE SUMMARY: axios@1\.7\.2/);
    assert.match(rendered, /Author:\s+jasonsaayman/);
    assert.match(rendered, /License:\s+MIT/);
    assert.match(rendered, /Unpacked Size:\s+1\.8 MB \(direct\)/);
    assert.match(rendered, /Dependencies:\s+4 direct packages/);
    assert.match(rendered, /Status:\s+Active/);
    assert.match(rendered, /Install Scripts:\s+None/);
  });
});

describe('formatters: renderMultiTable', () => {
  test('renders multi-package table with headers and summary', () => {
    const items = [
      {
        pkg: {
          name: 'express',
          version: '4.19.2',
          author: 'Douglas Wilson',
          license: 'MIT',
          unpackedSize: 215040
        },
        safety: {
          license: { isRisk: false },
          scripts: { isSafe: true, shortLabel: 'Safe' },
          deprecation: { isDeprecated: false, reason: null }
        }
      },
      {
        pkg: {
          name: 'moment',
          version: '2.30.1',
          author: 'Iskren Chernev',
          license: 'MIT',
          unpackedSize: 4509715
        },
        safety: {
          license: { isRisk: false },
          scripts: { isSafe: true, shortLabel: 'Safe' },
          deprecation: { isDeprecated: true, reason: 'moment is in maintenance mode' }
        }
      }
    ];

    const rendered = stripAnsi(renderMultiTable(items));
    assert.match(rendered, /PRE-INSTALL SUMMARY \(2 packages requested\)/);
    assert.match(rendered, /Package\s+\| Version\s+\| Author/);
    assert.match(rendered, /Deps\s+\| Scripts/);
    assert.match(rendered, /express/);
    assert.match(rendered, /moment/);
    assert.match(rendered, /TOTAL: 2 packages/);
    assert.match(rendered, /Notice \(moment@2\.30\.1\): moment is in maintenance mode/);
  });
});

describe('formatters: formatPublished', () => {
  test('formats known ISO timestamp to relative and date format', () => {
    const published = formatPublished('2024-03-25T14:30:36.103Z');
    assert.match(published, /2024-03-25/);
    assert.match(published, /ago/);
  });

  test('returns Unknown for missing or invalid date', () => {
    assert.equal(formatPublished(null), 'Unknown');
    assert.equal(formatPublished('invalid-date'), 'Unknown');
  });
});
