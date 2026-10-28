// ENTRE VOCES — shared browser game runtime (game builder-owned infrastructure).
// Browser ESM, zero dependencies, no framework, no CDN. No learning or
// assessment math lives here — learner evidence stays in EngineClient
// (packages/engine-client). Every module accepts injected adapters
// (clock/RAF/event targets/fetch/media/storage) so games are testable
// without a browser.
//
// Import paths (relative from a game under apps/games/<name>/):
//   import { GameLoop } from "../../../packages/game-runtime/loop.js";
//   import { SceneMachine } from "../../../packages/game-runtime/scenes.js";
//   import { Input } from "../../../packages/game-runtime/input.js";
//   import { Camera } from "../../../packages/game-runtime/camera.js";
//   import { AssetManager, AssetError } from "../../../packages/game-runtime/assets.js";
//   import { AudioMixer } from "../../../packages/game-runtime/audio.js";
//   import { SeededRng, hashSeed } from "../../../packages/game-runtime/rng.js";
//   import { Particles, Tweens } from "../../../packages/game-runtime/fx.js";
//   import { VersionedStore, StorageError } from "../../../packages/game-runtime/storage.js";
// Or everything at once from "../../../packages/game-runtime/index.js".

export { GameLoop } from "./loop.js";
export { SceneMachine, IllegalTransitionError } from "./scenes.js";
export { Input, isFormElement } from "./input.js";
export { Camera } from "./camera.js";
export { AssetManager, AssetError } from "./assets.js";
export { AudioMixer } from "./audio.js";
export { SeededRng, hashSeed } from "./rng.js";
export { Particles, Tweens } from "./fx.js";
export { VersionedStore, StorageError } from "./storage.js";
