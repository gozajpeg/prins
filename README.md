<div align="center">
  <img src="assets/prinsLogo.webp" alt="prins logo" width="380" />
  <h1>prins</h1>
  <p><strong>npm Pre-Install Package Inspector</strong></p>
  <p>Know what's inside before it hits your disk.</p>

  <p>
    <a href="https://nodejs.org"><img src="https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg?style=flat-square" alt="node version" /></a>
    <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square" alt="license" /></a>
    <a href="https://github.com/gozajpeg"><img src="https://img.shields.io/badge/author-gozajpeg-blue.svg?style=flat-square" alt="author" /></a>
  </p>
</div>

---

### Overview

When installing packages, the default package manager behavior downloads and extracts files without previewing key metadata:
- How much unpacked disk space the package consumes directly.
- How many direct dependencies it declares.
- What license the package is distributed under.
- Who authored and published the release.
- Whether the package executes background installation scripts.
- Whether the package version is marked deprecated by maintainers.

**`prins`** is a command-line wrapper that fetches package metadata directly from registry metadata before installation, displays a summary card, and asks for confirmation before downloading.

---

### Terminal Preview

#### Single Package Inspection

<p align="center">
  <img src="assets/prinsSingle.webp" alt="prins single package inspection" width="760" />
</p>

- Press **Enter** to proceed with installation when no warnings exist.
- If a package has warnings, the prompt defaults to **No** to prevent accidental installation.
- Press **n** to cancel. Nothing is downloaded or added to `package.json`.

---

#### Multi-Package Inspection

When installing multiple packages, `prins` queries the registry in parallel and formats the results in a single table:

<p align="center">
  <img src="assets/prinsMulti.webp" alt="prins multi-package inspection" width="860" />
</p>

---

### What `prins` Checks

1. **Unpacked Disk Size:** Displays the unpacked file size of the package reported by registry metadata so you know the direct file footprint before downloading.
2. **Direct Dependencies:** Displays the count of direct dependencies declared by the package manifest.
3. **License Classification:** Identifies permissive and copyleft license terms directly from registry metadata.
4. **Install Scripts:** Checks whether the package executes background scripts during installation.
5. **Deprecation Warnings:** Displays maintainer deprecation notices if a package version has been formally marked deprecated on npm.
6. **Author & Maintainers:** Displays the package author, maintainer, or publisher name from registry metadata.
7. **TypeScript Types:** Detects whether type declarations are bundled inside the package archive.
8. **Release Age & Freshness:** Displays release date and flags fresh releases published less than 7 days ago.
9. **Source Repository:** Displays the verified source code repository link and alerts when package metadata lacks source links.
10. **Script Safe-Install:** Provides an interactive option to proceed with installation while disabling lifecycle scripts using `--ignore-scripts`.

---

### What `prins` Does Not Check

- **Vulnerabilities:** Does not scan CVE vulnerability databases. Tools such as `npm audit` or `npq` perform security advisory scanning.
- **Transitive Dependency Tree:** Reports direct metadata declared by the requested package, not the full recursive disk tree resolved after download.
- **Peer Dependency Conflicts:** Semver resolution and peer conflicts are handled by your package manager during installation.

---

### Installation & Usage

Install globally:

```bash
npm install -g prins-cli
```

Run in place of `npm install`:

```bash
# Single package
prins express

# Save as devDependency
prins -D vitest

# Save exact version
prins -E lodash@4.17.21

# Multiple packages
prins express cors dotenv

# Skip confirmation prompt and install immediately
prins -y typescript

# Preview metadata without installing
prins --dry-run express
```

---

### Non-Interactive Environments & CI

When running in CI pipelines or non-interactive terminals without a user present:
- Running `prins <package>` without `-y` or `--dry-run` exits with code `1` and prompts you to pass `-y` to confirm or `--dry-run` to preview.
- **Strict gatekeeper check:** Run `prins --strict --dry-run <packages>`. Exits with code `1` if any package contains install scripts, deprecation notices, or copyleft licenses.
- **Machine-readable JSON:** Run `prins --json <packages>` to output structured metadata for automation scripts and coding agent hooks.

| Exit Code | Meaning |
| :--- | :--- |
| `0` | Success, preview completed, or package installation succeeded |
| `1` | Package not found, network error, strict check failed, or non-interactive run without `-y` |

---

### Package Manager Delegation

`prins` detects your project lockfile and delegates the install command to your active package manager:

| Detected Lockfile | Delegated Command |
| :--- | :--- |
| `pnpm-lock.yaml` | `pnpm add <packages>` |
| `yarn.lock` | `yarn add <packages>` |
| `bun.lockb` / `bun.lock` | `bun add <packages>` |
| Default | `npm install <packages>` |

Standard flags such as `-D` and `-E` are supported across all four package managers and forwarded directly.

---

### Registries & Configuration

`prins` resolves registry endpoints in the following priority order:
1. Environment variable `NPM_CONFIG_REGISTRY`
2. Scoped and default registry entries in local or home `.npmrc`
3. Public npm registry at `https://registry.npmjs.org`

---

### Design

- **Zero Runtime Dependencies:** Built strictly using Node.js standard library built-ins.
- **Direct Registry Queries:** Fetches package metadata directly from registry endpoints with parallel batching and no third-party proxies.
- **Pass-Through Flags:** Forwards installation flags directly to the underlying package manager.

---

### License

MIT License.
