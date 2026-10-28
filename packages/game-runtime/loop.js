// Fixed-step game loop with render interpolation and bounded catch-up.
// Browser ESM; the scheduler (RAF/cancel/now) is injectable so tests and
// games can drive the loop with a fake clock. Nothing here touches
// window/document at import time — defaults resolve lazily in start().

const DEFAULT_STEP_MS = 1000 / 60;

function defaultScheduler() {
  const g = globalThis;
  if (typeof g.requestAnimationFrame === "function") {
    return {
      requestFrame: (cb) => g.requestAnimationFrame(cb),
      cancelFrame: (id) => g.cancelAnimationFrame(id),
      now: () => (typeof g.performance !== "undefined" ? g.performance.now() : Date.now()),
    };
  }
  // Non-browser fallback (also handy for smoke tests): setTimeout chain.
  return {
    requestFrame: (cb) => setTimeout(() => cb(Date.now()), 16),
    cancelFrame: (id) => clearTimeout(id),
    now: () => Date.now(),
  };
}

/**
 * @param {object} opts
 * @param {(dtMs:number)=>void} opts.step        fixed-step simulation update
 * @param {(alpha:number)=>void} [opts.render]   render; alpha in [0,1) is the
 *   interpolation factor between the last and next fixed step
 * @param {number} [opts.stepMs=16.667]          fixed step size
 * @param {number} [opts.maxSteps=5]             max sim steps per frame; excess
 *   time is dropped and reported via onCatchUpDrop (bounded catch-up)
 * @param {object} [opts.scheduler]              { requestFrame, cancelFrame, now }
 * @param {object} [opts.visibilityTarget]       EventTarget-like watched for
 *   "visibilitychange"/"blur"; when hidden the clock resets so no timer
 *   advances while in background. Pass null to disable.
 * @param {boolean} [opts.autoPauseOnHidden=true]
 * @param {(droppedMs:number)=>void} [opts.onCatchUpDrop]
 */
export class GameLoop {
  constructor(opts = {}) {
    if (typeof opts.step !== "function") throw new TypeError("GameLoop needs opts.step(dtMs)");
    this.step = opts.step;
    this.render = typeof opts.render === "function" ? opts.render : null;
    this.stepMs = opts.stepMs ?? DEFAULT_STEP_MS;
    this.maxSteps = opts.maxSteps ?? 5;
    if (!(this.stepMs > 0)) throw new RangeError("stepMs must be > 0");
    if (!(this.maxSteps >= 1)) throw new RangeError("maxSteps must be >= 1");
    this.scheduler = opts.scheduler ?? null; // resolved lazily
    this.visibilityTarget = opts.visibilityTarget === undefined ? null : opts.visibilityTarget;
    this.autoPauseOnHidden = opts.autoPauseOnHidden ?? true;
    this.onCatchUpDrop = typeof opts.onCatchUpDrop === "function" ? opts.onCatchUpDrop : null;
    this.onError = typeof opts.onError === "function" ? opts.onError : null;

    this.running = false;
    this.paused = false;
    this.frameId = null;
    this.lastTime = null;
    this.accumulator = 0;
    this.totalSteps = 0;
    this.droppedMs = 0;
    this._boundFrame = (t) => this._frame(t);
    this._onHidden = () => this._handleHidden();
    this._visibilityAttached = false;
    this._disposed = false;
  }

  get disposed() {
    return this._disposed;
  }

  /** Start the RAF chain. Idempotent: a second start() never creates a duplicate chain. */
  start() {
    if (this._disposed) throw new Error("GameLoop is disposed");
    if (this.running) return;
    if (!this.scheduler) this.scheduler = defaultScheduler();
    this.running = true;
    this.paused = false;
    this.lastTime = null;
    this.accumulator = 0;
    this._attachVisibility();
    this.frameId = this.scheduler.requestFrame(this._boundFrame);
  }

  /** Stop stepping/rendering and cancel the pending frame. State is kept for resume(). */
  stop() {
    if (!this.running) return;
    this.running = false;
    this.paused = false;
    if (this.scheduler && this.frameId !== null) {
      try {
        this.scheduler.cancelFrame(this.frameId);
      } catch {
        /* scheduler teardown must not throw */
      }
    }
    this.frameId = null;
    this.lastTime = null;
    this.accumulator = 0;
  }

