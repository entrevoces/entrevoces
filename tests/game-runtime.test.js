// ENTRE VOCES — game-runtime failure-mode tests (game builder-owned infrastructure).
// Browser ESM modules under test; every adapter is injected (fake clock,
// RAF, event targets, fetch, audio context, storage) so this runs in Node.
// Run: node --test tests/game-runtime.test.js   (or: npm test)
import test from "node:test";
import assert from "node:assert/strict";

import { GameLoop } from "../packages/game-runtime/loop.js";
import { SceneMachine, IllegalTransitionError, UnknownSceneError } from "../packages/game-runtime/scenes.js";
import { Input } from "../packages/game-runtime/input.js";
import { Camera } from "../packages/game-runtime/camera.js";
import { AssetManager, AssetError } from "../packages/game-runtime/assets.js";
import { AudioMixer } from "../packages/game-runtime/audio.js";
import { SeededRng, hashSeed } from "../packages/game-runtime/rng.js";
import { Particles, Tweens } from "../packages/game-runtime/fx.js";
import { VersionedStore, StorageError } from "../packages/game-runtime/storage.js";

// ---------- fakes ----------

class FakeTarget {
  constructor() {
    this.handlers = new Map();
  }
  addEventListener(type, fn) {
    if (!this.handlers.has(type)) this.handlers.set(type, new Set());
    this.handlers.get(type).add(fn);
  }
  removeEventListener(type, fn) {
    this.handlers.get(type)?.delete(fn);
  }
  listenerCount(type) {
    return this.handlers.get(type)?.size ?? 0;
  }
  dispatch(type, ev = {}) {
    ev.type = type;
    if (ev.preventDefault === undefined) {
      ev.defaultPrevented = false;
      ev.preventDefault = () => {
        ev.defaultPrevented = true;
      };
    }
    for (const fn of [...(this.handlers.get(type) ?? [])]) fn(ev);
    return ev;
  }
}

function makeScheduler(startTime = 1000) {
  let now = startTime;
  const queue = [];
  let nextId = 1;
  let requests = 0;
  let cancels = 0;
  return {
    api: {
      requestFrame(cb) {
        requests += 1;
        const id = nextId++;
        queue.push({ id, cb });
        return id;
      },
      cancelFrame(id) {
        cancels += 1;
        const i = queue.findIndex((q) => q.id === id);
        if (i >= 0) queue.splice(i, 1);
      },
      now: () => now,
    },
    get requests() {
      return requests;
    },
    get cancels() {
      return cancels;
    },
    queued: queue,
    advance(ms) {
      now += ms;
      const due = queue.splice(0, queue.length);
      for (const q of due) q.cb(now);
    },
    setNow(t) {
      now = t;
    },
  };
}

function fakeResponse({ ok = true, status = 200, body = "" } = {}) {
  return {
    ok,
    status,
    text: async () => body,
    arrayBuffer: async () => new TextEncoder().encode(body).buffer,
  };
}

function fakeFetch(routes, calls = []) {
  return async (url, { signal } = {}) => {
    calls.push(url);
    if (signal?.aborted) throw new DOMException("aborted", "AbortError");
    const r = routes[url];
    if (r === "hang") {
      await new Promise((_, reject) => {
        signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")), { once: true });
      });
    }
    if (r === undefined) return fakeResponse({ ok: false, status: 404 });
    if (r instanceof Error) throw r;
    return r;
  };
}

function fakeAudioContext() {
  const ctx = {
    state: "suspended",
    destination: {},
    resumed: 0,
    suspended: 0,
    closed: false,
    async resume() {
      this.resumed += 1;
      this.state = "running";
    },
    async suspend() {
      this.suspended += 1;
      this.state = "suspended";
    },
    createGain() {
      return { gain: { value: 1 }, connect() {}, disconnect() {} };
    },
    createBufferSource() {
      return {
        buffer: null,
        loop: false,
        playbackRate: { value: 1 },
        connect() {},
        disconnect() {},
        start() {},
        stop() {},
      };
    },
    close() {
      this.closed = true;
    },
  };
  return ctx;
}

function memoryStorage() {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
    _map: m,
  };
}

// ---------- GameLoop ----------

