# Credits and preservation

## Project creator

**Weihao Wang** created Cube Man Adventure as an Interactive Graphics student project at Sapienza. The original README and its educational-use declaration are preserved at [`original/README.md`](original/README.md).

## Remaster collaboration

**ChatGPT / OpenAI Codex** collaborated on the 2026 remaster: game design, engineering, procedural voxel art, synthesized audio, interface, accessibility improvements, documentation, and validation. This is a contribution credit; it does not claim human authorship, project ownership, or endorsement by OpenAI. Weihao Wang remains the original creator and project owner.

## Rendering engine

The remaster bundles **Three.js r118**, copied from the original project’s `js/libs/three.module.js`. Three.js is distributed under the MIT license; see [`remastered/vendor/LICENSE-Threejs.txt`](remastered/vendor/LICENSE-Threejs.txt).

No new externally downloaded artwork, character models, fonts, or audio are used by the remaster. Its character, trees, terrain, props, effects, and sounds are generated in code. System fonts provide the interface typography.

## Original project assets

The archived project includes Physijs, Ammo.js, Three.js, tween.js, and its original imported models and textures. It retains all files and notices received with the project. The model license and attribution files are:

- [`original/models/steve/license.txt`](original/models/steve/license.txt)
- [`original/models/gastly/license.txt`](original/models/gastly/license.txt)
- [`original/models/mushroom/license.txt`](original/models/mushroom/license.txt)
- [`original/models/pokeball/license.txt`](original/models/pokeball/license.txt)

The archive’s model attributions, reproduced from those notices:

| Model | Creator and source | License |
| --- | --- | --- |
| Steve | [seaneoo](https://sketchfab.com/seaneoo), [model](https://sketchfab.com/3d-models/steve-27fab6181ffa4fae9c69eb097630eaf3) | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |
| Gastly | [Leonardo Gomez](https://sketchfab.com/LeonardoGomez), [model](https://sketchfab.com/3d-models/gastly-e3edf38780594b2d9a1675b9f20b0da8) | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) |
| Mushroom Friend | [Rick Hoppmann / tinyruin](https://sketchfab.com/tinyruin), [model](https://sketchfab.com/3d-models/mushroom-friend-de9cc47fae19421a84db8192dc3cd92e) | [CC BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/) |
| Pokémon Poké Ball | [Jay Salton](https://sketchfab.com/jaysalton), [model](https://sketchfab.com/3d-models/pokemon-poke-ball-9f63803d93714eadaa869c23cee0581d) | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) |

The remaster does not redistribute those imported models outside the preserved archive or use them in its gameplay. No new project-wide license is asserted over original third-party assets.

## Preservation record

All 57 original files were hashed before moving the incoming nested project directory to `original/`. Their contents and relative paths inside that directory were retained. [`docs/original-manifest.json`](docs/original-manifest.json) is the integrity record; `node scripts/verify-archive.mjs` checks it.
