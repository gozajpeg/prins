import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { parseSpecifier, resolveAuthor, resolveLicense, resolveRegistryUrl, normalizeRepoUrl, extractPackageInfo } from '../src/registry.js';

describe('registry: parseSpecifier', () => {
  test('parses plain package name', () => {
    const parsed = parseSpecifier('express');
    assert.equal(parsed.name, 'express');
    assert.equal(parsed.version, 'latest');
  });

  test('parses package with version', () => {
    const parsed = parseSpecifier('express@4.19.2');
    assert.equal(parsed.name, 'express');
    assert.equal(parsed.version, '4.19.2');
  });

  test('parses scoped package without version', () => {
    const parsed = parseSpecifier('@types/node');
    assert.equal(parsed.name, '@types/node');
    assert.equal(parsed.version, 'latest');
  });

  test('parses scoped package with version', () => {
    const parsed = parseSpecifier('@types/node@20.12.0');
    assert.equal(parsed.name, '@types/node');
    assert.equal(parsed.version, '20.12.0');
  });

  test('parses package with dist-tag', () => {
    const parsed = parseSpecifier('react@next');
    assert.equal(parsed.name, 'react');
    assert.equal(parsed.version, 'next');
  });

  test('throws on empty or non-string input', () => {
    assert.throws(() => parseSpecifier(''), /non-empty string/);
    assert.throws(() => parseSpecifier(null), /non-empty string/);
  });

  test('throws on malformed scoped package name', () => {
    assert.throws(() => parseSpecifier('@invalid'), /Invalid scoped package specifier/);
  });
});

describe('registry: resolveAuthor', () => {
  test('resolves string author with email stripped', () => {
    const author = resolveAuthor({ author: 'Alice Smith <alice@example.com>' });
    assert.equal(author, 'Alice Smith');
  });

  test('resolves object author with name property', () => {
    const author = resolveAuthor({ author: { name: 'Bob Jones', email: 'bob@example.com' } });
    assert.equal(author, 'Bob Jones');
  });

  test('falls back to maintainers when author is missing', () => {
    const author = resolveAuthor({ maintainers: [{ name: 'Charlie', email: 'c@example.com' }] });
    assert.equal(author, 'Charlie');
  });

  test('falls back to _npmUser when author and maintainers missing', () => {
    const author = resolveAuthor({ _npmUser: { name: 'dave' } });
    assert.equal(author, 'dave');
  });

  test('returns Unknown when no author fields exist', () => {
    const author = resolveAuthor({});
    assert.equal(author, 'Unknown');
  });
});

describe('registry: resolveLicense', () => {
  test('resolves string license', () => {
    assert.equal(resolveLicense({ license: 'MIT' }), 'MIT');
  });

  test('resolves license object', () => {
    assert.equal(resolveLicense({ license: { type: 'Apache-2.0' } }), 'Apache-2.0');
  });

  test('resolves licenses array', () => {
    assert.equal(resolveLicense({ licenses: [{ type: 'BSD-3-Clause' }] }), 'BSD-3-Clause');
  });

  test('defaults to UNLICENSED when missing', () => {
    assert.equal(resolveLicense({}), 'UNLICENSED');
  });
});

describe('registry: resolveRegistryUrl', () => {
  test('returns customUrl when supplied', () => {
    assert.equal(resolveRegistryUrl(null, 'https://custom.npm.org/'), 'https://custom.npm.org');
  });

  test('falls back to default registry when no config exists', () => {
    const url = resolveRegistryUrl();
    assert.ok(url.startsWith('http'));
  });
});

describe('registry: normalizeRepoUrl', () => {
  test('cleans git+ prefix and .git suffix', () => {
    assert.equal(normalizeRepoUrl('git+https://github.com/expressjs/express.git'), 'https://github.com/expressjs/express');
  });

  test('cleans git:// protocol to https', () => {
    assert.equal(normalizeRepoUrl('git://github.com/colinhacks/zod.git'), 'https://github.com/colinhacks/zod');
  });

  test('converts git@ ssh to https url', () => {
    assert.equal(normalizeRepoUrl('git@github.com:foo/bar.git'), 'https://github.com/foo/bar');
  });

  test('handles object with url property', () => {
    assert.equal(normalizeRepoUrl({ url: 'https://github.com/foo/bar' }), 'https://github.com/foo/bar');
  });

  test('returns null for missing or invalid urls', () => {
    assert.equal(normalizeRepoUrl(null), null);
    assert.equal(normalizeRepoUrl('not-a-link'), null);
  });
});

describe('registry: extractPackageInfo', () => {
  test('extracts types, publishedAt, and repository', () => {
    const manifest = {
      name: 'zod',
      version: '3.22.4',
      types: './index.d.ts',
      repository: { url: 'git+https://github.com/colinhacks/zod.git' },
      dependencies: { depA: '^1.0.0' }
    };
    const packument = {
      time: { '3.22.4': '2023-10-01T00:00:00.000Z' }
    };
    const info = extractPackageInfo(manifest, '3.22.4', packument);
    assert.equal(info.name, 'zod');
    assert.equal(info.hasTypes, true);
    assert.equal(info.repository, 'https://github.com/colinhacks/zod');
    assert.equal(info.publishedAt, '2023-10-01T00:00:00.000Z');
    assert.equal(info.dependenciesCount, 1);
  });
});