test("loop: double start() creates no duplicate RAF chain; reentrant pause/resume/stop safe", () => {
  const s = makeScheduler();
  let steps = 0;
  const loop = new GameLoop({ step: () => steps++, scheduler: s.api });
  loop.start();
  loop.start(); // duplicate start must be ignored
  assert.equal(s.requests, 1);
  s.advance(16.7); // primes the clock
  s.advance(16.7); // first real step
  assert.ok(steps >= 1);
  const afterFirst = s.requests;
  loop.pause();
  loop.pause(); // reentrant pause: single cancel, no throw
  loop.resume();
  loop.resume(); // reentrant resume: no extra chain
  assert.equal(s.requests, afterFirst + 1);
  loop.stop();
  loop.stop(); // reentrant stop safe
  assert.equal(loop.running, false);
  loop.dispose();
});

test("loop: bounded catch-up drops excess time and reports it", () => {
  const s = makeScheduler();
  let steps = 0;
  let dropped = 0;
  const loop = new GameLoop({
    step: () => steps++,
    stepMs: 10,
    maxSteps: 5,
    scheduler: s.api,
    onCatchUpDrop: (ms) => {
      dropped += ms;
    },
  });
  loop.frame(1000); // prime
  loop.frame(1000 + 10 * 5 + 237); // 7.87 steps worth: only 5 run
  assert.equal(steps, 5);
  assert.ok(dropped >= 236, `expected ~237ms dropped, got ${dropped}`);
  assert.ok(loop.droppedMs >= 236);
  loop.dispose();
});

test("loop: render receives interpolation alpha in [0,1)", () => {
  const s = makeScheduler();
  const alphas = [];
  const loop = new GameLoop({ step: () => {}, render: (a) => alphas.push(a), stepMs: 10, scheduler: s.api });
  loop.frame(0);
  loop.frame(15); // 1 step + 5ms remainder => alpha 0.5
  assert.equal(alphas.at(-1), 0.5);
  loop.dispose();
});

test("loop: hidden tab advances no timer (clock reset, auto-pause)", () => {
  const s = makeScheduler();
  let steps = 0;
  const vis = new FakeTarget();
  const loop = new GameLoop({ step: () => steps++, stepMs: 10, scheduler: s.api, visibilityTarget: vis });
  loop.start();
  s.advance(30); // primes the clock
  s.advance(30); // first real steps
  const before = steps;
  assert.ok(before >= 1);
  vis.dispatch("visibilitychange", {});
  assert.equal(loop.paused, true);
  loop.resume();
  const resumedSteps = steps;
  s.advance(5); // first frame after resume only primes the clock: no catch-up burst
  assert.ok(steps - resumedSteps <= 1, `no time jump across background, got ${steps - resumedSteps} steps`);
  loop.dispose();
});

test("loop: dispose stops chain and detaches visibility listeners", () => {
  const s = makeScheduler();
  const vis = new FakeTarget();
  const loop = new GameLoop({ step: () => {}, scheduler: s.api, visibilityTarget: vis });
  loop.start();
  assert.ok(vis.listenerCount("visibilitychange") >= 1);
  loop.dispose();
  assert.equal(loop.running, false);
  assert.equal(vis.listenerCount("visibilitychange"), 0);
  assert.throws(() => loop.start(), /disposed/);
});

// ---------- SceneMachine ----------

test("scenes: illegal transition throws; unknown scene throws; legal path works", () => {
  const order = [];
  const m = new SceneMachine({
    scenes: {
      title: { enter: () => order.push("enter-title"), exit: () => order.push("exit-title") },
      play: { enter: () => order.push("enter-play") },
    },
    transitions: { title: ["play"], play: [] },
  });
  m.go("title");
  assert.equal(m.current, "title");
  assert.throws(() => m.go("title"), IllegalTransitionError);
  assert.throws(() => m.go("nope"), UnknownSceneError);
  m.go("play");
  assert.deepEqual(order, ["enter-title", "exit-title", "enter-play"]);
  assert.throws(() => m.go("title"), IllegalTransitionError);
  m.dispose();
});

