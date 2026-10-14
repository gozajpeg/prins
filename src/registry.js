import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

export function resolveRegistryUrl(scope = null, customUrl = null) {
  if (customUrl) {
    return customUrl.replace(/\/$/, '');
  }

  const envRegistry = process.env.NPM_CONFIG_REGISTRY || process.env.npm_config_registry;
  if (envRegistry) {
    return envRegistry.trim().replace(/\/$/, '');
  }

  try {
    const cwdNpmrc = path.join(process.cwd(), '.npmrc');
    const homeNpmrc = path.join(os.homedir(), '.npmrc');
    const npmrcPath = fs.existsSync(cwdNpmrc) ? cwdNpmrc : (fs.existsSync(homeNpmrc) ? homeNpmrc : null);

    if (npmrcPath) {
      const lines = fs.readFileSync(npmrcPath, 'utf8').split(/\r?\n/);
      if (scope) {
        const scopedPrefix = `${scope}:registry=`;
        const scopedLine = lines.find(l => l.trim().startsWith(scopedPrefix));
        if (scopedLine) {
          return scopedLine.split('=')[1].trim().replace(/\/$/, '');
        }
      }
      const regLine = lines.find(l => l.trim().startsWith('registry='));
      if (regLine) {
        return regLine.split('=')[1].trim().replace(/\/$/, '');
      }
    }
  } catch {
    // Fall back to public npm registry
  }

  return 'https://registry.npmjs.org';
}

// Package specifier parsing and npm registry queries

export function parseSpecifier(specifier) {
  if (!specifier || typeof specifier !== 'string') {
    throw new Error('Package specifier must be a non-empty string');
  }
  const trimmed = specifier.trim();
  if (trimmed.startsWith('@') && !trimmed.includes('/')) {
    throw new Error(`Invalid scoped package specifier: "${specifier}"`);
  }
  const atIndex = trimmed.lastIndexOf('@');
  if (atIndex > 0) {
    return { name: trimmed.slice(0, atIndex), version: trimmed.slice(atIndex + 1) || 'latest', raw: trimmed };
  }
  return { name: trimmed, version: 'latest', raw: trimmed };
}

export function resolveAuthor(manifest) {
  if (typeof manifest.author === 'string') {
    return manifest.author.replace(/<[^>]+>/g, '').trim();
  }
  if (manifest.author && typeof manifest.author === 'object' && manifest.author.name) {
    return manifest.author.name.trim();
  }
  if (Array.isArray(manifest.maintainers) && manifest.maintainers.length > 0) {
    const first = manifest.maintainers[0];
    if (typeof first === 'string') return first.trim();
    if (first && first.name) return first.name.trim();
  }
  if (manifest._npmUser && manifest._npmUser.name) {
    return manifest._npmUser.name.trim();
  }
  return 'Unknown';
}

export function resolveLicense(manifest) {
  if (typeof manifest.license === 'string' && manifest.license.trim()) {
    return manifest.license.trim();
  }
  if (manifest.license && typeof manifest.license === 'object' && manifest.license.type) {
    return manifest.license.type.trim();
  }
  if (Array.isArray(manifest.licenses) && manifest.licenses.length > 0) {
    const first = manifest.licenses[0];
    if (typeof first === 'string') return first.trim();
    if (first && first.type) return first.type.trim();
  }
  return 'UNLICENSED';
}

export async function fetchPackageMetadata(specifier, options = {}) {
  const { name, version } = parseSpecifier(specifier);
  const timeoutMs = options.timeoutMs ?? 10000;
  const scope = name.startsWith('@') ? name.slice(0, name.indexOf('/')) : null;
  const registryUrl = resolveRegistryUrl(scope, options.registryUrl);

  // npm requires scoped names to be URI encoded as @scope%2Fpkg
  const encodedName = name.replace('/', '%2f');

  // Try direct fetch for specific tag/version
  const versionUrl = `${registryUrl}/${encodedName}/${encodeURIComponent(version)}`;

  let response;
  try {
    response = await fetch(versionUrl, {
      signal: AbortSignal.timeout(timeoutMs),
      headers: {
        'Accept': 'application/json'
      }
    });
  } catch (err) {
    throw new Error(`Failed to reach npm registry for "${name}": ${err.message}`);
  }

  if (response.status === 404) {
    // If version 404, maybe specifier is a range or packument is needed
    const packumentUrl = `${registryUrl}/${encodedName}`;
    let packumentRes;
    try {
      packumentRes = await fetch(packumentUrl, {
        signal: AbortSignal.timeout(timeoutMs),
        headers: { 'Accept': 'application/json' }
      });
    } catch {
      throw new Error(`Package "${name}" was not found on the npm registry.`);
    }

    if (!packumentRes.ok) {
      throw new Error(`Package "${name}" was not found on the npm registry.`);
    }

    const packument = await packumentRes.json();
    const latestVersion = packument['dist-tags']?.latest;
    const targetVersion = (packument.versions && packument.versions[version])
      ? version
      : latestVersion;

    if (!targetVersion || !packument.versions?.[targetVersion]) {
      throw new Error(`Version "${version}" for package "${name}" was not found on the npm registry.`);
    }

    return extractPackageInfo(packument.versions[targetVersion], targetVersion);
  }

  if (!response.ok) {
    throw new Error(`Registry returned HTTP ${response.status} for "${name}".`);
  }

  const manifest = await response.json();
  return extractPackageInfo(manifest, manifest.version || version);
}

function extractPackageInfo(manifest, resolvedVersion) {
  const author = resolveAuthor(manifest);
  const license = resolveLicense(manifest);
  const unpackedSize = manifest.dist?.unpackedSize ?? null;
  const dependencies = manifest.dependencies ? Object.keys(manifest.dependencies) : [];
  const deprecated = manifest.deprecated || null;
  const scripts = manifest.scripts || {};

  return {
    name: manifest.name,
    version: resolvedVersion,
    author,
    license,
    unpackedSize,
    dependenciesCount: dependencies.length,
    dependencies,
    deprecated,
    scripts,
    raw: manifest
  };
}

export async function fetchMultiplePackages(specifiers, options = {}) {
  const results = await Promise.allSettled(
    specifiers.map(spec => fetchPackageMetadata(spec, options))
  );

  const succeeded = [];
  const failed = [];

  for (let i = 0; i < results.length; i++) {
    const res = results[i];
    if (res.status === 'fulfilled') {
      succeeded.push(res.value);
    } else {
      failed.push({ specifier: specifiers[i], error: res.reason.message });
    }
  }

  return { succeeded, failed };
}
