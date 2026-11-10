"""
Two-laptop co-op server for the B035 Lab Safety Simulator.

Run on ONE laptop (the host):
    python server.py            (or: python3 server.py)
Then open the address it prints on BOTH laptops. Both must be on the same Wi-Fi.

Uses only the Python standard library: nothing to install.
Put this file in the same folder as index.html.
"""
import json, os, socket, sys, threading, time, uuid
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from functools import partial
from pathlib import Path

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else int(os.environ.get("PORT", "8000"))
ROOT = Path(__file__).resolve().parent
TIMEOUT = 5.0  # seconds without a sync before a player counts as disconnected

lock = threading.Lock()
clients = {}  # id -> {"role", "pos", "share", "inbox", "seen"}


def active():
    now = time.time()
    for cid in [c for c, v in clients.items() if now - v["seen"] > TIMEOUT]:
        del clients[cid]
    return clients


def partner_of(cid):
    me = clients.get(cid)
    if not me:
        return None
    for other_id, v in clients.items():
        if other_id != cid and v["role"] == 3 - me["role"]:
            return other_id
    return None


class Handler(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass  # keep the terminal quiet

    def reply(self, data, code=200):
        body = json.dumps(data).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def do_POST(self):
        length = int(self.headers.get("Content-Length", 0) or 0)
        try:
            data = json.loads(self.rfile.read(length) or b"{}")
        except json.JSONDecodeError:
            data = {}
        with lock:
            active()
            if self.path == "/api/join":
                taken = {v["role"] for v in clients.values()}
                role = 1 if 1 not in taken else (2 if 2 not in taken else 0)
                if not role:
                    return self.reply({"role": 0})
                cid = uuid.uuid4().hex
                clients[cid] = {"role": role, "pos": None, "share": None, "inbox": [], "seen": time.time()}
                print(f"Player {role} joined from {self.client_address[0]}")
                return self.reply({"id": cid, "role": role})

            if self.path == "/api/sync":
                cid = data.get("id")
                me = clients.get(cid)
                if not me:
                    return self.reply({"error": "unknown player, reload the page"}, 410)
                me["seen"] = time.time()
                me["pos"] = data.get("pos")
                if data.get("share") is not None:
                    me["share"] = data["share"]
                pid = partner_of(cid)
                if pid:
                    clients[pid]["inbox"].extend(data.get("out") or [])
                inbox, me["inbox"] = me["inbox"], []
                peer = None
                if pid:
                    p = clients[pid]
                    peer = {"pos": p["pos"], "share": p["share"]}
                return self.reply({"peer": peer, "inbox": inbox})
        self.reply({"error": "not found"}, 404)


def lan_ip():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(("10.255.255.255", 1))  # no data is sent; this just picks the Wi-Fi interface
        return s.getsockname()[0]
    except OSError:
        return "127.0.0.1"
    finally:
        s.close()


if __name__ == "__main__":
    server = ThreadingHTTPServer(("0.0.0.0", PORT), partial(Handler, directory=str(ROOT)))
    ip = lan_ip()
    print("B035 Lab Safety Simulator: two-player server")
    print(f"  This laptop:   http://localhost:{PORT}")
    print(f"  Other laptop:  http://{ip}:{PORT}")
    print("The first browser to open the page is Player 1, the second is Player 2.")
    print("Press Ctrl+C to stop.")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopped.")