test("scenes: stale timer callback cannot mutate a restarted scene (epoch invalidation)", () => {
  const timers = new Map();
  let nextId = 1;
  const timer = {
    setTimeout: (fn) => {
      const id = nextId++;
      timers.set(id, fn);
      return id;
    },
    clearTimeout: (id) => {
      timers.delete(id);
    },
  };
  const m = new SceneMachine({ scenes: { a: {}, b: {} }, timer });
  let score = 0;
  m.go("a");
  m.schedule(100, () => {
    score += 1;
  });
  assert.equal(timers.size, 1);
  m.go("b"); // invalidation: pending timer cancelled
  assert.equal(timers.size, 0);
  // A callback captured at an old epoch that still fires must be dropped.
  const tok = m.token();
  m.go("a");
  let lateFired = false;
  const staleToken = { epoch: tok.epoch - 1, valid: () => false };
  const h = m.schedule(50, () => {
    lateFired = true;
  }, staleToken);
  for (const [, fn] of [...timers]) fn();
  assert.equal(lateFired, false);
  assert.equal(h.stale, true);
  assert.equal(score, 0);
  m.dispose();
});

test("scenes: scope() wrapper drops stale callbacks, runs fresh ones", () => {
  const m = new SceneMachine({ scenes: { a: {}, b: {} } });
  m.go("a");
  let calls = 0;
  const scoped = m.scope(() => {
    calls += 1;
    return "fresh";
  });
  const r1 = scoped();
  assert.equal(r1.stale, false);
  assert.equal(r1.result, "fresh");
  m.go("b"); // epoch bump invalidates the old wrapper
  const r2 = scoped();
  assert.equal(r2.stale, true);
  assert.equal(calls, 1);
  m.dispose();
});

test("scenes: reset() recovers to a known scene with a fresh epoch", () => {
  const m = new SceneMachine({
    scenes: { title: {}, play: {} },
    transitions: { title: ["play"], play: [] },
  });
  m.go("title");
  m.go("play");
  const e1 = m.epoch;
  m.reset("title"); // recovery ignores the guard map
  assert.equal(m.current, "title");
  assert.ok(m.epoch > e1);
  assert.equal(m.token().valid(), true);
  m.dispose();
});

// ---------- Camera ----------

test("camera: portrait reflows (keeps width readable) instead of downscaling desktop", () => {
  const cam = new Camera({ designWidth: 960, designHeight: 600 });
  const land = cam.layout(1280, 800);
  assert.equal(land.mode, "landscape");
  const port = cam.layout(390, 844); // phone CSS pixels
  assert.equal(port.mode, "portrait");
  assert.equal(port.visibleW, 960); // full design width stays visible
  assert.ok(port.scale > land.scale * 0.3, "portrait must not shrink to an unreadable scale");
  const mid = { x: 480, y: 300 };
  const s = cam.worldToScreen(mid.x, mid.y, port);
  const back = cam.screenToWorld(s.x, s.y, port);
  assert.ok(Math.abs(back.x - mid.x) < 1e-9 && Math.abs(back.y - mid.y) < 1e-9);
});

test("camera: screenToWorld honors canvas rect offset", () => {
  const cam = new Camera({ designWidth: 800, designHeight: 600 });
  const l = cam.layout(800, 600);
  const w = cam.screenToWorld(100, 50, l, { left: 100, top: 50, width: 800, height: 600 });
  assert.deepEqual(w, { x: 0, y: 0 });
});

// ---------- Input ----------

test("input: pointer maps through viewport-to-world transform; tap fires with world coords", () => {
  const target = new FakeTarget();
  const taps = [];
  const pointers = [];
  let now = 1000;
  const input = new Input({
    pointerTarget: target,
    getRect: () => ({ left: 10, top: 20, width: 800, height: 600 }),
    toWorld: (sx, sy, rect) => ({ x: (sx - rect.left) / 2, y: (sy - rect.top) / 2 }),
    onTap: (ev) => taps.push(ev),
    onPointer: (ev) => pointers.push(ev.type),
    clock: () => now,
  }).attach();
  target.dispatch("pointerdown", { pointerId: 1, clientX: 110, clientY: 120, button: 0, target: {} });
  now += 100;
  target.dispatch("pointerup", { pointerId: 1, clientX: 112, clientY: 121, button: 0, target: {} });
  assert.equal(taps.length, 1);
  assert.deepEqual(taps[0].world, { x: 51, y: 50.5 });
  assert.deepEqual(pointers, ["down", "up"]);
  input.dispose();
});

