# Starlight Cipher Suite

An offline-first cipher encoder/decoder with step-by-step process visualization. Runs as a static web page, an installable PWA, or a native desktop app — no data ever leaves your machine.

Created by Zethrel — Argent Dawn EU, for the Starlight guild.

## Ciphers

Caesar · ROT13 · Atbash · Vigenère · Rail Fence · Binary Converter · A1Z26 · Binary Reverse (custom) · Scandi Caesar (Danish/Norwegian/Swedish alphabets) · Anagram Helper

Plus **The Basementen** — a password-protected vault cipher, with transactions encrypted at rest using AES-256-GCM (key derived via Argon2id).

## Features

- Step-by-step breakdown of every encode/decode operation
- Fully offline — fonts, icons, and QR generation are all bundled locally, nothing is fetched over the network
- Local transaction history, with encrypted history for The Basementen vault
- Installable as a PWA, or run as a standalone desktop app

## Running it

**Web:** open `index.html` directly, or serve the folder with any static file server.

**Desktop (Windows, pre-built):** run `dist/StarlightCipherSuite.exe`. Requires the Edge WebView2 runtime (included by default on Windows 10/11).

**Desktop (build it yourself):**
```bash
pip install pywebview pyinstaller
# Windows also needs:
pip install pythonnet

python -m PyInstaller StarlightCipherSuite.spec --noconfirm
```
The built app lands in `dist/`.

## Privacy

Every cipher operation runs entirely client-side. The desktop app's bundled server binds only to `127.0.0.1` and is never exposed to your network.

## Testing

```bash
npm install       # dev-only: the Playwright test driver + the tool used to vendor argon2.min.js
npm test          # unit tests (ciphers.js) + browser-driven security tests (the vault)
npm run test:unit
npm run test:security
```

The security suite drives a real browser against the vault ("The Basementen") to check
things like: the master key is encrypted at rest, wrong passwords and tampered storage
fail closed, the vault auto-locks on idle/tab-hidden, user-supplied transaction data can't
inject markup into the history views, and vaults created before Argon2id was introduced
still unlock and get silently upgraded.

## Vendored dependencies

`lucide.min.js`, `qrcode.js`, and `argon2.min.js` are committed straight into the repo so the
app stays a dependency-free static page with nothing fetched at runtime. `argon2.min.js` is
`node_modules/hash-wasm/dist/argon2.umd.min.js` (its WASM binary is inlined as base64, so no
extra `.wasm` file to ship) - to update it: bump the `hash-wasm` devDependency, `npm install`,
then re-copy that file over `argon2.min.js` and bump the `?v=` query string in `index.html`.
