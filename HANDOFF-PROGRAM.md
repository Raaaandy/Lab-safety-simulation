# B035 Lab Safety Simulator — CSE Technical Handoff

This companion guide is for a developer who wants to trace behavior through the code, change functions, or extend the simulator. The plain-language guide for users and non-CSE maintainers is [HANDOFF.md](./HANDOFF.md).

## Architecture at a glance

The Simple view is a browser application built from classic JavaScript files, not ES modules. `index.html` loads those files in dependency order. They share top-level declarations and add method groups to the Phaser `Lab` scene.

```text
index.html
  ├─ js/data.js       static map + step definitions
  ├─ js/utils.js      shared DOM, color, geometry helpers
  ├─ js/feedback.js   log, live region, speech, sound
  ├─ js/render.js     RenderMethods
  ├─ js/drill.js      DrillMethods
  ├─ js/rules.js      RuleMethods
  ├─ js/awareness.js  AwarenessMethods
  ├─ js/net.js        room client + NetMethods
  ├─ js/scene.js      Lab.create(), Lab.update(), movement
  └─ js/main.js       room lobby, Phaser startup, DOM button bindings
                         └─ Object.assign(Lab.prototype, ...)

server.py             room membership, HTTP endpoints, message relay
pixel.html            independent implementation; not composed from js/
```

Because these scripts share the global scope, declaration order matters. `index.html` is the authoritative load order. When adding a script, place it after its dependencies and before `main.js`.

The `*Methods` objects are mixed into `Lab.prototype` at the bottom of `scene.js`; their methods therefore use `this` as the active Phaser scene. Prefer adding behavior to the existing method group responsible for it instead of creating parallel state or duplicate event paths.

## Function-to-feature map

### Startup and page UI

| Function | File | Responsibility |
|---|---|---|
| `boot()` | `js/main.js` | Detects the room-enabled server and either shows the lobby or starts a solo game. |
| `enterSelectedRoom(action, room)` | `js/main.js` | Handles lobby buttons, status text, errors, and starts the game after room entry succeeds. |
| `startGame()` | `js/main.js` | Creates the Phaser game, binds Interact/Describe/Restart/panel buttons, and focuses the map. |
| `setPanelHidden(hidden)` | `js/main.js` | Shows/hides the side panel and moves the task line into/out of Latest. |

`startGame()` also wires the map zoom buttons to `Lab.setMapZoom()` using the current Phaser camera zoom.

### Scene and movement

| Function | File | Responsibility |
|---|---|---|
| `Lab.create()` | `js/scene.js` | Initializes local game state, player sprites, collisions, keyboard input, and the first drill step. |
| `Lab.update(time, delta)` | `js/scene.js` | Per-frame coordinator: network, movement, rules/timers, proximity, and target ring. |
| `Lab.movePlayer()` | `js/scene.js` | Converts keyboard/touch input to player velocity and returns whether the player is running. |
| `Lab.setMapZoom(zoom)` | `js/scene.js` | Clamps map zoom to 100–300%, follows the local player while zoomed, and resets the camera at 100%. |

`update()` calls `updateNet()` first. It then moves the local player. The host (or solo player) runs shared rules, timer, and evacuation checks; a connected guest uses the host's shared snapshot.

### Drill and interaction

| Function | File | Responsibility |
|---|---|---|
| `stepText()` | `js/drill.js` | Selects solo/co-op wording for the active step, including naming the splashed player. |
| `enterStep()` | `js/drill.js` | Applies step-start effects, timer, message, and HUD refresh. |
| `advance(msg)` | `js/drill.js` | Logs a successful action, increments `s.step`, and enters the next step. |
| `act(pn, pos)` | `js/drill.js` | Main interaction dispatcher for E/button actions. Branches by `STEPS[s.step].id`. |
| `actionTarget(pn, pos)` | `js/drill.js` | Computes the active interaction target used by Nearby and the E prompt. |
| `targetPoint()` | `js/drill.js` | Returns the guide-ring position for the active task. |
| `finish()` | `js/drill.js` | Marks the drill complete and triggers the end screen. |
| `startAlarm()` / `stopAlarm()` | `js/drill.js` | Starts/stops the evacuation alert animation and sound timer. |