test("input: pointercancel never synthesizes a tap; pointer released from tracking", () => {
  const target = new FakeTarget();
  const taps = [];
  const input = new Input({ pointerTarget: target, onTap: (ev) => taps.push(ev) }).attach();
  target.dispatch("pointerdown", { pointerId: 7, clientX: 50, clientY: 50, target: {} });
  assert.equal(input.pointers.size, 1);
  target.dispatch("pointercancel", { pointerId: 7, clientX: 51, clientY: 51, target: {} });
  assert.equal(taps.length, 0);
  assert.equal(input.pointers.size, 0);
  input.dispose();
});

test("input: drag beyond slop is not a tap (tap-select stays a precision alternative)", () => {
  const target = new FakeTarget();
  const taps = [];
  const input = new Input({ pointerTarget: target, tapSlopPx: 12, onTap: (ev) => taps.push(ev) }).attach();
  target.dispatch("pointerdown", { pointerId: 1, clientX: 0, clientY: 0, target: {} });
  target.dispatch("pointerup", { pointerId: 1, clientX: 100, clientY: 0, target: {} });
  assert.equal(taps.length, 0);
  input.dispose();
});

test("input: blur clears held keys; preventDefault only for owned controls, never forms", () => {
  const keys = new FakeTarget();
  let owned = 0;
  const input = new Input({
    keyTarget: keys,
    blurTarget: keys,
    bindings: { " ": () => owned++ },
  }).attach();
  const space = keys.dispatch("keydown", { key: " ", target: {} });
  assert.equal(space.defaultPrevented, true);
  assert.equal(owned, 1);
  assert.ok(input.isDown(" "));
  const other = keys.dispatch("keydown", { key: "q", target: {} });
  assert.equal(other.defaultPrevented, false); // unbound key: leave to the page
  const form = keys.dispatch("keydown", { key: " ", target: { tagName: "INPUT" } });
  assert.equal(form.defaultPrevented, false); // never hijack text forms
  assert.ok(input.isDown(" "));
  keys.dispatch("blur", {});
  assert.equal(input.isDown(" "), false); // stuck keys released on blur
  keys.dispatch("keydown", { key: " ", repeat: true, target: {} });
  assert.equal(owned, 1); // auto-repeat dropped by default
  input.dispose();
});

test("input: dispose detaches every listener", () => {
  const target = new FakeTarget();
  const input = new Input({ pointerTarget: target, keyTarget: target }).attach();
  assert.ok(target.listenerCount("pointerdown") >= 1);
  input.dispose();
  assert.equal(target.listenerCount("pointerdown"), 0);
  assert.equal(target.listenerCount("keydown"), 0);
});

// ---------- Assets ----------

test("assets: missing file is an explicit error, never silent success", async () => {
  const calls = [];
  const am = new AssetManager({ fetchImpl: fakeFetch({}, calls), timeoutMs: 0 });
  am.define("nope", { url: "art/nope.png", kind: "text" });
  await assert.rejects(() => am.load("nope"), (err) => {
    assert.ok(err instanceof AssetError);
    assert.equal(err.code, "missing");
    return true;
  });
  assert.equal(am.cached("nope"), null); // failure leaves no fake entry
});

test("assets: duplicate in-flight loads deduplicate to one fetch", async () => {
  const calls = [];
  const am = new AssetManager({
    fetchImpl: fakeFetch({ "data/words.json": fakeResponse({ body: '{"a":1}' }) }, calls),
    timeoutMs: 0,
  });
  am.define("words", { url: "data/words.json", kind: "json" });
  const [a, b] = await Promise.all([am.load("words"), am.load("words")]);
  assert.equal(calls.length, 1);
  assert.deepEqual(a.value, { a: 1 });
  assert.deepEqual(b.value, { a: 1 });
  const c = await am.load("words"); // cached: no second fetch
  assert.equal(calls.length, 1);
  assert.deepEqual(c.value, { a: 1 });
});

test("assets: invalid JSON is a decode error; declared fallback is honored and flagged", async () => {
  const am = new AssetManager({
    fetchImpl: fakeFetch({ "data/bad.json": fakeResponse({ body: "{oops" }) }),
    timeoutMs: 0,
  });
  am.define("bad", { url: "data/bad.json", kind: "json" });
  await assert.rejects(() => am.load("bad"), (err) => err instanceof AssetError && err.code === "decode");
  am.define("bad-fb", { url: "data/bad.json", kind: "json", fallback: { safe: true } });
  const entry = await am.load("bad-fb");
  assert.deepEqual(entry.value, { safe: true });
  assert.equal(entry.fallbackUsed, true);
});

