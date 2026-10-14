<div align="center">
  <img src="assets/prinsLogo.webp" alt="prins logo" width="380" />
  <h1>prins</h1>
  <p><strong>Pre-install package inspector for Node.js</strong></p>
  <p>Inspect size, licenses, authors, deprecations, and install scripts before packages touch your disk.</p>

  <p>
    <a href="https://nodejs.org"><img src="https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg?style=flat-square" alt="node version" /></a>
    <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square" alt="license" /></a>
    <a href="https://github.com/gozajpeg"><img src="https://img.shields.io/badge/author-gozajpeg-blue.svg?style=flat-square" alt="author" /></a>
  </p>
</div>

---

### Overview

When you run `npm install <package>`, the default behavior downloads and extracts files without previewing key metadata:
- How much unpacked disk space the package consumes.
- What license the package is distributed under (e.g. permissive MIT vs copyleft GPL).
- Who authored and published the release.
- Whether the package includes `preinstall` or `postinstall` shell scripts that execute during installation.
- Whether the package version is marked deprecated by maintainers.

**`prins`** (short for **pr**e-**ins**tall) is a command-line wrapper that fetches package metadata directly from the public npm registry before installation, displays a clear summary card, and asks for confirmation before downloading.

---

### Terminal Preview

#### Single Package Inspection

```text
+--------------------------------------------------------------------------+
| PACKAGE SUMMARY: axios@1.7.2
+--------------------------------------------------------------------------+
| Author:          jasonsaayman
| License:         MIT
| Unpacked Size:   1.8 MB (direct)
| Dependencies:    4 direct packages
| Status:          Active
| Install Scripts: None
+--------------------------------------------------------------------------+

Install package? [Y/n]: 
```

- Press **Enter** (defaults to Yes) to proceed with installation.
- Press **n** to cancel. Nothing is downloaded or added to `package.json`.

---

#### Multi-Package Inspection

When installing multiple packages, `prins` queries the registry in parallel and formats the results in a single table:

```text
+---------------------------------------------------------------------------------------+
| PRE-INSTALL SUMMARY (3 packages requested)
+---------------------------------------------------------------------------------------+
| Package       | Version | Author          | License | Size    | Scripts  | Status     |
| :------------ | :------ | :-------------- | :------ | :------ | :------- | :--------- |
| express       | 4.19.2  | Douglas Wilson  | MIT     | 210 KB  | None     | Active     |
| cors          | 2.8.5   | Troy Goode      | MIT     | 18 KB   | None     | Active     |
| moment        | 2.30.1  | Iskren Chernev  | MIT     | 4.3 MB  | None     | Deprecated |
+---------------------------------------------------------------------------------------+
| TOTAL: 3 packages | ~4.5 MB unpacked
+---------------------------------------------------------------------------------------+

Install all 3 packages? [Y/n]: 
```

---

### What `prins` Checks

1. **Unpacked Disk Size:** Displays the unpacked file size from registry metadata so you know the disk footprint before downloading.
2. **License Classification:** Flags copyleft licenses (GPL, AGPL, SSPL) so you can avoid unintended licensing obligations in commercial codebases.
3. **Install Lifecycle Scripts:** Identifies whether the package declares `preinstall` or `postinstall` scripts that execute arbitrary commands during installation.
4. **Deprecation Warnings:** Displays maintainer deprecation notices if a package version has been formally marked deprecated on npm.
5. **Author & Maintainers:** Shows the package author and publisher identity.

---

### Installation & Usage

Install globally:

```bash
npm install -g prins
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

# Skip confirmation prompt (preview receipt and install immediately)
prins -y typescript

# Preview only (inspect metadata without installing)
prins --dry-run express
```

---

### Package Manager Delegation

`prins` detects your project's lockfile and delegates the install command to your active package manager:

| Detected Lockfile | Delegated Command |
| :--- | :--- |
| `pnpm-lock.yaml` | `pnpm add <packages>` |
| `yarn.lock` | `yarn add <packages>` |
| `bun.lockb` / `bun.lock` | `bun add <packages>` |
| Default | `npm install <packages>` |

---

### Design

- **Zero Runtime Dependencies:** Built using Node.js built-ins (`fetch`, `node:util.styleText`, `node:readline/promises`, `node:child_process`).
- **Fast:** Single HTTP request to `registry.npmjs.org/<package>/latest`.
- **Pass-Through Flags:** Forwards flags (`-D`, `-E`, etc.) to the underlying package manager.

---

### License

MIT License. Copyright (c) 2026 gozajpeg.