When adding a step, update both the `STEPS` data in `js/data.js` and the matching interaction case in `act()` if the step requires a new action. Also review `actionTarget()`, `targetPoint()`, timer/rule behavior, and co-op wording as applicable.

### Safety rules and scoring

| Function | File | Responsibility |
|---|---|---|
| `checkRules()` | `js/rules.js` | Checks PPE, ignition-source proximity, and spill contact for each active player. |
| `checkRunning(dt, running)` | `js/rules.js` | Reports running violations; a guest sends the violation to the host. |
| `updateTimer(dt)` | `js/rules.js` | Decrements the active timer and records eyewash/evacuation timeout violations. |
| `warnTimer()` | `js/rules.js` | Announces the five-second warning. |
| `checkEvacuation()` | `js/rules.js` | Tracks which players reached an exit and advances when everyone is out. |
| `violate(key, msg, pn)` | `js/rules.js` | Deduplicates a violation, subtracts 10 points, reports it, and refreshes the HUD. |
| `updateHealthBar()` | `js/rules.js` | Maps score to the visual progress bar and ARIA value. |

Rule identity is stored in `s.flags`; in co-op, `violate()` adds a player suffix so the same rule can be charged once to each player. Preserve unique violation keys and route user-facing messages through the existing feedback path.

### Map awareness

| Function | File | Responsibility |
|---|---|---|
| `nearObj(ids, d, pos)` | `js/awareness.js` | Tests whether a point is within interaction distance of any listed object. |
| `nearest(d, pos)` | `js/awareness.js` | Finds the closest labelled object within a radius. |
| `nearSpill(pos, extra)` | `js/awareness.js` | Tests distance to the spill. |
| `updateProximity()` | `js/awareness.js` | Updates Nearby, E prompt, object announcements, and image dismissal. |
| `describe()` | `js/awareness.js` | Announces nearby objects, target direction, and partner direction. |
| `showPic(o)` | `js/awareness.js` | Displays or hides an object's photo and accessible alt text. |

Interaction distance is not just visual: `act()` and `actionTarget()` rely on these geometry helpers. If an object is moved, test that it remains reachable and does not become blocked by a solid.

### Rendering and feedback

| Function | File | Responsibility |
|---|---|---|
| `drawMap()` | `js/render.js` | Draws walls, objects, labels, and exits from `data.js`. |
| `drawSpill()` / `drawTargetRing(time)` | `js/render.js` | Draws the spill and active task guide ring. |
| `refreshHUD()` | `js/render.js` | Updates task card, player status, room status, score and carried-item indicators. |
| `showTimer()` / `showEndScreen(secs)` | `js/render.js` | Updates timer text and draws the completion overlay. |
| `log(msg, cls)` | `js/feedback.js` | Adds a message to the event log, Latest bar, and announcement path. |
| `showLatest(msg, cls)` | `js/feedback.js` | Replaces Latest content and restarts its flash. |
| `announce(msg)` / `speakText(msg)` | `js/feedback.js` | Sends accessible live-region announcements and optional speech. |
| `beep(freq, dur, times)` | `js/feedback.js` | Plays sound effects when enabled. |

For game events in multiplayer, use `say(msg, cls, to)` from `js/net.js`, not `log()` directly, when the other player's screen must receive the message. Keep essential information available outside the Phaser canvas and retain meaningful text for screen readers.

### Multiplayer room flow

| Function/endpoint | File | Responsibility |
|---|---|---|
| `netAvailable()` | `js/net.js` | Checks `GET /api/status` to determine whether the room lobby is available. |
| `enterRoom(action, room)` | `js/net.js` | Calls create/join endpoint and initializes the local network client. |
| `netTick()` | `js/net.js` | Sends local position, host snapshot, and queued outgoing messages; receives peer state/messages. |
| `rejoin()` | `js/net.js` | Attempts to rejoin the current room after the server forgets a client. |
| `team()`, `players()`, `posOf(pn)` | `js/net.js` | Expose online team membership and player positions to game methods. |
| `snapshot()` / `applyShare(sh)` | `js/net.js` | Serializes host state and applies it on the guest. |
| `onNet(m)` / `updateNet()` | `js/net.js` | Handles incoming events and updates the partner sprite/connection state. |
| `partnerLeft()` | `js/net.js` | Converts the remaining client to local solo control after disconnect. |
| `POST /api/rooms/create` | `server.py` | Creates a six-character room code and assigns Player 1. |
| `POST /api/rooms/join` | `server.py` | Assigns Player 2 to an existing room; rejects invalid/missing/full rooms. |
| `POST /api/sync` | `server.py` | Updates a client's heartbeat/position and relays messages only to its room partner. |
| `POST /api/leave` | `server.py` | Removes a departing client. |
| `GET /api/status` | `server.py` | Advertises room support to the browser. |