test("assets: abort cancels loadAll with code 'aborted'", async () => {
  const am = new AssetManager({ fetchImpl: fakeFetch({ "slow/a.txt": "hang" }), timeoutMs: 0, concurrency: 1 });
  am.define("a", { url: "slow/a.txt", kind: "text" });
  const ctrl = new AbortController();
  const p = am.loadAll(["a"], { signal: ctrl.signal });
  ctrl.abort();
  await assert.rejects(() => p, (err) => err instanceof AssetError && err.code === "aborted");
});

test("assets: timeout surfaces code 'timeout' instead of hanging", async () => {
  const am = new AssetManager({ fetchImpl: fakeFetch({ "slow/b.txt": "hang" }), timeoutMs: 20, concurrency: 1 });
  am.define("b", { url: "slow/b.txt", kind: "text" });
  await assert.rejects(() => am.load("b"), (err) => err instanceof AssetError && err.code === "timeout");
});

test("assets: loadAll reports monotonic progress and bounds concurrency", async () => {
  const seen = [];
  let live = 0;
  let peak = 0;
  const gate = async (url) => {
    live += 1;
    peak = Math.max(peak, live);
    await new Promise((r) => setTimeout(r, 5));
    live -= 1;
    return fakeResponse({ body: url });
  };
  const am = new AssetManager({ fetchImpl: gate, timeoutMs: 0, concurrency: 2 });
  for (let i = 0; i < 5; i++) am.define(`t${i}`, { url: `t${i}.txt`, kind: "text" });
  let last = -1;
  const results = await am.loadAll(["t0", "t1", "t2", "t3", "t4"], {
    onProgress: ({ done, total }) => {
      assert.equal(total, 5);
      assert.ok(done >= last);
      last = done;
      seen.push(done);
    },
  });
  assert.equal(results.length, 5);
  assert.ok(seen.includes(5));
  assert.ok(peak <= 2, `concurrency bound violated: peak ${peak}`);
});

// ---------- Audio ----------

test("audio: silent environment never blocks play (unavailable reported, playCue safe)", async () => {
  const mix = new AudioMixer({ createContext: () => null });
  assert.equal(await mix.unlock(), false);
  const st = mix.status();
  assert.equal(st.available, false);
  assert.ok(st.reason.length > 0);
  mix.registerCue("click", { fake: "buffer" });
  const r = mix.playCue("click");
  assert.equal(r.played, false);
  assert.ok(r.reason.length > 0);
  mix.dispose();
});

test("audio: locked context refuses cues; unlock enables them; mute silences without throwing", async () => {
  const ctx = fakeAudioContext();
  const mix = new AudioMixer({ createContext: () => ctx });
  mix.registerCue("click", { fake: "buffer" });
  assert.deepEqual(mix.playCue("click"), { played: false, reason: "locked" });
  assert.equal(await mix.unlock(), true);
  const ok = mix.playCue("click");
  assert.equal(ok.played, true);
  mix.setMuted(true);
  assert.deepEqual(mix.playCue("click"), { played: false, reason: "muted" });
  mix.setMuted(false);
  assert.equal(mix.playCue("click").played, true);
  // visibility suspend/resume is graceful
  const vis = new FakeTarget();
  const mix2 = new AudioMixer({ createContext: () => fakeAudioContext(), visibilityTarget: vis });
  await mix2.unlock();
  vis.hidden = true;
  vis.dispatch("visibilitychange", {});
  await new Promise((r) => setTimeout(r, 0));
  mix.dispose();
  mix2.dispose();
  assert.ok(ctx.closed);
});

test("audio: mute/volume persist through integration hooks", async () => {
  const saved = [];
  const mix = new AudioMixer({
    createContext: () => fakeAudioContext(),
    loadPersisted: () => ({ muted: true, volume: 0.5 }),
    savePersisted: (s) => saved.push(s),
  });
  assert.equal(mix.muted, true);
  assert.equal(mix.volume, 0.5);
  mix.setVolume(0.8);
  mix.setMuted(false);
  assert.deepEqual(saved.at(-1), { muted: false, volume: 0.8 });
  mix.dispose();
});

// ---------- RNG / FX ----------

