import os
import sys
import threading
import http.server
import socketserver
import webview
import tempfile
import traceback

# Determine resource path (required for PyInstaller --add-data extraction)
def resource_path(relative_path):
    try:
        # PyInstaller creates a temporary folder and stores the path in _MEIPASS
        base_path = sys._MEIPASS
    except Exception:
        base_path = os.path.abspath(".")
    return os.path.join(base_path, relative_path)

# Setup file logging in the temp directory to help diagnose issues in windowed mode
log_path = os.path.join(tempfile.gettempdir(), "starlight_cipher_suite.log")
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

    def log_message(self, format, *args):
        log(f"Request: {format % args}")

    def log_error(self, format, *args):
        log_err(f"Handler error: {format % args}")

class LoggingTCPServer(socketserver.TCPServer):
    allow_reuse_address = True
    
    def handle_error(self, request, client_address):
        err_msg = traceback.format_exc()
        log_err(f"Server exception for {client_address}:\n{err_msg}")

def main():
    global httpd, PORT
    
    log("Initializing Starlight Cipher Suite Standalone Desktop Application")
    log(f"CWD: {os.getcwd()}")
    log(f"Resource path: {resource_path('.')}")
    
    # Check if files exist in the resource directory
    expected_files = ['index.html', 'styles.css', 'app.js', 'ciphers.js']
    for file in expected_files:
        path = resource_path(file)
        exists = os.path.exists(path)
        log(f"File '{file}' check: {path} (Exists: {exists})")
        
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
        title="Starlight Cipher Suite",
        url=f"http://127.0.0.1:{PORT}",
        width=1200,
        height=800,
        min_size=(900, 600),
    )
    
    # Start webview loop (blocks until window is closed)
    log("Starting webview event loop")
    webview.start()
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
