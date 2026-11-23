# B035 Lab Safety Simulator — User / Non-CSE Handoff

This is the plain-language guide for users and maintainers without a computer science background. It explains what the main files do, where common content changes belong, and how to check your work. For function-level technical notes, see [HANDOFF-CSE.md](./HANDOFF-CSE.md).

## What this project is

The simulator is a small browser game about safety steps in lab B035. It has two separate versions:

- **Simple view:** `index.html` with the JavaScript files in `js/` and styles in `css/`. This is the main version for the floor plan and room-based two-player mode.
- **Pixel-art view:** `pixel.html`. This is a separate, self-contained version. Its map and game logic are inside that one file.

Changes to one version do **not** automatically update the other. The latest eyewash/table layout changes described below are in the Simple view.

## Start and try the game

### Play the Simple view by yourself

Open `index.html` in a browser. This runs as a single-player game.

### Play the Simple view with another person

Room codes require the project server; opening `index.html` directly or using the GitHub Pages version will not show the room lobby.

1. Install/use Python 3 on the computer that will host the game.
2. Open a terminal in the project folder and run:

   ```bash
   python3 server.py
   ```

   On Windows, the command may be `python server.py`.
3. Open the **This laptop** address printed by the server on the host computer. Open the **Other laptop** address on the second computer.
4. The first player selects **Create room** and shares the six-character code. The second player enters that code and selects **Join room**.
5. Each room supports two players. Stop the server with Ctrl+C when finished.

More detailed network and troubleshooting instructions are in [TWO-PLAYER.md](./TWO-PLAYER.md).

### Try the Pixel-art view

Open `pixel.html` in a browser. It is separate from the room-based multiplayer flow.

## “I want to change…” — where to go

| What you want to change | File and section to look for |
|---|---|
| A room object’s position, size, name, or safety note in Simple view | [`js/data.js`](./js/data.js), inside the `OBJ` list |
| A wall, exit, spill, or player starting position in Simple view | [`js/data.js`](./js/data.js), in `WALLS`, `EXITS`, `SPILL`, or `START` / `START2` |
| The instructions or order of the eight steps | [`js/data.js`](./js/data.js), inside the `STEPS` list |
| What happens when someone presses E at a step | [`js/drill.js`](./js/drill.js), inside `act()` |
| A safety rule, score deduction, timer, or evacuation behavior | [`js/rules.js`](./js/rules.js) |
| Nearby-object hints or the Describe (Q) feature | [`js/awareness.js`](./js/awareness.js) |
| Text announcements, event log, or read-aloud behavior | [`js/feedback.js`](./js/feedback.js) |
| How the map or status panel is drawn | [`js/render.js`](./js/render.js) |
| Colors, spacing, fonts, or layout | [`css/style.css`](./css/style.css) |
| Page structure, buttons, or which scripts load | [`index.html`](./index.html) |
| Create/join room interface or game startup | [`js/main.js`](./js/main.js) |
| Room codes, player connections, and syncing between players | [`js/net.js`](./js/net.js) and [`server.py`](./server.py) |
| A photo or other image used by the game | A file in [`assets/`](./assets), plus its path/reference in the relevant version |
| The Pixel-art version | [`pixel.html`](./pixel.html); it has its own copy of the map and game logic |

## Examples: make common changes safely

### Move or resize a floor-plan object

For the Simple view, open [`js/data.js`](./js/data.js) and find that object's row in the `OBJ` list. For example, the eyewash and table rows are near one another:

```js
{id:'eyewash', ...},
...
{id:'tableE',label:'Table',x:585,y:846,w:40,h:98,...},
```

The four numbers mean:

- `x`, `y`: where the object starts on the plan
- `w`: its width
- `h`: its height

The Simple view starts from the original portrait floor-plan coordinates, then automatically rotates the map for the screen. Keep using the original plan orientation when changing coordinates; do not try to convert them to the screen orientation yourself. If an object should be horizontal in the displayed map, its width and height in the source data may need to be swapped because of this rotation. Make one small change at a time, reload, and visually check that the object does not overlap a wall, door, or other equipment.

