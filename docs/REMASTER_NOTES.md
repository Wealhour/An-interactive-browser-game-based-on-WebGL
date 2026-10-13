# Remaster notes

## Direction

Preserve the student project as a complete playable memory, then give its cube wanderer and multiverse escape premise a more cohesive game. The remaster is a new implementation, so the archive’s original behavior can remain unchanged.

The experience is designed for a short browser visit: immediate play, a clear goal, gentle recovery from mistakes, and three worlds that offer a beginning, middle, and homecoming. Repeated mazes stay deterministic so improving a route is meaningful.

## Design decisions

| Original friction | Remaster response |
| --- | --- |
| Movement varies with frame rate; inputs are heavily coupled to animation | Rendering-independent simulation, delta-time movement, normalized diagonals, subdivided collision |
| Delayed initialization assumes assets load in a fixed number of seconds | Locally bundled engine, generated art, and initialization after module loading |
| Camera can make navigation hard to read | Fixed screen-relative controls, overview/follow toggle, and minimap |
| A collision ends the run | Difficulty-based hearts, a healing checkpoint, brief protection, and immediate retries |
| Limited objective feedback | Three visible fragment objectives, exit status, clear HUD, and event messages |
| One environment and little replay structure | Three seeded worlds, unlocks, optional starlight, saved best times, and stars |
| Desktop-only instructions | Keyboard, pointer-based thumbstick, and standard gamepad mappings |
| Instructions and ending live on separate pages | In-game field guide, pause, results, and next-world transition |
| Third-party character models define the visual mixture | An original procedural voxel character, scenery, props, and sounds |

## Validation performed

- Ten Node tests cover world determinism, connectedness, reachable objectives, patrol routes, collision, frame-rate consistency, diagonal speed, dash cooldown, collectible consumption, checkpoint healing, damage, invulnerability, loss, locked exits, star criteria, and completion of all nine world/difficulty combinations through simulated movement.
- Chrome browser checks cover actual WebGL rendering; keyboard movement; pause and resume; frozen pause time; camera toggle; graphics and reduced-motion settings; mobile layout at 390 × 844; pointer controls using touch events; every victory screen; unlocking; and persistence after reload.
- The integration harness places the player at objectives to check completion UI and saving. Separate simulation tests traverse routes through actual movement. Neither adds debug hooks to production files.
- Recovery checks cover malformed storage, unavailable storage, and unavailable WebGL.
- The remaster produced no browser console errors during the browser integration checks.
- The original archive launched in Chrome, loaded its 3D scene and physics worker, and produced no uncaught script errors.
- SHA-256 validation confirms all 57 original files match their incoming bytes.
- Screenshots of the title, gameplay, mobile layout, both later worlds, and original were visually inspected.

Optional browser checks use `node scripts/browser-integration.mjs` with Playwright and Chrome installed. `PLAYWRIGHT_PATH` can point to an existing Playwright `index.mjs`; `QA_URL` can select another preview origin or subpath. The normal game and Node test suite require no package installation.

## Scope and verification limits

Chrome desktop and emulated phone layouts were tested on this machine. Physical phones, Safari, Firefox, and physical gamepads have not been tested. Gamepad input uses the standard browser mapping. An active run is intentionally not restored after closing the page; completed worlds, settings, best times, and stars are saved locally when storage is available.

The GitHub Pages workflow verifies gameplay, checks the original archive, packages both editions, and deploys the resulting static site from the default branch. The README links identify the original and remastered editions hosted together in this repository.

## File layout

```text
index.html                  Edition selector
original/                   Complete unchanged student project
remastered/index.html       New game and title screen
remastered/core.js          Simulation, world generation, and rules
remastered/scene.js         Procedural WebGL scene and cameras
remastered/app.js           Input, UI, sound, progression, and persistence
remastered/vendor/          Preserved Three.js engine and its license
tests/                      Rendering-free gameplay tests
scripts/                    Preview, archive verification, packaging, browser QA
docs/                       Preview, integrity manifest, and these notes
.github/workflows/pages.yml Verify and deploy both editions
```