test("rng: same seed replays the same stream; shuffle is pure and deterministic", () => {
  const a = new SeededRng("melon-reef");
  const b = new SeededRng("melon-reef");
  const seqA = Array.from({ length: 10 }, () => a.next());
  const seqB = Array.from({ length: 10 }, () => b.next());
  assert.deepEqual(seqA, seqB);
  const src = [1, 2, 3, 4, 5];
  const s1 = new SeededRng(42).shuffle(src);
  const s2 = new SeededRng(42).shuffle(src);
  assert.deepEqual(s1, s2);
  assert.deepEqual(src, [1, 2, 3, 4, 5]); // input untouched
  assert.deepEqual([...s1].sort((x, y) => x - y), [1, 2, 3, 4, 5]);
  assert.equal(hashSeed("x"), hashSeed("x"));
});

test("fx: reduced motion spawns nothing and completes tweens instantly", () => {
  const p = new Particles({ reducedMotion: true, rand: () => 0.5 });
  assert.equal(p.burst(10, 10, { count: 50 }), 0);
  assert.equal(p.count, 0);
  const t = new Tweens({ reducedMotion: true });
  const seen = [];
  let done = false;
  t.add({
    durationMs: 1000,
    onUpdate: (v) => seen.push(v),
    onComplete: () => {
      done = true;
    },
  });
  assert.deepEqual(seen, [1]);
  assert.equal(done, true);
});

test("fx: particle pool is bounded; tweens advance on injected clock and cancel", () => {
  let now = 0;
  const p = new Particles({ max: 10, rand: () => 0.25 });
  p.burst(0, 0, { count: 25 });
  assert.equal(p.count, 10);
  p.update(10);
  assert.equal(p.count, 0);
  const t = new Tweens({ clock: () => now });
  const seen = [];
  let done = false;
  const h = t.add({ durationMs: 100, onUpdate: (v) => seen.push(v), onComplete: () => (done = true) });
  now = 50;
  t.update();
  assert.ok(seen.length >= 1 && seen.at(-1) < 1 && !done);
  h.cancel();
  now = 200;
  t.update();
  assert.equal(done, false);
  assert.equal(t.count, 0);
});

// ---------- Storage ----------

test("storage: round-trip, scope isolation, version mismatch reports migrated:false", () => {
  const backing = memoryStorage();
  const a = new VersionedStore({ scope: "ev.save.game-a", version: 2, storage: backing });
  const b = new VersionedStore({ scope: "ev.save.game-b", version: 2, storage: backing });
  assert.deepEqual(a.save("slot1", { level: 3 }), { ok: true, code: "" });
  assert.deepEqual(a.load("slot1", null).data, { level: 3 });
  assert.equal(b.load("slot1", "fallback").fallbackUsed, true); // isolated scopes
  const old = new VersionedStore({ scope: "ev.save.game-a", version: 1, storage: backing });
  const r = old.load("slot1", "fallback");
  assert.equal(r.fallbackUsed, true);
  assert.equal(r.migrated, false);
  assert.equal(r.storedVersion, 2);
});

test("storage: corrupt entry quarantines backup, returns fallback, never throws", () => {
  const backing = memoryStorage();
  backing.setItem("ev.save.g/slot1", "{not json!!!");
  const store = new VersionedStore({ scope: "ev.save.g", version: 1, storage: backing });
  const r = store.load("slot1", { fresh: true });
  assert.equal(r.corrupted, true);
  assert.equal(r.fallbackUsed, true);
  assert.deepEqual(r.data, { fresh: true });
  assert.equal(backing.getItem("ev.save.g/slot1.corrupt"), "{not json!!!");
  assert.equal(backing.getItem("ev.save.g/slot1"), null); // bad entry cleared
  const throwing = new VersionedStore({ scope: "ev.save.g", version: 1, storage: backing, onCorrupt: "throw" });
  backing.setItem("ev.save.g/slot2", "###");
  assert.throws(() => throwing.load("slot2", null), StorageError);
});

test("storage: quota errors surface as { ok:false, code:'quota' }", () => {
  const full = memoryStorage();
  full.setItem = () => {
    const err = new Error("QuotaExceededError");
    err.name = "QuotaExceededError";
    throw err;
  };
  const store = new VersionedStore({ scope: "ev.save.g", storage: full });
  const r = store.save("slot1", { big: true });
  assert.equal(r.ok, false);
  assert.equal(r.code, "quota");
});
