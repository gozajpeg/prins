<div align="center">
  <img src="assets/prinsLogo.webp" alt="prins logo" width="380" />
  <h1>prins</h1>
  <p><strong>Pre-install package inspector for Node.js</strong></p>
  <p>Inspect size, licenses, deprecations, install scripts, and native Node alternatives before you install.</p>

  <p>
    <a href="https://www.npmjs.com/package/prins"><img src="https://img.shields.io/npm/v/prins.svg?style=flat-square" alt="npm version" /></a>
    <a href="https://nodejs.org"><img src="https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg?style=flat-square" alt="node version" /></a>
    <a href="#"><img src="https://img.shields.io/badge/dependencies-0-success.svg?style=flat-square" alt="zero dependencies" /></a>
    <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square" alt="license" /></a>
  </p>
</div>

---

### The Problem

When you run `npm install <package>`, npm is a silent black box:

```text
added 14 packages in 2s
found 0 vulnerabilities
```

It tells you virtually nothing about what just entered your codebase:
- **No size transparency:** You have no idea if you just added 200 KB or 45 MB to `node_modules`.
- **No lifecycle script warnings:** You do not know if the package executed a `postinstall` script with arbitrary shell commands on your computer.
- **No license verification:** You do not know if the package uses a copyleft license (like GPL or AGPL) that could legally force you to open-source your proprietary code.
- **No deprecation alerts:** You do not know if the library was abandoned years ago.
- **No modern Node awareness:** You do not know if modern Node.js already includes a built-in standard library feature that replaces the package for free.

---

### The Solution: `prins`

**`prins`** (shorthand for **pr**e-**ins**tall) acts as a transparent pre-flight gatekeeper.

Before any file is downloaded to your disk, `prins` queries the public npm registry in ~100ms, displays a comprehensive **Package Nutrition Label**, and prompts you to confirm or abort:

```text
+--------------------------------------------------------------------------+
| PACKAGE NUTRITION LABEL: axios@1.7.2
+--------------------------------------------------------------------------+
| Publisher:       jasonsaayman (verified maintainer)
| License:         MIT (Permissive - safe for commercial use)
| Unpacked Size:   1.8 MB (direct) | 4.2 MB (with 4 sub-dependencies)
| Dependencies:    4 direct packages (follow-redirects, form-data, proxy-from-env)
| Status:          Active (published 2 weeks ago)
| Install Scripts: None (Safe - no pre/postinstall shell execution)
+--------------------------------------------------------------------------+
| Native Node Tip: Your project targets Node >=18.0.0.
|                  Global native 'fetch' is built-in and requires 0 dependencies.
+--------------------------------------------------------------------------+

Install package? [Y/n]:
```

- Press **Enter** (default Yes): `prins` delegates directly to your package manager.
- Press **n**: `prins` cancels immediately. Nothing touches your disk or `package.json`.

---

### Quick Start

Install globally to make `prins` available in every project and terminal:

```bash
npm install -g prins
```

Once installed, use `prins` anywhere you would normally use `npm install`:

```bash
# Single package inspection
prins express

# Install as devDependency (-D)
prins -D vitest

# Install exact version (-E)
prins -E lodash@4.17.21

# Multiple packages at once
prins express cors dotenv axios

# Non-interactive mode (print receipt and install immediately)
prins -y typescript
```

*(You can also use the short 3-letter binary alias `pri` out of the box).*

---

### Multi-Package Inspection Table

When installing multiple dependencies simultaneously, `prins` fetches all registry manifests in parallel and prints a consolidated summary table:

```text
+-----------------------------------------------------------------------------------------+
| PRE-INSTALL INSPECTION (4 packages requested)
+-----------------------------------------------------------------------------------------+
| Package       | Version | License | Size    | Scripts  | Status & Notes                 |
| :------------ | :------ | :------ | :------ | :------- | :----------------------------- |
| express       | 4.19.2  | MIT     | 210 KB  | None     | Active                         |
| cors          | 2.8.5   | MIT     | 18 KB   | None     | Active                         |
| dotenv        | 16.4.5  | BSD-2   | 72 KB   | None     | Tip: Node >=20.6 has --env-file |
| axios         | 1.7.2   | MIT     | 1.8 MB  | None     | Tip: Native fetch available    |
+-----------------------------------------------------------------------------------------+
| TOTAL: 4 packages | ~2.1 MB unpacked
| SUMMARY: 0 copyleft warnings, 0 dangerous install scripts, 2 native Node alternatives
+-----------------------------------------------------------------------------------------+

Install all 4 packages? [Y/n]:
```