The current Table below the eyewash is horizontal in the displayed Simple view and spaced away from the station. Its row is `tableE` in `OBJ`.

### Change a step's instruction

In [`js/data.js`](./js/data.js), find the matching row in `STEPS` and edit its `text`. If it needs different wording when two players are connected, edit or add `teamText` in that same row.

Changing the words is usually just a data edit. Changing what the game actually does when a player interacts also requires checking the matching step case in [`js/drill.js`](./js/drill.js).

### Replace a picture

For the Simple view, the image references are in the matching object's `pic` field in [`js/data.js`](./js/data.js). Current examples:

| Picture to replace | Image file | Where it is used |
|---|---|---|
| Fume hood | [`assets/fume_hood.jpeg`](./assets/fume_hood.jpeg) | `OBJ` row with `id:'hood'` |
| Eye wash + safety shower | [`assets/eyewash_station.jpeg`](./assets/eyewash_station.jpeg) | `OBJ` row with `id:'eyewash'` |

If you want to keep the same picture filename, replace the file in `assets/` with the new image using exactly the same name and extension; the code reference can stay as it is. If you use a different name or extension, update the corresponding `pic` path too. The Pixel-art version is separate, so check [`pixel.html`](./pixel.html) before expecting an image change there.

### Change a color or text appearance

For the Simple view, use [`css/style.css`](./css/style.css). Search for a recognizable class or label, such as `.latest`, `.sign`, `.health-fill`, or `button`. Prefer changing an existing rule over adding a second competing rule elsewhere.

## How the files fit together

When Simple view starts, [`index.html`](./index.html) loads the scripts in order. The order matters: shared data and helpers load before the game behavior that uses them.

| File | In everyday language |
|---|---|
| `js/data.js` | The floor-plan information and the written drill steps |
| `js/utils.js` | Small shared helpers, such as distance and direction calculations |
| `js/feedback.js` | Event messages, sound, screen-reader announcements, and settings |
| `js/render.js` | Draws the map and updates the task/status display |
| `js/drill.js` | Handles interactions and moves the drill from one step to the next |
| `js/rules.js` | Checks safety behavior, timers, score deductions, and evacuation |
| `js/awareness.js` | Updates “Nearby,” object descriptions, and proximity hints |
| `js/net.js` | Browser-side multiplayer connection and room messages |
| `js/scene.js` | Sets up the game and updates player movement |
| `js/main.js` | Starts the page, connects buttons, and shows the room lobby when available |
| `server.py` | Serves the files and keeps separate rooms and their player messages |
| `css/style.css` | Page layout and visual styling |
| `pixel.html` | The independent Pixel-art version |

In multiplayer, the first person in a room is Player 1 and runs the shared drill state. Player 2 sends their position and interaction requests; both screens display the shared state. Each room is limited to two players.

## A safe update workflow

1. **Identify the version.** Check whether the request is for Simple view (`index.html`) or Pixel-art view (`pixel.html`).
2. **Find the source of the content.** For map locations and step wording in Simple view, start in `js/data.js`; for appearance, start in `css/style.css`.
3. **Make a small, specific edit.** Avoid replacing an entire file when a single row or style rule is enough.
4. **Reload and check the result.** For map changes, look for overlap and confirm labels remain readable. For browser-served pages, use a hard refresh if an old version still appears.
5. **Check related behavior.** A visual change should not accidentally make an object impossible to interact with. A multiplayer change should be tried with two browser windows if possible.
6. **Before handing it off, check the change list.** Run `git diff --check` and inspect `git status`. This catches accidental whitespace or unrelated edits.

## Important notes for the next maintainer

- The GitHub Pages and directly opened `index.html` versions are single-player. Room creation/joining is available when the game is served by `server.py` or a deployment configured to serve that server.
- Keep both Simple and Pixel-art views in mind when someone asks for a change “everywhere”; they are independent implementations.
- Safety instructions and procedures should be confirmed with the lab owner or safety lead before changing them.
- Two-player setup, room-code usage, and common connection problems are documented in [TWO-PLAYER.md](./TWO-PLAYER.md).
