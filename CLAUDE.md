# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Basementen Aegis is an offline-first cipher encoder/decoder with step-by-step process visualization. It ships three ways from the same source: a static web page, an installable PWA, and a Windows desktop app (pywebview + PyInstaller). Everything runs client-side; no data leaves the machine.

## Development commands

There is no build step, package.json, test suite, or linter. The web app is plain ES modules loaded directly by `index.html`.

**Run the web app** (a static server is needed because `app.js`/`ciphers.js` are ES modules):

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

**Build the desktop app** (Windows):

```bash
pip install pywebview pyinstaller pythonnet
```
```powershell
./sign_app.ps1                                        # one-time: mint cert + export AegisRoot.cer
python -m PyInstaller BasementenAegis.spec --noconfirm
./sign_app.ps1                                        # sign the built dist/BasementenAegis.exe
```

Build and sign on the same machine — the certificate lives in that machine's user cert store; a new machine mints a new identity users must re-trust.

## Architecture

Two JavaScript files carry almost all the logic:

- **`ciphers.js`** — pure cipher algorithms, no DOM access. Each cipher is an exported object with `encode(text, param, retainPunctuation)` / `decode(...)` methods that return `{ result: string, steps: Array<{ title, content }> }`. The `steps` array drives the step-by-step process panel in the UI. Simple substitution ciphers (Caesar, Atbash, ScandiCaesar, Vigenère) share the `processChars()` per-character loop helper. The Basementen cipher is the exception: it's `async` (WebCrypto AES-256-GCM) and returns empty `steps`.

- **`app.js`** — the UI controller. The central piece is the `CIPHERS` registry array: each entry declares `id`, `name`, `shortName`, `icon` (a Lucide icon name), `paramGroup` (the id of a parameter panel in `index.html`), optional `badge`, `modeless: true` for helpers with no encode/decode split, optional `ioLabels`, and a `run(input, mode, opts)` function that reads its parameters from `elements` and calls into `ciphers.js`. The sidebar nav is generated from this registry.

- **`index.html`** — holds one `.param-group` div per parameter panel (`param-caesar`, `param-vigenere`, …, and `param-none` for parameterless ciphers). `showActiveParameterGroup()` in `app.js` toggles them by id.

- **`sw.js`** — service worker with a cache-first strategy and an explicit `PRECACHE_URLS` list.

- **`launcher.py`** — desktop entry point: serves the bundled files from a `127.0.0.1`-only HTTP server and opens a pywebview window. Also handles the one-time Windows certificate-trust prompt.

- **`BasementenAegis.spec`** — PyInstaller spec; its `datas` list enumerates every file bundled into the exe.

### Adding or changing a cipher

1. Implement the algorithm as an exported object in `ciphers.js`, returning `{ result, steps }`.
2. Import it in `app.js` and add an entry to the `CIPHERS` registry.
3. If it needs parameters, add a `.param-group` div in `index.html` and wire the controls into `elements` / `bindEvents()` in `app.js`; otherwise use `paramGroup: 'param-none'`.
4. Add a friendly name in `getFriendlyCipherName()` if the history panel should label it.

### Service worker cache version — always bump it

Whenever any file listed in `PRECACHE_URLS` changes (which includes `app.js`, `ciphers.js`, `styles.css`, `index.html`), bump `CACHE_VERSION` in `sw.js` (e.g. `aegis-v4` → `aegis-v5`). Without the bump, installed PWA/desktop clients keep serving the stale cached build. New static assets must be added to `PRECACHE_URLS` *and* to the `datas` list in `BasementenAegis.spec` (and ideally the `expected_files` check in `launcher.py`).

### Offline constraint

The app must work fully offline. All dependencies are vendored locally (`lucide.min.js`, `qrcode.js`, `fonts/`). Never add a CDN link, external font, or any network fetch to the web app.

## The Basementen vault

The password-protected cipher has its crypto split across both JS files:

- `ciphers.js` (`Basementen`): message encryption. AES-256-GCM via WebCrypto, key = SHA-256 of the transaction key string, 12-byte random IV prepended to the ciphertext, output format `SB1:<base64(iv + ciphertext)>`.
- `app.js`: vault/session management. The master password derives a key via PBKDF2 (`deriveKeyFromPassword`) that encrypts the vault's transaction keys and history at rest.

Persistent state lives in `localStorage` under `aegis_state`, `aegis_history`, and `basementen_salt` / `basementen_iv` / `basementen_encrypted_key` / `basementen_history`. `migrateLegacyStorage()` in `app.js` renames pre-rebrand keys; keep it in mind if renaming keys again.

## Conventions

- Vanilla JS only — no framework, no bundler, no npm. Keep it that way unless asked.
- Icons come from the bundled Lucide set; `icon:` values in the `CIPHERS` registry are Lucide icon names.
- Ciphers support Scandinavian alphabets (Æ/Ø/Å, Danish/Norwegian/Swedish variants) where it makes sense — see `ScandiCaesar`, `Morse`, `CaesarBruteForce` for the pattern.
- `dist/`, `build/`, `AegisRoot.cer`, and `*.exe` are build outputs and are not committed (`BasementenAegis.spec` is the one committed spec file).