---

### Four Automated Guardrails

#### 1. Security: Arbitrary Lifecycle Script Execution
Most npm supply-chain attacks and credential stealers hide inside `preinstall` or `postinstall` scripts that execute silently during install.
`prins` parses the package manifest and alerts you in bold text if arbitrary shell execution is requested:
```text
[SECURITY WARNING] This package executes a postinstall script:
  Command: "node ./scripts/postinstall.js"
```
When a lifecycle script is detected, the confirmation prompt automatically defaults to **No** (`[y/N]`).

#### 2. Legal: Copyleft License Warnings
Commercial and proprietary applications cannot safely incorporate copyleft licenses (`GPL-2.0`, `GPL-3.0`, `AGPL-3.0`, `SSPL`) without risking legal compliance issues or being forced to open-source their codebase.
`prins` classifies licenses into:
- **Permissive (Safe):** MIT, Apache-2.0, BSD-2/3-Clause, ISC.
- **Copyleft (High Risk):** GPL, AGPL, LGPL, SSPL, Commons Clause.
If a copyleft license is detected, `prins` highlights the legal risk and defaults to `[y/N]`.

#### 3. Deprecation and Abandonment Warnings
If a package version has been formally deprecated by maintainers (such as `request`, `querystring`, or legacy `moment`), `prins` prints the official deprecation message and maintainer recommendation before you add it.

#### 4. Modern Node.js Standard Library Alternatives
Many popular npm packages exist solely to provide functionality that modern Node.js now provides natively:
- `uuid` -> native `crypto.randomUUID()` (Node >=14.17 / >=16.0)
- `rimraf` / `mkdirp` -> native `fs.rmSync` / `fs.mkdirSync` (Node >=14.14 / >=10.12)
- `dotenv` -> native `--env-file=.env` (Node >=20.6)
- `axios` / `node-fetch` -> global native `fetch` (Node >=18.0)
- `delay` / `sleep-promise` -> native `timers/promises` (Node >=15.0)
- `strip-ansi` -> native `node:util.stripVTControlCharacters` (Node >=16.11)
- `chalk` / `picocolors` -> native `node:util.styleText` (Node >=20.12)
`prins` checks your target Node version and reminds you when an external dependency is unnecessary.

---

### Universal Package Manager Detection

`prins` automatically inspects your current directory to detect which package manager you use:

| Lockfile Found | Delegated Command |
| :--- | :--- |
| `pnpm-lock.yaml` | `pnpm add <packages>` |
| `yarn.lock` | `yarn add <packages>` |
| `bun.lockb` / `bun.lock` | `bun add <packages>` |
| Default | `npm install <packages>` |

You never have to remember different flags or switch tools across monorepo packages.

---

### CLI Flags & Options

| Flag | Description |
| :--- | :--- |
| `-D, --save-dev` | Installs as a devDependency |
| `-E, --save-exact` | Saves the exact version to package.json |
| `-y, --yes` | Non-interactive mode: displays the receipt and installs immediately |
| `--dry-run` | Preview only: inspects and displays metadata without installing |
| `--strict` | Fails and aborts automatically if any warning (GPL, script, deprecation) is found |
| `-v, --version` | Prints prins version |
| `-h, --help` | Displays CLI help |

---

### Design Principles

- **True Zero Runtime Dependencies:** Built strictly using the Node.js standard library. No bloated third-party dependency tree.
- **Ultra Fast:** Executes in ~100ms using asynchronous parallel HTTP requests to the public registry.
- **Zero Friction:** Same arguments and flags as `npm install`. Press Enter to proceed.

---

### License

MIT License. Copyright (c) 2026 gozajpeg.
