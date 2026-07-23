# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Basementen Aegis is an offline-first cipher encoder/decoder with step-by-step process visualization. It ships three ways from the same source: a static web page, an installable PWA, and a Windows desktop app (pywebview + PyInstaller). Everything runs client-side; no data leaves the machine.

## Development commands

There is no build step, package.json, or linter. The web app is plain ES modules loaded directly by `index.html`.

**Run the web app** (a static server is needed because `app.js`/`ciphers.js` are ES modules):

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

**Run the tests** (Node ≥ 22 built-in runner, zero dependencies — keep it that way):

```bash
node --test
```

Tests live in `tests/*.test.mjs` and cover the pure algorithms in `ciphers.js`. Add cases there when adding or changing a cipher.

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

The web app is a set of ES modules with `app.js` as the entry point (the only file `index.html` loads with `<script type="module">`):

- **`ciphers.js`** — pure cipher algorithms, no DOM access. Each cipher is an exported object with `encode(text, param, retainPunctuation)` / `decode(...)` methods that return `{ result: string, steps: Array<{ title, content }> }`. The `steps` array drives the step-by-step process panel in the UI. Simple substitution ciphers (Caesar, Atbash, Vigenère) share the `processChars()` per-character loop helper. Caesar and A1Z26 take a `variant` parameter selecting an alphabet from `CAESAR_ALPHABETS` (English or the 29-letter Danish/Norwegian and Swedish sets, shared with the brute-force helper).

- **`registry.js`** — the `CIPHERS` registry array, the single source of truth for every cipher: each entry declares `id`, `name`, `shortName`, `icon` (a Lucide icon name), `paramGroup` (the id of a parameter panel in `index.html`), optional `badge`, `modeless: true` for helpers with no encode/decode split, optional `ioLabels`, and a `run(input, mode, opts)` function that reads its parameters from `elements` and calls into `ciphers.js`. The sidebar nav is generated from this registry (`renderCipherNav`).

- **`app.js`** — the controller/entry module: `init()`, `runConversion()` dispatching through the registry, the process panel rendering, `setupUIFromState()`, all cipher-agnostic event handlers, and service-worker registration.

- **`dom.js`** (`elements` map of every DOM node), **`state.js`** (shared `state` object + localStorage load/save/migration), **`ui.js`** (modals, toasts, `showConfirm`). No message text is ever persisted — only interface preferences in `aegis_state`.

- **`index.html`** — holds one `.param-group` div per parameter panel (`param-caesar`, `param-vigenere`, …, and `param-none` for parameterless ciphers). `showActiveParameterGroup()` in `app.js` toggles them by id.

- **`sw.js`** — service worker with a cache-first strategy and an explicit `PRECACHE_URLS` list.

- **`launcher.py`** — desktop entry point: serves the bundled files from a `127.0.0.1`-only HTTP server and opens a pywebview window. Also handles the one-time Windows certificate-trust prompt.

- **`BasementenAegis.spec`** — PyInstaller spec; its `datas` list enumerates every file bundled into the exe.

### Adding or changing a cipher

1. Implement the algorithm as an exported object in `ciphers.js`, returning `{ result, steps }`. Add test cases in `tests/ciphers.test.mjs`.
2. Import it in `registry.js` and add an entry to the `CIPHERS` registry.
3. If it needs parameters, add a `.param-group` div in `index.html`, register the controls in `elements` (`dom.js`), and wire them in `bindEvents()` in `app.js`; otherwise use `paramGroup: 'param-none'`.

### Service worker cache version — always bump it

Whenever any file listed in `PRECACHE_URLS` changes (which includes `app.js`, `ciphers.js`, `styles.css`, `index.html`), bump `CACHE_VERSION` in `sw.js` (e.g. `aegis-v4` → `aegis-v5`). Without the bump, installed PWA/desktop clients keep serving the stale cached build. New static assets must be added to `PRECACHE_URLS` *and* to the `datas` list in `BasementenAegis.spec` (and ideally the `expected_files` check in `launcher.py`).

### Offline constraint

The app must work fully offline. All dependencies are vendored locally (`lucide.min.js`, `qrcode.js`, `fonts/`). Never add a CDN link, external font, or any network fetch to the web app.

## Educational scope

Basementen Aegis is purely an educational cipher toolkit. Every cipher is a classic/historical algorithm for learning and puzzles — none is secure encryption, and the app says so in the sidebar disclaimer and README. There is intentionally no cryptography-at-rest, no passwords, and no stored message content; the only persisted state is interface preferences in `aegis_state` (see `state.js`). (The app previously shipped a password-protected AES-256-GCM vault called "The Basementen"; it was removed. `migrateCipherId()` in `state.js` maps the retired `basementen` cipher id to `caesar`, and any orphaned `basementen_*` localStorage keys from old installs are left untouched rather than deleted.)

## Conventions

- Vanilla JS only — no framework, no bundler, no npm. Keep it that way unless asked.
- Icons come from the bundled Lucide set; `icon:` values in the `CIPHERS` registry are Lucide icon names.
- Ciphers support Scandinavian alphabets (Æ/Ø/Å, Danish/Norwegian/Swedish variants) via a per-cipher alphabet dropdown reading `CAESAR_ALPHABETS` — Caesar, A1Z26, Affine, Playfair, Four-Square, Bifid, Polybius, Bacon, Morse, Beaufort, Autokey, Gronsfeld, Keyword Substitution, and the brute-force helper all follow this pattern. Gronsfeld is a Vigenère variant keyed by digits (0-9); Four-Square uses two keyword grids and Bifid a keyword-seeded Polybius square (both reuse the Playfair/Polybius grid geometry). The transposition ciphers (Columnar, Scytale) are position-based and alphabet-agnostic, so Scandinavian characters pass through untouched. Younger Futhark is a lossy 16-rune transliteration that maps Æ/Ø/Å (and Ä/Ö) onto their nearest runes. Some (Playfair/Polybius) switch grid dimensions for the 29-letter alphabets; Affine's modulus becomes 29 (prime, so every multiplier is valid — the `a` dropdown is rebuilt from `affineCoprimes(m)`). Retired registry ids (e.g. `scandicaesar`, merged into `caesar`) are mapped forward in `migrateCipherId()` in `state.js`.
- `dist/`, `build/`, `AegisRoot.cer`, and `*.exe` are build outputs and are not committed (`BasementenAegis.spec` is the one committed spec file). Built exes are distributed by attaching them to GitHub Releases; the README download link tracks the latest release automatically. When cutting a release, bump `APP_VERSION` in `version.js` to match the tag — it's displayed in the app footer.
