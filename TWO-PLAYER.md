# Playing together on two laptops

The game supports two players on two laptops on the same Wi-Fi. One laptop runs a small server; both laptops open the game in a browser.

## What you need

- Two laptops on the **same Wi-Fi network**
- **Python 3** on the host laptop (macOS: usually already installed; Windows: install from python.org and tick "Add Python to PATH")
- This folder: `index.html` and `server.py` must sit next to each other

Nothing else needs to be installed.

## Start a session

1. **On the host laptop**, open a terminal in this folder and run:
   ```bash
   python3 server.py
   ```
   (On Windows, use `python server.py`.) It prints two addresses, for example:
   ```
   This laptop:   http://localhost:8000
   Other laptop:  http://192.168.1.23:8000
   ```
2. **On the host laptop**, open the first address in a browser. You are **Player 1** (blue circle).
3. **On the other laptop**, open the second address. You are **Player 2**. Each player sees themselves in blue and their partner in orange.
4. Play. Press **Ctrl+C** in the terminal when you're done.

If you click **Restart** on either laptop, the drill restarts for both players.

## How the two-player drill works

| Step | What changes with two players |
|---|---|
| PPE | **Both** players must gear up at the cubbies before the drill continues. |
| Acetone | Either player can fetch it; only the player carrying it can dispense or return it. |
| Spill | One player guards the spill while the other fetches the kit. To clean it, **both** must stand at the edge of the spill. |
| Eyewash | The player who cleaned the spill gets splashed and must reach the eyewash; the partner can guide them. |
| Evacuation | **Both** players must leave through an exit. |

The team shares one score. Violations name the player who made them, for example "Player 2: Ran inside the lab". Every message appears in both players' event logs and is read aloud on both laptops. Pressing **Q** also tells you where your partner is.

## Troubleshooting

- **The other laptop can't open the address.**
  - Check both laptops are on the same Wi-Fi network.
  - The host's firewall may block the connection. On macOS, click "Allow" if asked about incoming connections. On Windows, allow Python on **Private networks** when the firewall prompt appears.
  - Campus Wi-Fi often blocks laptops from connecting to each other. If so, connect **both laptops to a phone's personal hotspot** and start again.
- **"Address already in use".** Another program is using port 8000. Run `python3 server.py 8080` and use port 8080 in the addresses instead.
- **A third browser opens the page.** It plays single-player; only two players can join at once.
- **Opening `index.html` by double-clicking, or from GitHub Pages,** gives the normal single-player game. Two-player mode only turns on when the page comes from `server.py`.
