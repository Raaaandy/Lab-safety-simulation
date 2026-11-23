# B035 Lab Safety Simulator

A browser-based 2D lab safety drill set in room B035, the chemical engineering lab. Walk through the room, follow the safety steps, and respond to a spill, an eye splash and a fire alarm. It is designed to be playable with a keyboard, a screen reader, or read-aloud speech.

**Play online:** [https://raaaandy.github.io/b035-lab-safety-sim/](https://raaaandy.github.io/Lab-safety-simulation/)

This README has two parts:
- [Part 1: For players](#part-1-for-players): how to play
- [Part 2: For developers and contributors](#part-2-for-developers-and-contributors): how the code works and how to extend it

---

# Part 1: For players

## Getting started

Open the link above in Chrome, Edge or Firefox. Nothing needs to be installed.

To play without the website, download the whole folder and double-click `index.html` (an internet connection is still needed to load the game engine).

There are two versions:
- **Simple view** (`index.html`): the whole floor plan is visible at once, with high-contrast shapes and large labels. Recommended for low-vision players and screen reader users.
- **Pixel-art view** (`pixel.html`): a close-up, game-style view where the camera follows your character.

## Playing with a partner

Two people can play together on two laptops on the same Wi-Fi: one runs `server.py`, and both open the game from it. The first player creates a room and shares its six-character code for the other player to join. Some steps then need both of you, such as containing the spill from both sides and both getting out during the fire alarm. The team shares one score. See [TWO-PLAYER.md](TWO-PLAYER.md) for how to set it up.

The online version and a double-clicked `index.html` are always single-player.

## Controls

| Action | Keyboard | Touch / mouse |
|---|---|---|
| Walk | WASD or arrow keys | Press and hold on the map |
| Interact, or read an object's safety note | E (or Space) | **Interact** button |
| Describe your surroundings | Q | **Describe** button |
| Start over | | **Restart** button |

Holding Shift makes you run, but running in the lab costs points.

## The screen

- **Map** on the left, with the **Latest** bar underneath showing the most recent message. It flashes briefly when something new happens, turns red for urgent steps and violations, and green for successes.
- **Side panel** on the right with the current task, timer, status, full event log, settings and controls. Click **Hide side panel** (top right) to give the map the full width; the current task, score and timer then appear in the Latest bar instead. Click **Show side panel** to bring it back.
- **Map zoom.** Use the `+` and `−` controls just below the map to zoom around your player dot. Select the percentage button to reset to the full map.
- **Browser zoom.** The page layout and map canvas resize with Chrome's normal zoom controls.

## The drill

Follow the task card on the right. There are 8 steps:

1. Put on PPE at the cubbies by the entrance.
2. Get acetone from the flammables cabinet.
3. Dispense it in the fume hood.
4. Return it to the cabinet.
5. A spill appears: fetch the spill kit from the blue cabinet.
6. Clean up the spill without walking through it.
7. Eye splash: reach the eye wash and safety shower by the upper wall, just left of the door, within 10 seconds.
8. Fire alarm: leave through the nearest exit within 25 seconds.

A ring on the map marks your current target: green for normal tasks, red for urgent ones.

## Scoring

You start with 100 points and lose 10 for each of these (each counts once):
- Leaving the entrance area without PPE
- Dispensing acetone on an open bench
- Carrying acetone near the steam bench or heat exchanger
- Walking through the spill
- Running
- Missing a timer

## Accessibility features

- **Keyboard only.** The whole game can be played with the keyboard.
- **Screen readers.** Every instruction, success and mistake is posted to the event log, which screen readers announce automatically.
- **Read aloud.** The game can speak events itself. It is on by default; **turn it off if you use a screen reader**, or you will hear everything twice.
- **Describe (Q).** Tells you the three nearest objects, how far away they are in metres and in which compass direction, plus where your current target is. North is the top of the map.
- **Proximity cues.** You hear an object's name when you walk up to it, and "Press E" when you can use it.
- **Timer warning.** You hear "5 seconds left" during timed tasks.
- **Safety notes.** Press E next to any object to hear its safety note.

## Settings

| Setting | What it does |
|---|---|
| Read events aloud | Speaks every event (on by default) |
| Highlight the current target | Shows or hides the target ring |
| Alarm and alert sounds | Turns sound effects and the fire alarm on or off |

---

# Part 2: For developers and contributors

## Project files

```
index.html          page layout (side panel, buttons) and the list of scripts to load
css/style.css       colours, light/dark mode, side-panel styling
js/data.js          the room (walls, equipment, exits, spill), the drill steps, and the landscape rotation
js/utils.js         small helpers: colours, distances, compass directions
js/feedback.js      event log, screen reader announcements, read aloud, sounds
js/render.js        drawing: map, spill, guide ring, side-panel status, end screen
js/drill.js         what each step does when it starts, and the E key
js/rules.js         safety rules, timers, evacuation check
js/awareness.js     nearby objects, the "Nearby" box, Describe (Q)
js/scene.js         the Phaser scene: setup, movement, and the per-frame loop
js/net.js           optional two-player mode: joining, syncing, messages to the partner
js/main.js          starts the game and connects the buttons
server.py           two-player server: serves the game and relays messages (Python standard library only)
TWO-PLAYER.md       how to play on two laptops
pixel.html          pixel-art version (single file, same drill and rules)
README.md           this file
HANDOFF.md          user / non-CSE plain-language handoff guide
HANDOFF-PROGRAM.md  CSE technical handoff: functions, architecture, and extension points
```

The scripts are plain `<script>` tags rather than ES modules, so the game still works when `index.html` is opened by double-clicking. They load in the order listed in `index.html`, and that order matters: data and helpers first, `main.js` last.

For handoff documentation, see [HANDOFF.md](./HANDOFF.md) (user / non-CSE) or [HANDOFF-PROGRAM.md](./HANDOFF-PROGRAM.md) (CSE technical guide with function responsibilities and extension points).

## Where to look for what

| I want to… | Edit |
|---|---|
| Change the room layout or an object's safety note | `js/data.js` (`WALLS`, `OBJ`, `EXITS`) |
| Show the map portrait (as in the PDF) instead of landscape | `js/data.js` → set `LANDSCAPE = false` |
| Change the wording or order of the drill | `js/data.js` (`STEPS`) |
| Change what pressing E does at a step | `js/drill.js` → `act()` |
| Add or change a safety rule | `js/rules.js` → `checkRules()` |
| Change timers or the 5-second warning | `js/rules.js` → `updateTimer()` |
| Change what screen readers hear or what is read aloud | `js/feedback.js` |
| Change the Latest bar under the map | `showLatest()` in `js/feedback.js`; task line in `refreshHUD()` in `js/render.js`; styles in `css/style.css` |
| Change the hide / show side panel button | `js/main.js` (`btnPanel`) and `css/style.css` (`.panel-hidden`) |
| Change the Describe (Q) output or proximity announcements | `js/awareness.js` |
| Change how the map or side panel looks | `js/render.js`, `css/style.css` |
| Change movement speed or controls | `js/scene.js` → `movePlayer()`, `create()` |
| Change map zoom behavior | `js/scene.js` → `setMapZoom()`; buttons in `index.html` and `js/main.js` |
| Change two-player wording | `teamText` in `STEPS` (`js/data.js`); the eyewash wording is in `stepText()` (`js/drill.js`) |
| Change which steps need both players | `act()` in `js/drill.js` (PPE, spill) and `checkEvacuation()` in `js/rules.js` |
| Change two-player networking (what is synced, connects / disconnects) | `js/net.js` |
| Change the two-player server | `server.py` |

## Map orientation

The coordinates in `js/data.js` are traced from the PDF in its original portrait orientation. At the bottom of `data.js`, the whole plan is rotated 90° counter-clockwise so it fits landscape screens: the PDF's top edge becomes the left edge of the screen. Keep tracing in the PDF's orientation; the rotation is applied automatically. Exit names ("west door (upper)") and the compass words in Describe (Q) refer to the screen, with north at the top.

## How it fits together

`scene.js` defines one Phaser scene, `Lab`. The other files each add a group of methods to it (`RenderMethods`, `DrillMethods`, `RuleMethods`, `AwarenessMethods`, `NetMethods`), so inside any of them `this` is the scene. The game state lives in `this.s` (current step, score, spill, timer, violations) and `this.ps` (for each player: PPE, carrying acetone or the spill kit, out of the building). `this.me` is this laptop's player number, which is always 1 in single-player.

Every frame, `update()` in `scene.js` runs:

```
updateNet()        net.js         two-player only: partner's circle, messages, host snapshot
movePlayer()       scene.js       keyboard / touch movement
checkRunning()     rules.js       running (each laptop checks its own player)
checkRules()       rules.js       PPE, ignition, spill, for every player
updateTimer()      rules.js       countdown and timer violations
checkEvacuation()  rules.js       has every player reached an exit during the fire alarm?
warnTimer()        rules.js       5-second warning
showTimer()        render.js      countdown on the task card
updateProximity()  awareness.js   "Nearby" box, E bubble, announcements
drawTargetRing()   render.js      pulsing ring on the current target
```

In two-player mode, Player 1's laptop (the host) runs `checkRules()`, `updateTimer()` and `checkEvacuation()` for both players; Player 2's laptop skips them and draws the drill from the host's snapshot. Player 2's E presses reach the host as `act(2, position)`.

```mermaid
flowchart LR
    Keys["Keyboard / touch / buttons"] --> Scene["scene.js<br/>update()"]
    Keys --> Act["drill.js<br/>act() (E key)"]
    Data["data.js<br/>STEPS, OBJ, WALLS"] --> Scene
    Data --> Act
    Scene --> Rules["rules.js<br/>checkRules(), updateTimer()"]
    Scene --> Aware["awareness.js<br/>updateProximity(), describe()"]
    Act --> Advance["drill.js<br/>advance() → enterStep()"]
    Rules --> Violate["rules.js<br/>violate()"]
    Advance --> Log["feedback.js<br/>log()"]
    Violate --> Log
    Aware --> Log
    Log --> SR["Event log<br/>(screen reader)"]
    Log --> Speech["Read aloud"]
    Advance --> HUD["render.js<br/>refreshHUD()"]
    Violate --> HUD
```

Two rules keep the game accessible:
- **Never show information only on the canvas.** If the player needs to know it, send it through `log()` or `announce()` in `feedback.js`. For game events, use `say()` in `net.js`: it calls `log()` and, in two-player mode, sends the same message to the partner's laptop.
- **Keep screen reader output outside the side panel.** The live region `#sr` sits under the map, so announcements still work when the panel is hidden.
- **Keep content in the data.** Add new rooms or steps by editing `data.js`, not by hard-coding them into the logic.

## Development setup

You can open `index.html` directly, but a local server behaves more like the real website:

```bash
python -m http.server 8000
# then open http://localhost:8000/
```

To work on two-player mode, run `python server.py` instead and open `http://localhost:8000/` in two browser windows: the first is Player 1, the second Player 2.

To work offline, download [phaser.min.js 3.80.1](https://cdnjs.cloudflare.com/ajax/libs/phaser/3.80.1/phaser.min.js) into the project folder and change the Phaser `<script>` line in `index.html` to `<script src="phaser.min.js"></script>`.

To test accessibility, try the game with a real screen reader (NVDA on Windows, VoiceOver on macOS) with read-aloud turned off.

## Planned features and where they go

### A. Realistic spill-response procedure

Right now the spill takes two actions: fetch the kit, then press E once at the spill. A real response has more stages, for example: alert people nearby, identify the chemical (check the SDS binder), check your PPE, contain the spill from the edges with absorbent socks, absorb it, bag and label it as hazardous waste, and report it. The actual procedure must be confirmed with the lab manager.

| Change | Where |
|---|---|
| New equipment (SDS binder, hazardous waste bin) | `OBJ` in `js/data.js` |
| Each stage as its own step | `STEPS` in `js/data.js`, between `kit` and `eyewash` |
| What pressing E does at each stage | a new `if (st.id === '...')` in `act()` in `js/drill.js` |
| Making the E prompt appear for the new stages | `actionTarget()` in `js/drill.js` (usually automatic if the step has a `target`) |
| New things the player carries (e.g. a filled waste bag) | new fields in `this.s` in `create()` (`js/scene.js`), shown in `refreshHUD()` (`js/render.js`) |
| Mistakes (wiping from the centre outward, skipping the SDS) | `violate()` calls in `act()` or `checkRules()` |
| Stages that take time ("hold E for 3 seconds") | a counter in `this.s`, increased in `update()` while E is held |

### Implemented: two-player co-op

Two-player co-op on two laptops is now built in; see [TWO-PLAYER.md](TWO-PLAYER.md), `js/net.js` and `server.py`. Ideas for later: a one-keyboard version (Player 2 on the arrow keys) for players who share a laptop, and co-op stages for the realistic spill procedure above.

## Adapting to another lab

1. Get the new room's floor plan (PDF or image).
2. Ask an AI coding assistant to trace it into `WALLS`, `EXITS` and `OBJ` in `js/data.js`, using the same format and the original image size as the coordinate system.
3. Update `STEPS` so the targets point to the new object `id`s.
4. Change `M_PER_PX` to match the real room width, and `START` (also in `js/data.js`) to the new entrance.
5. If the new plan is already landscape, set `LANDSCAPE = false` at the bottom of `js/data.js`.
6. Walk the room in person to confirm where the safety equipment is. Floor plans usually do not show it.

## Publishing updates

The site is hosted on GitHub Pages from the `main` branch. Upload the whole folder (keeping the `css/` and `js/` folders); the site updates automatically within a minute or two. Check the **Actions** tab if it doesn't.

## Credits

Room layout traced from `BNS_035_Floor_Plan.pdf`. Built with Phaser 3.80.1 (MIT licence). All visuals are drawn in code.
