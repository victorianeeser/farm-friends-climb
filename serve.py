# Local dev server that tells browsers not to cache, so phones always load the latest files.
# Usage: python3 serve.py   (then open http://localhost:8000 or http://<LAN-IP>:8000)
import http.server
import os

os.chdir(os.path.dirname(os.path.abspath(__file__)))


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()


http.server.ThreadingHTTPServer(('', 8000), NoCacheHandler).serve_forever()
