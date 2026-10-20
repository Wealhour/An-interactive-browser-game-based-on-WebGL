# Remaster notes

## Direction

Preserve the student project as a complete playable memory, then give its cube wanderer and multiverse escape premise a more cohesive game. The remaster is a new implementation, so the archive’s original behavior can remain unchanged.

The experience is designed for a short browser visit: immediate play, a clear goal, gentle recovery from mistakes, and three freely selectable worlds. Repeated mazes stay deterministic so improving a route is meaningful. The interface uses pixel lettering, square controls, and a simple green-and-cream menu closer to the original game.

## Design decisions

| Original friction | Remaster response |
| --- | --- |
| Movement varies with frame rate; inputs are heavily coupled to animation | Rendering-independent simulation, delta-time movement, normalized diagonals, subdivided collision |
| Delayed initialization assumes assets load in a fixed number of seconds | Locally bundled engine, generated art, and initialization after module loading |
| Camera can make navigation hard to read | Fixed screen-relative controls, overview/follow toggle, and minimap |
| A collision ends the run | Difficulty-based hearts, a healing checkpoint, brief protection, and immediate retries |
| Limited objective feedback | Three visible fragment objectives, exit status, clear HUD, and event messages |
| One environment and little replay structure | Three seeded worlds playable in any order, optional starlight, saved best times, and stars |
| Desktop-only instructions | Keyboard, pointer-based thumbstick, and standard gamepad mappings |
| Instructions and ending live on separate pages | In-game field guide, pause, results, and next-world transition |
| Third-party character models define the visual mixture | An original procedural voxel character, scenery, props, and sounds |

## Validation performed

- Twenty-four Node tests cover world determinism, connectedness, reachable objectives, patrol routes, collision, frame-rate consistency, diagonal speed, dash cooldown, collectible consumption, checkpoint healing, damage, invulnerability, loss, locked exits, star criteria, fragment-tile edges and corners, collection through walls, and ghost facing in all four travel directions.
- Feasibility regression tests complete 216 runs with the actual ghosts, mushrooms, damage, pickups, and checkpoint rules enabled: all three worlds × three difficulties × three frame rates (20, 60, 120) × four starting patrol phases (0, 2.9, 9.7, 31.3 seconds) × two steering offsets (centered and 0.18 cells). Every run finishes with all fragments, full hearts, zero hits, and no dash. The tests never override player position, health, immunity, or world objects.
- A separate static audit blocks every cell of every patrol and all mushrooms simultaneously. Every remaining floor tile and every objective must be connected, with clearance from patrol segments. This checks arbitrary patrol phases, safe waiting, optional pickups, and alternate approaches rather than just one successful timed run.
- Chrome browser checks cover actual WebGL rendering; keyboard movement; pause and resume; frozen pause time; camera toggle; graphics and reduced-motion settings; mobile layout at 390 × 844; pointer controls using touch events; every victory screen; immediate access to all worlds; and persistence after reload.
- The UI integration harness places the player at objectives to check completion UI and saving; it is not a playability test. Separate hazard-enabled simulation and keyboard playthroughs verify completion through actual movement. Neither adds debug hooks to production files.
- Recovery checks cover malformed storage, unavailable storage, and unavailable WebGL.
- The remaster produced no browser console errors during the browser integration checks.
- The original archive launched in Chrome, loaded its 3D scene and physics worker, and produced no uncaught script errors.
- SHA-256 validation confirms all 57 original files match their incoming bytes.
- Screenshots of the title, gameplay, mobile layout, both later worlds, and original were visually inspected.

Optional browser checks use `node scripts/browser-integration.mjs` with Playwright and Chrome installed. `node scripts/keyboard-playthrough.mjs` drives actual keyboard input through all three worlds on Normal, Hard, and Easy, collects all fragments, enters the exits, and compares rendered ghost facing against movement. It waits for spawn protection to expire, keeps all hazards active, and requires zero hits and full hearts. State observation uses test-only intercepted module exports; all movement uses keyboard events. `QA_DIFFICULTIES=adventure,expert,explorer` selects difficulties. `PLAYWRIGHT_PATH` can point to an existing Playwright `index.mjs`; `QA_URL` can select another preview origin or subpath. Set `QA_WRITE_PREVIEW=1` explicitly to replace the documentation screenshot. The normal game and Node test suite require no package installation.

## Version 2.1 fixes

The old circular pickup radius was smaller than a floor tile: legal movement near the tile's edges or corners could miss a fragment. Collection now covers entry anywhere on the marked tile and is checked during collision-constrained movement substeps, including a dash. Blue crystals have fixed blue ground markers; similarly colored wall decorations were removed. Patrols track their travel heading and the ghost mesh rotates to match it. All worlds are available immediately, and saved times and ratings are retained. Versioned module and stylesheet URLs prevent browsers from combining cached old game logic with the new interface.

## Version 2.2 passage fairness

The earlier navigation checks removed hazards or used test-only invulnerability. They demonstrated movement and collection, but did not establish that the live levels were fair. The World 2 report exposed this gap. An audit also found patrols crossing a World 1 exit, a World 2 fragment and checkpoint, and World 3 objectives. Mushrooms could block narrow corridors too.

Patrols and mushrooms now stay away from spawn, checkpoint, fragments, and exit. Threat placement cannot form an impenetrable barrier. After placement, the generator connects all safe corridor components with short connections, opening 3 extra wall tiles in World 1, 2 in World 2, and 6 in World 3. The result keeps the seeded maze and objective positions while adding permanent bypasses. Ghosts retain their patrols, collision damage, and difficulty-dependent speeds; the player can use a bypass instead of relying on precise timing, dash protection, or a sacrificed heart. All optional starlight remains reachable as well.

The hazard-enabled feasibility tests run in the required GitHub Pages verification job before deployment, preventing the same class of blocked layout from silently returning. The keyboard harness no longer overrides invulnerability.

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