The server stores active clients in memory, grouped by the `room` field. A room is not persistent: restarting `server.py` clears all rooms. `active()` drops clients that have not synced within `TIMEOUT`; `partner_of(cid)` must always match both room and opposite player role.

## Data model and map coordinates

In `js/data.js`:

- `WALLS`: solid wall rectangles `[x, y, width, height]`
- `EXITS`: exit points
- `OBJ`: equipment and furnishings; `id` is the stable key referenced by steps, and `kind` selects rendering/solid behavior
- `SPILL`, `TROUGH`, `UTILS`: other map features
- `START`, `START2`: player start points
- `STEPS`: ordered drill definitions (`id`, `text`, optional `teamText`, `target`, optional `urgent` and `timer`)

Coordinates are traced from the portrait source plan. With `LANDSCAPE = true`, the transform in `data.js` rotates points and rectangles. For a rectangle `(x, y, w, h)`, the landscape transform is `x' = y`, `y' = PLAN_W - x - w`, `w' = h`, `h' = w`. Keep source data in portrait coordinates and let the existing transform run once.

`js/render.js` draws the simple floor plan from `OBJ`, `WALLS`, `EXITS`, and related constants. Physics solids are built separately in `Lab.create()` in `js/scene.js` from `WALLS` and `OBJ`; when adding an object, verify both its drawing and collision are appropriate.

## Common technical changes

### Add or change a safety rule

1. Implement or update a check in `RuleMethods.checkRules()` (or the relevant timer/evacuation method) in `js/rules.js`.
2. Record it using `this.violate('unique-rule-key', 'Player-facing explanation.', playerNumber)`.
3. If the check needs to run every frame, confirm `Lab.update()` calls it on the host/single-player path.
4. Test single-player and both player roles. In co-op, the host owns shared rule evaluation; guest-only inputs should be sent to the host.

### Change map geometry

1. Edit the existing object or wall in `js/data.js`; keep object IDs stable if `STEPS` or logic refers to them.
2. Check the `kind`, because `drawMap()` uses it for color and `Lab.create()` currently treats every `OBJ` as solid.
3. Reload Simple view and inspect overlap, labels, and interaction distance.
4. If the request includes Pixel-art view, separately update its corresponding data and rendering in `pixel.html`.

### Change co-op behavior

First determine which side owns the behavior. The host runs shared progression and rules; the guest sends position, interaction, and running-violation messages. Update the message producer and matching `onNet()` handler together when adding a message type. Keep message delivery room-scoped in `server.py`, and verify with two clients in one room plus a client in another room.

## Validation checklist

- **Syntax:** `python3 -m py_compile server.py`; use the project's available JavaScript syntax/lint tooling if configured.
- **Patch hygiene:** `git diff --check`.
- **Solo behavior:** open `index.html`, complete the changed interaction, inspect Latest and event log.
- **Room behavior:** run `python3 server.py`, create a room in one browser, join from another, and check both show the same step/state.
- **Room isolation:** create a second room and confirm events/positions do not cross between rooms.
- **Accessibility:** keyboard through the changed flow; check screen-reader/live-region messages and reduced-motion behavior if visuals/announcements changed.
- **Version scope:** test `pixel.html` separately when the request says both versions.

## Related documentation

- [HANDOFF.md](./HANDOFF.md) — user/non-CSE plain-language guide
- [TWO-PLAYER.md](./TWO-PLAYER.md) — room setup and player troubleshooting
- [README.md](./README.md) — gameplay, project overview, architecture notes
