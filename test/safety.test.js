import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { checkScriptsSafety, classifyLicense, assessPackageSafety } from '../src/safety.js';

describe('safety: checkScriptsSafety', () => {
  test('marks packages without install hooks as Safe', () => {
    const result = checkScriptsSafety({
      test: 'vitest',
      build: 'tsc',
      lint: 'eslint .'
    });
    assert.equal(result.isSafe, true);
    assert.equal(result.hooks.length, 0);
    assert.equal(result.shortLabel, 'Safe');
    assert.match(result.label, /Safe/);
  });

  test('flags postinstall hook', () => {
    const result = checkScriptsSafety({
      postinstall: 'node ./setup.js'
    });
    assert.equal(result.isSafe, false);
    assert.deepEqual(result.hooks, ['postinstall']);
    assert.equal(result.shortLabel, 'Warning');
    assert.match(result.label, /postinstall/);
  });

  test('flags preinstall hook', () => {
    const result = checkScriptsSafety({
      preinstall: 'check-node-version'
    });
    assert.equal(result.isSafe, false);
    assert.deepEqual(result.hooks, ['preinstall']);
  });

  test('flags install hook (such as node-gyp build)', () => {
    const result = checkScriptsSafety({
      install: 'node-gyp rebuild'
    });
    assert.equal(result.isSafe, false);
    assert.deepEqual(result.hooks, ['install']);
  });

  test('flags multiple hooks simultaneously', () => {
    const result = checkScriptsSafety({
      preinstall: 'echo pre',
      postinstall: 'echo post'
    });
    assert.equal(result.isSafe, false);
    assert.deepEqual(result.hooks, ['preinstall', 'postinstall']);
  });
});

describe('safety: classifyLicense', () => {
  test('classifies permissive licenses', () => {
    const mit = classifyLicense('MIT');
    assert.equal(mit.type, 'permissive');
    assert.equal(mit.isRisk, false);

    const apache = classifyLicense('Apache-2.0');
    assert.equal(apache.type, 'permissive');
    assert.equal(apache.isRisk, false);

    const isc = classifyLicense('ISC');
    assert.equal(isc.type, 'permissive');
    assert.equal(isc.isRisk, false);
  });

  test('classifies copyleft licenses as risks', () => {
    const gpl = classifyLicense('GPL-3.0');
    assert.equal(gpl.type, 'copyleft');
    assert.equal(gpl.isRisk, true);

    const agpl = classifyLicense('AGPL-3.0');
    assert.equal(agpl.type, 'copyleft');
    assert.equal(agpl.isRisk, true);

    const sspl = classifyLicense('SSPL-1.0');
    assert.equal(sspl.type, 'copyleft');
    assert.equal(sspl.isRisk, true);
  });

  test('classifies unlicensed as risk', () => {
    const unl = classifyLicense('UNLICENSED');
    assert.equal(unl.isRisk, true);
  });
});

describe('safety: assessPackageSafety', () => {
  test('returns isClean: true for safe permissive active package', () => {
    const assessment = assessPackageSafety({
      name: 'express',
      license: 'MIT',
      scripts: { test: 'mocha' },
      deprecated: null
    });
    assert.equal(assessment.isClean, true);
    assert.equal(assessment.scripts.isSafe, true);
    assert.equal(assessment.deprecation.isDeprecated, false);
  });

  test('returns isClean: false if deprecated', () => {
    const assessment = assessPackageSafety({
      name: 'request',
      license: 'Apache-2.0',
      scripts: {},
      deprecated: 'request has been deprecated'
    });
    assert.equal(assessment.isClean, false);
    assert.equal(assessment.deprecation.isDeprecated, true);
    assert.equal(assessment.deprecation.statusLabel, 'Deprecated');
  });

  test('returns isClean: false if postinstall script present', () => {
    const assessment = assessPackageSafety({
      name: 'pkg-with-script',
      license: 'MIT',
      scripts: { postinstall: 'node build.js' },
      deprecated: null
    });
    assert.equal(assessment.isClean, false);
    assert.equal(assessment.scripts.isSafe, false);
  });
});
