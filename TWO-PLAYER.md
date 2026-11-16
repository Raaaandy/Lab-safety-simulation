# Playing together on two laptops

The B035 Lab Safety Simulator can be played by two people on two laptops on the same Wi-Fi. One laptop runs a small server (`server.py`), and both laptops open the game in a browser.

The online version on GitHub Pages and a double-clicked `index.html` are always single-player. Two-player mode only turns on when the page comes from `server.py`.

## What you need

- Two laptops on the **same Wi-Fi network**
- **Python 3** on the host laptop. macOS usually has it already. On Windows, install it from python.org and tick "Add Python to PATH".
- This whole folder on the host laptop, with `server.py` next to `index.html`. The other laptop needs nothing except a browser.

Nothing else needs to be installed.

## Start a session

1. **On the host laptop**, open a terminal in this folder and run:
   ```bash
   python3 server.py
   ```
   On Windows, use `python server.py`. It prints two addresses, for example:
   ```
   This laptop:   http://localhost:8000
   Other laptop:  http://192.168.1.23:8000
   ```
2. **On the host laptop**, open the first address (`http://localhost:8000`) in Chrome, Edge or Firefox. You are **Player 1**.
3. **On the other laptop**, type the second address (`http://192.168.1.23:8000` in this example) into the browser. You are **Player 2**.
4. Play. When you're done, press **Ctrl+C** in the terminal to stop the server.

On each laptop, **you** are the blue circle tagged "P1 (you)" or "P2 (you)", and your **partner** is the orange circle tagged "P1" or "P2". The side panel shows "You: Player 1. Partner: connected" (or "not connected").

- **Restart** on either laptop restarts the drill for both players.
- If your partner joins after you've started, the drill starts again for both of you.
- If your partner leaves or loses connection, you keep playing on your own from where you were.

## How the two-player drill works

The steps are the same as single-player, but some need both of you:

| Step | With two players |
|---|---|
| 1. PPE | **Both** players must gear up at the cubbies before the drill continues. |
| 2–4. Acetone | Either player can fetch it. Only the player carrying it can dispense it in the fume hood and return it. |
| 5. Spill kit | One player guards the spill to keep others away while the other fetches the spill kit from the blue cabinet. |
| 6. Clean up | **Both** players must stand at the edge of the spill; then either presses E. Alone, you hear "You need your partner at the spill to contain it from both sides." |
| 7. Eyewash | The player who carried the spill kit gets the splash and must reach the eyewash within 10 seconds. The partner guides them. |
| 8. Evacuation | **Both** players must leave through an exit within 25 seconds. |

The co-op steps have no extra timers; only the eyewash and evacuation are timed, as in single-player.

**Scoring.** The team shares one score, starting at 100. Each player's mistakes count separately and name the player, for example "Violation: Player 2: Ran inside the lab."

**Accessibility.** Every message appears on **both** laptops: in the Latest bar, the event log, the screen reader announcements and read-aloud. Pressing **Q** (Describe) also tells you where your partner is, for example "Your partner is 2.1 m east." When the side panel is hidden, the Latest bar shows whether your partner is connected.

## Troubleshooting

- **The other laptop can't open the address.**
  - Check both laptops are on the same Wi-Fi network.
  - The host's firewall may be blocking it. On macOS, click **Allow** if asked about incoming connections. On Windows, allow Python on **Private networks** when the firewall prompt appears. If you clicked Cancel, open "Allow an app through Windows Firewall" and tick Python.
  - Campus and public Wi-Fi often block laptops from connecting to each other. If so, turn on a **phone's personal hotspot**, connect **both laptops** to it, and start `server.py` again (the address changes).
- **"Address already in use".** Another program is using port 8000. Run `python3 server.py 8080` and use port 8080 in both addresses.
- **"python3 is not recognized".** On Windows, use `python server.py`, or reinstall Python with "Add Python to PATH" ticked.
- **A third browser opens the page.** It plays single-player; only two players can join at once.
- **The partner shows "not connected" after a laptop slept.** Reload the page on that laptop.

## How it works (for developers)

`server.py` uses only the Python standard library. It serves the game files and relays messages: the first browser to call `POST /api/join` becomes Player 1 (host), the second Player 2 (guest). About 10 times a second each browser calls `POST /api/sync` with its position; the reply contains the partner's position, the host's drill snapshot and any queued messages. A browser that stops syncing for 5 seconds is dropped.

The host runs all of the drill logic (steps, rules, timers, score) for both players. The guest moves its own circle and sends its position, its E presses and its own running violations; it draws the drill from the host's snapshot. The client side is in `js/net.js`; see the README for where the rest lives.