  /** Pause: cancel the chain and freeze the clock. Reentrant-safe. */
  pause() {
    if (!this.running || this.paused) return;
    this.paused = true;
    if (this.scheduler && this.frameId !== null) {
      try {
        this.scheduler.cancelFrame(this.frameId);
      } catch {
        /* ignore */
      }
    }
    this.frameId = null;
    this.lastTime = null; // so resume() never advances time across the pause
    this.accumulator = 0;
  }

  /** Resume after pause(). If the loop was stopped (not paused), this restarts it. */
  resume() {
    if (this._disposed) throw new Error("GameLoop is disposed");
    if (!this.running) {
      this.start();
      return;
    }
    if (!this.paused) return;
    if (!this.scheduler) this.scheduler = defaultScheduler();
    this.paused = false;
    this.lastTime = null;
    this.accumulator = 0;
    this.frameId = this.scheduler.requestFrame(this._boundFrame);
  }

  /** Stop everything and detach listeners. The instance must not be reused. */
  dispose() {
    if (this._disposed) return;
    this.stop();
    this._detachVisibility();
    this._disposed = true;
  }

  /**
   * Drive one frame manually with an explicit timestamp (tests, custom hosts).
   * Safe to call while running or stopped; honors pause.
   */
  frame(now) {
    if (this.paused || this._disposed) return { steps: 0, alpha: 0 };
    if (this.lastTime === null) {
      this.lastTime = now;
      if (this.render) this.render(0);
      return { steps: 0, alpha: 0 };
    }
    let delta = now - this.lastTime;
    this.lastTime = now;
    if (delta < 0) delta = 0; // clock went backwards: never step backwards
    const budget = this.stepMs * this.maxSteps;
    if (delta > budget) {
      const dropped = delta - budget;
      this.droppedMs += dropped;
      if (this.onCatchUpDrop) {
        try {
          this.onCatchUpDrop(dropped);
        } catch {
          /* reporter must not break the loop */
        }
      }
      delta = budget;
    }
    this.accumulator += delta;
    let steps = 0;
    while (this.accumulator >= this.stepMs && steps < this.maxSteps) {
      this.step(this.stepMs);
      this.totalSteps += 1;
      this.accumulator -= this.stepMs;
      steps += 1;
    }
    const alpha = this.accumulator / this.stepMs;
    if (this.render) this.render(alpha);
    return { steps, alpha };
  }

  _frame(now) {
    if (!this.running || this.paused) return;
    // Chain first so a throwing step/render cannot kill the loop.
    this.frameId = this.scheduler.requestFrame(this._boundFrame);
    const t = typeof now === "number" ? now : this.scheduler.now();
    try {
      this.frame(t);
    } catch (err) {
      if (this.onError) {
        try {
          this.onError(err);
        } catch {
          /* reporter must not break the loop */
        }
      }
    }
  }

  _handleHidden() {
    // Background tab / blur: reset the clock so no timer advances while hidden.
    this.lastTime = null;
    this.accumulator = 0;
    if (this.autoPauseOnHidden && this.running && !this.paused) this.pause();
  }

  _attachVisibility() {
    const t = this.visibilityTarget;
    if (!t || this._visibilityAttached || typeof t.addEventListener !== "function") return;
    // Resolve lazily: in browsers the caller passes `document`; in tests a fake.
    t.addEventListener("visibilitychange", this._onHidden);
    const win = this._windowOf(t);
    if (win && win !== t && typeof win.addEventListener === "function") {
      win.addEventListener("blur", this._onHidden);
    } else if (typeof t.addEventListener === "function") {
      t.addEventListener("blur", this._onHidden);
    }
    this._visibilityAttached = true;
  }

  _detachVisibility() {
    const t = this.visibilityTarget;
    if (!t || !this._visibilityAttached || typeof t.removeEventListener !== "function") return;
    try {
      t.removeEventListener("visibilitychange", this._onHidden);
      t.removeEventListener("blur", this._onHidden);
    } catch {
      /* ignore */
    }
    const win = this._windowOf(t);
    if (win && win !== t && typeof win.removeEventListener === "function") {
      try {
        win.removeEventListener("blur", this._onHidden);
      } catch {
        /* ignore */
      }
    }
    this._visibilityAttached = false;
  }

  _windowOf(t) {
    // document-like targets expose defaultView; fakes may carry .window.
    if (t && typeof t === "object") {
      if (t.window) return t.window;
      if (t.defaultView) return t.defaultView;
    }
    return null;
  }
}
