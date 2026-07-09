================================================================================
                           STARLIGHT CIPHER SUITE
================================================================================

An offline-first, standalone cryptographic suite designed for secret messaging, 
encoding, and decoding. Built natively as a desktop application.

Created by Zethrel - Argent Dawn EU for the Starlight guild.

--------------------------------------------------------------------------------
FEATURES
--------------------------------------------------------------------------------

* Multiple Cipher Standards:
  Supports Caesar, ROT13, Atbash, Vigenere, Rail Fence, Binary Converter,
  A1Z26, and a custom Binary Reverse cipher.

* Step-by-Step Visualization:
  Interactive process logging showing exactly how the encryption/decryption 
  works for each character.

* 100% Offline & Private:
  All cryptographic operations occur strictly in memory on your local machine. 
  No data is sent or received over the network.

* Local History Log:
  Persists transaction logs locally in your application's sandboxed storage. 
  Clear them at any time with a single click.

* Network Hardened:
  The backend server binds strictly to the local loopback address (127.0.0.1), 
  ensuring no other devices on your LAN can access the port.

--------------------------------------------------------------------------------
HOW TO RUN
--------------------------------------------------------------------------------

Windows (Pre-compiled):
Simply double-click the pre-compiled executable:
  dist\StarlightCipherSuite.exe

Note: Microsoft Edge WebView2 runtime is required. This is built into 
Windows 11 and all modern updates of Windows 10 by default.

--------------------------------------------------------------------------------
BUILDING ON OTHER OPERATING SYSTEMS (macOS / Linux)
--------------------------------------------------------------------------------

The codebase is fully compatible with macOS and Linux. To compile a native app 
bundle or executable for your platform, follow these steps:

Prerequisites:
1. Install Python 3.10 or newer on your system.
2. Ensure you have the Python package manager 'pip' installed.

Step-by-Step Build Instructions:
1. Open your Terminal and navigate to the application folder.
2. Install the dependencies required to run and build the GUI:
   pip install pywebview pythonnet pyinstaller
3. Compile the app using the provided specification file:
   python -m PyInstaller StarlightCipherSuite.spec --noconfirm
4. Locate your built application in the "dist" folder:
   - macOS: Look for the native .app bundle (e.g. dist/StarlightCipherSuite.app).
            You can drag this to your Applications folder.
   - Linux: Look for the standalone binary executable dist/StarlightCipherSuite.

--------------------------------------------------------------------------------
GENERAL USAGE GUIDE
--------------------------------------------------------------------------------

1. Select Cipher: Choose an encryption method from the left sidebar navigation.
2. Configure Parameters: Adjust keys, shifts, or keyphrases where applicable 
   in the control panel.
3. Input Text: Type or paste your message into the Input Text area.
4. Toggle Mode: Switch between Encrypt and Decrypt as needed.
5. Analyze Process: Watch the step-by-step cryptographic transformations 
   scroll dynamically in the Process Log terminal.
6. Manage History: Copy results to your clipboard, and manage your local 
   session log in the history panel.
