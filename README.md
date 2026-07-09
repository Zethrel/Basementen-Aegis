# Starlight Cipher Suite

An offline-first cipher encoder/decoder with step-by-step process visualization. Runs as a static web page, an installable PWA, or a native desktop app — no data ever leaves your machine.

Created by Zethrel — Argent Dawn EU, for the Starlight guild.

## Ciphers

Caesar · ROT13 · Atbash · Vigenère · Rail Fence · Binary Converter · A1Z26 · Binary Reverse (custom) · Scandi Caesar (Danish/Norwegian/Swedish alphabets) · Anagram Helper

Plus **The Basementen** — a password-protected vault cipher. Messages are encrypted with AES-256-GCM (ciphertext format `SB1:<base64>`), and the vault's keys and transaction history are also AES-256-GCM encrypted at rest with keys derived from your passwords via PBKDF2. Ciphertexts created before the AES upgrade still decode via a built-in legacy path.

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
