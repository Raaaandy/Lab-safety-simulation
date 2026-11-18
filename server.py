"""
server.py: two-laptop co-op server for the B035 Lab Safety Simulator (see TWO-PLAYER.md).

Run on ONE laptop (the host), in this folder:
    python3 server.py           (Windows: python server.py; other port: python3 server.py 8080)
Then open the addresses it prints: localhost on this laptop, the LAN address on the other one.
Both laptops must be on the same Wi-Fi.

It serves the game files and passes messages between the browsers (js/net.js):
    POST /api/rooms/create  creates a room and joins as Player 1
    POST /api/rooms/join    joins an existing room by its code, up to 2 players
    POST /api/leave  sent when a tab closes, frees its role at once
    POST /api/sync   about 10 times a second: stores this browser's position and (host only) drill
                     snapshot; returns the partner's position, the host's snapshot and queued messages
A browser that has not synced for 5 seconds is dropped, freeing its role.
Uses only the Python standard library: nothing to install.
"""
import json, os, random, socket, sys, threading, time, uuid
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from functools import partial
from pathlib import Path

# Port: command line, else the PORT environment variable (set by hosts like Render), else 8000
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else int(os.environ.get("PORT", 8000))
ROOT = Path(__file__).resolve().parent
TIMEOUT = 5.0  # seconds without a sync before a player is dropped and their role is freed
PEER_STALE = 2.0  # a partner silent this long is not reported, so the other laptop notices quickly

sys.stdout.reconfigure(line_buffering=True)  # show prints at once in hosted logs (e.g. Render)

lock = threading.Lock()
clients = {}  # id -> {"role", "pos", "share", "inbox", "seen"}
ROOM_CODE_LENGTH = 6
ROOM_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"


def active():
    now = time.time()
    for cid in [c for c, v in clients.items() if now - v["seen"] > TIMEOUT]:
        print(f"Room {clients[cid]['room']}: Player {clients[cid]['role']} timed out")
        del clients[cid]
    return clients


def partner_of(cid):
    me = clients.get(cid)
    if not me:
        return None
    for other_id, v in clients.items():
        if other_id != cid and v["room"] == me["room"] and v["role"] == 3 - me["role"]:
            return other_id
    return None


def new_room_code():
    while True:
        code = "".join(random.choice(ROOM_CODE_CHARS) for _ in range(ROOM_CODE_LENGTH))
        if not any(v["room"] == code for v in clients.values()):
            return code


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
            if self.path == "/api/rooms/create":
                room = new_room_code()
                cid = uuid.uuid4().hex
                clients[cid] = {"room": room, "role": 1, "pos": None, "share": None, "inbox": [], "seen": time.time()}
                print(f"Room {room}: Player 1 created from {self.client_address[0]}")
                return self.reply({"id": cid, "room": room, "role": 1})

            if self.path == "/api/rooms/join":
                supplied_room = data.get("room")
                if not isinstance(supplied_room, str):
                    return self.reply({"error": "Enter a valid 6-character room code."}, 400)
                room = supplied_room.strip().upper()
                if len(room) != ROOM_CODE_LENGTH or any(ch not in ROOM_CODE_CHARS for ch in room):
                    return self.reply({"error": "Enter a valid 6-character room code."}, 400)
                members = [v for v in clients.values() if v["room"] == room]
                if not members:
                    return self.reply({"error": "Room not found. Check the code or create a new room."}, 404)
                taken = {v["role"] for v in members}
                role = next((candidate for candidate in (1, 2) if candidate not in taken), None)
                if role is None:
                    return self.reply({"error": "This room is full. Each room supports two players."}, 409)
                cid = uuid.uuid4().hex
                clients[cid] = {"room": room, "role": role, "pos": None, "share": None, "inbox": [], "seen": time.time()}
                print(f"Room {room}: Player {role} joined from {self.client_address[0]}")
                return self.reply({"id": cid, "room": room, "role": role})

            if self.path == "/api/status":
                return self.reply({"rooms": True})

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
                if pid and time.time() - clients[pid]["seen"] < PEER_STALE:
                    p = clients[pid]
                    peer = {"pos": p["pos"], "share": p["share"]}
                return self.reply({"peer": peer, "inbox": inbox})
            if self.path == "/api/leave":  # sent when a tab closes, so the partner hears at once
                me = clients.pop(data.get("id"), None)
                if me:
                    print(f"Room {me['room']}: Player {me['role']} left")
                return self.reply({})
        self.reply({"error": "not found"}, 404)

    def do_GET(self):
        if self.path == "/api/status":
            return self.reply({"rooms": True})
        return super().do_GET()


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
    print("Create a room in the browser, then share its 6-character code with the other player.")
    print("Press Ctrl+C to stop.")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopped.")
