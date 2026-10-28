// Explicit scene/state machine with guarded transitions and epoch tokens.
// Every activation gets a fresh epoch. Async/timer/animation callbacks must
// capture the epoch (via token() or schedule()) and check it before mutating
// scene state, so a restarted scene can never be corrupted by a stale callback.
// No module-level mutable state: all ownership lives on the instance.

export class IllegalTransitionError extends Error {
  constructor(from, to) {
    super(`Illegal scene transition: ${from ?? "(none)"} -> ${to}`);
    this.name = "IllegalTransitionError";
    this.from = from;
    this.to = to;
    this.code = "illegal-transition";
  }
}

export class UnknownSceneError extends Error {
  constructor(name) {
    super(`Unknown scene: ${name}`);
    this.name = "UnknownSceneError";
    this.scene = name;
    this.code = "unknown-scene";
  }
}

/**
 * @param {object} [opts]
 * @param {Record<string,{enter?,exit?,update?,render?}>} [opts.scenes]
 * @param {Record<string,string[]>|null} [opts.transitions] map of scene ->
 *   legal destinations. Null (default) allows any registered -> registered
 *   transition. Use ["*"] as a destination list to allow all exits.
 * @param {object} [opts.timer] { setTimeout, clearTimeout } — injectable for tests.
 */
export class SceneMachine {
  constructor(opts = {}) {
    this.scenes = new Map();
    this.transitions = opts.transitions === undefined ? null : opts.transitions;
    this.timer = opts.timer ?? {
      setTimeout: (fn, ms) => setTimeout(fn, ms),
      clearTimeout: (id) => clearTimeout(id),
    };
    this.current = null;
    this.epoch = 0;
    this.history = [];
    this._pendingTimers = new Set();
    this._disposed = false;
    for (const [name, def] of Object.entries(opts.scenes ?? {})) this.addScene(name, def);
  }

  get disposed() {
    return this._disposed;
  }

  addScene(name, def = {}) {
    if (typeof name !== "string" || !name) throw new TypeError("scene name must be a non-empty string");
    if (this.scenes.has(name)) throw new Error(`Scene already registered: ${name}`);
    this.scenes.set(name, {
      enter: typeof def.enter === "function" ? def.enter : null,
      exit: typeof def.exit === "function" ? def.exit : null,
      update: typeof def.update === "function" ? def.update : null,
      render: typeof def.render === "function" ? def.render : null,
    });
    return this;
  }

  has(name) {
    return this.scenes.has(name);
  }

  /** Legal destinations from the current (or given) scene. */
  legalFrom(from = this.current) {
    if (this.transitions === null) return [...this.scenes.keys()].filter((s) => s !== from);
    if (from === null) return [...this.scenes.keys()];
    const list = this.transitions[from];
    if (!list) return [];
    if (list.includes("*")) return [...this.scenes.keys()].filter((s) => s !== from);
    return list.filter((s) => this.scenes.has(s));
  }

  canGo(to, from = this.current) {
    if (!this.scenes.has(to)) return false;
    if (this.transitions === null) return true;
    if (from === null) return true;
    const list = this.transitions[from];
    if (!list) return false;
    return list.includes("*") || list.includes(to);
  }

  /**
   * Transition to `to`. Throws IllegalTransitionError / UnknownSceneError.
   * exit(old) runs before the epoch bump; enter(new) runs after, receiving a
   * fresh token. Returns the token for `to`.
   */
  go(to, payload) {
    if (this._disposed) throw new Error("SceneMachine is disposed");
    if (!this.scenes.has(to)) throw new UnknownSceneError(to);
    const from = this.current;
    if (from !== null && !this.canGo(to, from)) throw new IllegalTransitionError(from, to);
    const oldDef = from !== null ? this.scenes.get(from) : null;
    if (oldDef?.exit) {
      try {
        oldDef.exit({ from, to, payload, machine: this });
      } catch (err) {
        // A failing exit must not wedge the machine: record and continue.
        this.history.push({ from, to, ok: false, phase: "exit", error: String(err?.message ?? err) });
        throw err;
      }
    }
    this._cancelPendingTimers();
    this.epoch += 1;
    this.current = to;
    const token = this.token();
    const def = this.scenes.get(to);
    if (def.enter) def.enter({ from, to, payload, machine: this, token });
    this.history.push({ from, to, ok: true });
    return token;
  }

  /** Force back to a known scene (recovery path): clears pending timers, bumps epoch. */
  reset(to, payload) {
    if (this._disposed) throw new Error("SceneMachine is disposed");
    if (!this.scenes.has(to)) throw new UnknownSceneError(to);
    this._cancelPendingTimers();
    this.epoch += 1;
    const from = this.current;
    this.current = to;
    const token = this.token();
    const def = this.scenes.get(to);
    if (def.enter) def.enter({ from, to, payload, machine: this, token, reset: true });
    this.history.push({ from, to, ok: true, reset: true });
    return token;
  }

  /** Capture the current epoch. `token.valid()` is false after any later go()/reset(). */
  token() {
    const seen = this.epoch;
    const machine = this;
    return {
      epoch: seen,
      valid() {
        return !machine._disposed && machine.epoch === seen;
      },
    };
  }

  /**
   * Wrap a callback so it no-ops when its epoch is stale. Returns an object
   * { run(...args) } — or use schedule() for timed callbacks.
   */
  scope(fn, token = this.token()) {
    const machine = this;
    return function scoped(...args) {
      if (machine._disposed || machine.epoch !== token.epoch) return { stale: true };
      return { stale: false, result: fn(...args) };
    };
  }

  /**
   * setTimeout bound to an epoch: if go()/reset() happens first, the callback
   * is dropped and marked stale instead of mutating the new scene.
   * Returns a handle { cancel(), get stale(), get fired() }.
   */
  schedule(delayMs, fn, token = this.token()) {
    if (this._disposed) throw new Error("SceneMachine is disposed");
    const handle = { stale: false, fired: false, cancel: () => {} };
    const id = this.timer.setTimeout(() => {
      this._pendingTimers.delete(id);
      if (this.epoch !== token.epoch || this._disposed) {
        handle.stale = true;
        return;
      }
      handle.fired = true;
      fn();
    }, delayMs);
    this._pendingTimers.add(id);
    handle.cancel = () => {
      this._pendingTimers.delete(id);
      try {
        this.timer.clearTimeout(id);
      } catch {
        /* ignore */
      }
    };
    return handle;
  }

  update(dtMs) {
    if (this.current === null) return;
    const def = this.scenes.get(this.current);
    if (def?.update) def.update(dtMs, { machine: this, token: this.token() });
  }

  render(alpha) {
    if (this.current === null) return;
    const def = this.scenes.get(this.current);
    if (def?.render) def.render(alpha, { machine: this });
  }

  dispose() {
    if (this._disposed) return;
    this._cancelPendingTimers();
    this.scenes.clear();
    this.current = null;
    this._disposed = true;
  }

  _cancelPendingTimers() {
    for (const id of this._pendingTimers) {
      try {
        this.timer.clearTimeout(id);
      } catch {
        /* ignore */
      }
    }
    this._pendingTimers.clear();
  }
}
