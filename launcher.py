import os
import sys
import threading
import http.server
import socketserver
import webview
import tempfile
import traceback
import subprocess
import ctypes

# Determine resource path (required for PyInstaller --add-data extraction)
def resource_path(relative_path):
    try:
        # PyInstaller creates a temporary folder and stores the path in _MEIPASS
        base_path = sys._MEIPASS
    except Exception:
        base_path = os.path.abspath(".")
    return os.path.join(base_path, relative_path)

# Setup file logging in the temp directory to help diagnose issues in windowed mode
log_path = os.path.join(tempfile.gettempdir(), "basementen_aegis.log")
try:
    log_file = open(log_path, "w", encoding="utf-8", buffering=1)
    sys.stdout = log_file
    sys.stderr = log_file
except Exception:
    # Fallback to devnull if we can't write to the temp directory
    sys.stdout = open(os.devnull, "w")
    sys.stderr = open(os.devnull, "w")

def log(msg):
    try:
        sys.stdout.write(f"[INFO] {msg}\n")
        sys.stdout.flush()
    except:
        pass

def log_err(msg):
    try:
        sys.stderr.write(f"[ERROR] {msg}\n")
        sys.stderr.flush()
    except:
        pass

PORT = 8000
httpd = None

class LoggingHTTPHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        # Explicitly serve files from the resource directory
        super().__init__(*args, directory=resource_path("."), **kwargs)

    def end_headers(self):
        # Without an explicit Cache-Control header, WebView2's Chromium engine applies
        # heuristic freshness and may skip revalidation after a rebuild, serving a stale
        # disk-cached copy. This forces a conditional GET (If-Modified-Since) on every
        # request; SimpleHTTPRequestHandler already answers those with a cheap 304 when
        # the file is unchanged, so this doesn't cost a full re-download each launch.
        self.send_header('Cache-Control', 'no-cache')
        super().end_headers()

    def log_message(self, format, *args):
        log(f"Request: {format % args}")

    def log_error(self, format, *args):
        log_err(f"Handler error: {format % args}")

class LoggingTCPServer(socketserver.TCPServer):
    allow_reuse_address = True

    def handle_error(self, request, client_address):
        err_msg = traceback.format_exc()
        log_err(f"Server exception for {client_address}:\n{err_msg}")

# Marker file so the trust prompt below only ever runs once per machine,
# regardless of what the person chose.
CERT_PROMPT_FLAG = os.path.join(
    os.getenv('APPDATA', tempfile.gettempdir()), 'BasementenAegis', 'cert_prompt_shown.flag'
)

def offer_certificate_trust():
    """On first launch (Windows only), ask whether to install this build's signing
    certificate as a trusted publisher, so Windows stops flagging it as unrecognized.
    Requires explicit consent every time it's shown - never installs silently."""
    if sys.platform != 'win32':
        return
    if os.path.exists(CERT_PROMPT_FLAG):
        return

    cert_path = resource_path('AegisRoot.cer')
    if not os.path.exists(cert_path):
        log_err(f"Certificate not found at {cert_path}, skipping trust prompt.")
        return

    MB_YESNO = 0x04
    MB_ICONQUESTION = 0x20
    IDYES = 6

    message = (
        'This copy of Basementen Aegis is signed by "Zethrel".\n\n'
        "Install this certificate as a trusted publisher so Windows stops showing "
        "security warnings for it on this PC?\n\n"
        "You won't be asked again."
    )
    log("Prompting user for certificate trust decision.")
    choice = ctypes.windll.user32.MessageBoxW(
        0, message, "Trust Basementen Aegis?", MB_YESNO | MB_ICONQUESTION
    )

    if choice == IDYES:
        for store in ('Root', 'TrustedPublisher'):
            try:
                result = subprocess.run(
                    ['certutil', '-user', '-addstore', store, cert_path],
                    capture_output=True, text=True,
                    creationflags=subprocess.CREATE_NO_WINDOW
                )
                if result.returncode == 0:
                    log(f"Installed certificate to Current User's {store} store.")
                else:
                    log_err(f"certutil failed for {store} (code {result.returncode}): {result.stdout}{result.stderr}")
            except Exception as e:
                log_err(f"Error installing certificate to {store}: {e}")
    else:
        log("User declined certificate trust prompt.")

    # Remember we've asked - regardless of the answer - so we never nag on future launches.
    try:
        os.makedirs(os.path.dirname(CERT_PROMPT_FLAG), exist_ok=True)
        with open(CERT_PROMPT_FLAG, 'w') as f:
            f.write('1')
    except Exception as e:
        log_err(f"Could not write cert prompt flag: {e}")

def main():
    global httpd, PORT

    log("Initializing Basementen Aegis Standalone Desktop Application")
    log(f"CWD: {os.getcwd()}")
    log(f"Resource path: {resource_path('.')}")

    # Check if files exist in the resource directory
    expected_files = ['index.html', 'styles.css', 'app.js', 'ciphers.js', 'sw.js', 'logo.png',
                       'icon.png', 'lucide.min.js', 'qrcode.js', 'fonts/fonts.css', 'AegisRoot.cer']
    for file in expected_files:
        path = resource_path(file)
        exists = os.path.exists(path)
        log(f"File '{file}' check: {path} (Exists: {exists})")

    offer_certificate_trust()

    # Initialize the server on a free port synchronously on the main thread
    while True:
        try:
            httpd = LoggingTCPServer(("127.0.0.1", PORT), LoggingHTTPHandler)
            log(f"Successfully bound server to port {PORT}")
            break
        except OSError as e:
            log(f"Port {PORT} occupied. Retrying next port. Error: {e}")
            PORT += 1
            
    # Run the server in a background daemon thread
    server_thread = threading.Thread(target=httpd.serve_forever, daemon=True)
    server_thread.start()
    log("Background server thread started.")
    
    # Create pywebview window pointing to 127.0.0.1 (IPv4 loopback)
    # This avoids IPv6 DNS resolution issues with 'localhost' on Windows
    log(f"Creating webview window pointing to http://127.0.0.1:{PORT}")
    webview.create_window(
        title="Basementen Aegis",
        url=f"http://127.0.0.1:{PORT}",
        width=1200,
        height=800,
        min_size=(900, 600),
    )
    
    # Start webview loop (blocks until window is closed)
    log("Starting webview event loop")
    webview.start(private_mode=False, debug=False)
    log("Webview event loop exited")
    
    # Clean up server on exit
    if httpd:
        log("Shutting down background server")
        try:
            httpd.shutdown()
            log("Server shutdown complete")
        except Exception as e:
            log_err(f"Error during server shutdown: {e}")
            
if __name__ == '__main__':
    main()
