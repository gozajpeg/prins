// Package installation safety and license classification

const COPYLEFT_LICENSES = new Set([
  'GPL-2.0',
  'GPL-2.0-ONLY',
  'GPL-2.0-OR-LATER',
  'GPL-3.0',
  'GPL-3.0-ONLY',
  'GPL-3.0-OR-LATER',
  'AGPL-3.0',
  'AGPL-3.0-ONLY',
  'AGPL-3.0-OR-LATER',
  'LGPL-2.1',
  'LGPL-2.1-ONLY',
  'LGPL-2.1-OR-LATER',
  'LGPL-3.0',
  'LGPL-3.0-ONLY',
  'LGPL-3.0-OR-LATER',
  'SSPL-1.0',
  'EUPL-1.1',
  'EUPL-1.2',
  'MPL-1.1',
  'MPL-2.0'
]);

const PERMISSIVE_LICENSES = new Set([
  'MIT',
  'APACHE-2.0',
  'BSD-2-CLAUSE',
  'BSD-3-CLAUSE',
  'ISC',
  '0BSD',
  'UNLICENSE',
  'CC0-1.0',
  'WTFPL',
  'BLUEOAK-1.0.0'
]);

// Lifecycle hooks that run automatically during dependency installation
const INSTALL_HOOKS = ['preinstall', 'install', 'postinstall'];

export function checkScriptsSafety(scripts = {}) {
  const detected = [];
  for (const hook of INSTALL_HOOKS) {
    if (scripts && typeof scripts[hook] === 'string' && scripts[hook].trim().length > 0) {
      detected.push(hook);
    }
  }

  if (detected.length > 0) {
    return {
      isSafe: false,
      hooks: detected,
      label: `Warning: ${detected.join(', ')}`,
      shortLabel: 'Warning',
      description: `Executes background ${detected.join(', ')} script during installation`
    };
  }

  return {
    isSafe: true,
    hooks: [],
    label: 'None',
    shortLabel: 'None',
    description: 'No background scripts executed during installation'
  };
}

export function classifyLicense(licenseStr) {
  if (!licenseStr || typeof licenseStr !== 'string') {
    return {
      type: 'unknown',
      license: 'UNLICENSED',
      isRisk: true,
      label: 'Unlicensed'
    };
  }

  const normalized = licenseStr.trim().toUpperCase();

  if (COPYLEFT_LICENSES.has(normalized)) {
    return {
      type: 'copyleft',
      license: licenseStr,
      isRisk: true,
      label: 'Copyleft (Commercial Risk)'
    };
  }

  if (PERMISSIVE_LICENSES.has(normalized)) {
    return {
      type: 'permissive',
      license: licenseStr,
      isRisk: false,
      label: 'Permissive'
    };
  }

  // Look for GPL substrings in composite expressions like "GPL-3.0-or-later"
  if (normalized.includes('GPL') || normalized.includes('AGPL') || normalized.includes('SSPL')) {
    return {
      type: 'copyleft',
      license: licenseStr,
      isRisk: true,
      label: 'Copyleft (Commercial Risk)'
    };
  }

  if (normalized === 'UNLICENSED' || normalized.startsWith('SEE LICENSE IN')) {
    return {
      type: 'proprietary',
      license: licenseStr,
      isRisk: true,
      label: 'Proprietary / Unlicensed'
    };
  }

  return {
    type: 'custom',
    license: licenseStr,
    isRisk: false,
    label: 'Custom'
  };
}

export function assessPackageSafety(manifest) {
  const scriptSafety = checkScriptsSafety(manifest.scripts);
  const licenseInfo = classifyLicense(manifest.license);
  const isDeprecated = Boolean(manifest.deprecated);
  const deprecationReason = manifest.deprecated || null;

  const isClean = scriptSafety.isSafe && !licenseInfo.isRisk && !isDeprecated;

  return {
    scripts: scriptSafety,
    license: licenseInfo,
    deprecation: {
      isDeprecated,
      reason: deprecationReason,
      statusLabel: isDeprecated ? 'Deprecated' : 'Active'
    },
    isClean
  };
}
