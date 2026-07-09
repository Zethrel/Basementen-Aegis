# Basementen Aegis

An offline-first cipher encoder/decoder with step-by-step process visualization. Runs as a static web page, an installable PWA, or a native desktop app — no data ever leaves your machine.

Created by Zethrel.

*Formerly known as Starlight Cipher Suite.*

## Ciphers

Caesar · ROT13 · Atbash · Vigenère · Rail Fence · Binary Converter · A1Z26 · Binary Reverse (custom) · Scandi Caesar (Danish/Norwegian/Swedish alphabets) · Elder Futhark runes · Morse code (with Æ/Ø/Å) · Anagram Helper · Caesar Brute Force helper (cracks unknown shifts, English or Scandinavian alphabets)

Plus **The Basementen** — a password-protected vault cipher. Messages are encrypted with AES-256-GCM (ciphertext format `SB1:<base64>`), and the vault's keys and transaction history are also AES-256-GCM encrypted at rest with keys derived from your passwords via PBKDF2. Ciphertexts created before the AES upgrade still decode via a built-in legacy path.

## Features

- Step-by-step breakdown of every encode/decode operation
- Fully offline — fonts, icons, and QR generation are all bundled locally, nothing is fetched over the network
- Local transaction history, with encrypted history for The Basementen vault
- Installable as a PWA, or run as a standalone desktop app

## Running it

**Web:** open `index.html` directly, or serve the folder with any static file server.

**Desktop (Windows, pre-built):** run `dist/BasementenAegis.exe`. Requires the Edge WebView2 runtime (included by default on Windows 10/11).

**Desktop (build it yourself):**
```bash
pip install pywebview pyinstaller
# Windows also needs:
pip install pythonnet
```
```powershell
# One-time (and after certificate expiry): create the 5-year signing
# certificate and export AegisRoot.cer so the build can bundle it
./sign_app.ps1

python -m PyInstaller BasementenAegis.spec --noconfirm

# Sign the freshly built executable with the same certificate
./sign_app.ps1
```
The built app lands in `dist/`. Always build and sign on the same machine — the signing certificate lives in that machine's user certificate store, and a new machine would mint a new identity that users have to re-trust.

## Privacy

Every cipher operation runs entirely client-side. The desktop app's bundled server binds only to `127.0.0.1` and is never exposed to your network.
