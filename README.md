# Basementen Aegis

An offline-first cipher encoder/decoder with step-by-step process visualization. Runs as a static web page, an installable PWA, or a native desktop app — no data ever leaves your machine.

Created by Zethrel.

## ⬇️ Get the app (no setup needed)

**Windows:** [**Download BasementenAegis.exe**](https://github.com/Zethrel/Basementen-Aegis/releases/latest/download/BasementenAegis.exe) — save it anywhere and double-click it. No installation, no Python, no commands. (All versions are on the [releases page](https://github.com/Zethrel/Basementen-Aegis/releases).)

> **First launch:** Windows may warn about an unrecognized publisher (the app is self-signed, not registered with Microsoft). Click **More info → Run anyway**. The app then offers a one-time certificate prompt — accepting it stops the warnings on that PC. Requires the Edge WebView2 runtime, which is built into Windows 10 and 11.

**Or skip the download entirely:** use it in your browser at [zethrel.github.io/Basementen-Aegis](https://zethrel.github.io/Basementen-Aegis/) — on a phone or desktop you can install it as an app from the browser menu, and it keeps working offline.

## Classic Ciphers & Encoding Tools

> **Important:** Except for The Basementen, every cipher in this application is included for learning, puzzles, and fun between friends. They are not secure encryption and should never be relied on to protect sensitive information.

Caesar (English or Danish/Norwegian/Swedish alphabets) · ROT13 · Atbash · Vigenère · Rail Fence · Binary Converter · A1Z26 (English or Scandinavian alphabets) · Binary Reverse (custom) · Elder Futhark runes · Morse code (with Æ/Ø/Å) · Anagram Helper · Caesar Brute Force helper (cracks unknown shifts, English or Scandinavian alphabets)

## Secure Vault

**The Basementen** — a password-protected encrypted vault. Messages are encrypted with AES-256-GCM (ciphertext format `SB1:<base64>`), and the vault's keys and transaction history are also AES-256-GCM encrypted at rest with keys derived from your passwords via Argon2id (memory-hard, 64 MiB).

**Threat model:** The Basementen is designed to protect stored messages against someone who gains access to your files without knowing your password. It does not protect against malware running on your computer or someone who knows your password.

## Features

- Step-by-step breakdown of every encode/decode operation
- Fully offline — fonts, icons, and QR generation are all bundled locally, nothing is fetched over the network
- Encrypted transaction log for The Basementen vault (nothing else is persisted)
- Installable as a PWA, or run as a standalone desktop app

## Running it

**Web:** open `index.html` directly, or serve the folder with any static file server.

**Desktop (Windows, pre-built):** grab the exe from the [download link above](#%EF%B8%8F-get-the-app-no-setup-needed). Requires the Edge WebView2 runtime (included by default on Windows 10/11).

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

To publish a build: bump `APP_VERSION` in `version.js` to match the new release tag (it's shown in the app's footer), rebuild, then attach `dist/BasementenAegis.exe` to a new [GitHub Release](https://github.com/Zethrel/Basementen-Aegis/releases/new) — don't commit the exe. The README's download link always points at the latest release automatically.

## Privacy

Every cipher operation runs entirely client-side. The desktop app's bundled server binds only to `127.0.0.1` and is never exposed to your network.
