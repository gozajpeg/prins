import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { parseArgs } from '../src/cli.js';

describe('cli: parseArgs', () => {
  test('parses single package argument', () => {
    const parsed = parseArgs(['express']);
    assert.deepEqual(parsed.packages, ['express']);
    assert.equal(parsed.flags.length, 0);
    assert.equal(parsed.yes, false);
    assert.equal(parsed.dryRun, false);
  });

  test('parses multiple packages', () => {
    const parsed = parseArgs(['express', 'cors', 'dotenv']);
    assert.deepEqual(parsed.packages, ['express', 'cors', 'dotenv']);
  });

  test('parses flags and pass-through flags', () => {
    const parsed = parseArgs(['-D', 'vitest', '-y', '--dry-run', '--strict', '--save-exact']);
    assert.deepEqual(parsed.packages, ['vitest']);
    assert.equal(parsed.yes, true);
    assert.equal(parsed.dryRun, true);
    assert.equal(parsed.strict, true);
    assert.ok(parsed.flags.includes('-D'));
    assert.ok(parsed.flags.includes('--save-exact'));
  });

  test('parses help and version flags', () => {
    const parsedHelp = parseArgs(['--help']);
    assert.equal(parsedHelp.help, true);

    const parsedVersion = parseArgs(['-v']);
    assert.equal(parsedVersion.version, true);
  });
});
