// Bounded particles + tweens. Both respect reduced motion: when enabled,
// particles spawn nothing and tweens jump to their end state, so games stay
// fully playable for motion-sensitive players. Pools are capped so effects
// can never grow without bound.

export const Easing = {
  linear: (t) => t,
  easeOut: (t) => 1 - Math.pow(1 - t, 3),
  easeIn: (t) => t * t * t,
  easeInOut: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
};

/**
 * @param {object} [opts]
 * @param {number} [opts.max=500] pool cap; oldest particles are recycled
 * @param {()=>number} [opts.rand] random source in [0,1) (default Math.random)
 * @param {boolean} [opts.reducedMotion=false] injectable (game reads matchMedia)
 */
export class Particles {
  constructor(opts = {}) {
    this.max = opts.max ?? 500;
    if (!(this.max >= 1)) throw new RangeError("max must be >= 1");
    this.rand = typeof opts.rand === "function" ? opts.rand : Math.random;
    this.reducedMotion = !!opts.reducedMotion;
    this.list = [];
  }

  get count() {
    return this.list.length;
  }

  /**
   * Spawn a burst. Returns the number actually spawned (0 when reduced motion).
   * Each particle: { x, y, vx, vy, life, maxLife, size, color, gravity, drag }.
   */
  burst(x, y, opts = {}) {
    if (this.reducedMotion) return 0;
    const n = Math.max(0, Math.floor(opts.count ?? 12));
    const speed = opts.speed ?? 120;
    const life = opts.life ?? 0.6;
    for (let i = 0; i < n; i++) {
      const a = this.rand() * Math.PI * 2;
      const s = speed * (0.3 + this.rand() * 0.9);
      if (this.list.length >= this.max) this.list.shift(); // recycle oldest
      this.list.push({
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        life: life * (0.6 + this.rand() * 0.7),
        maxLife: life,
        size: opts.size ?? 3,
        color: opts.color ?? "#ffffff",
        gravity: opts.gravity ?? 300,
        drag: opts.drag ?? 0.5,
      });
    }
    return n;
  }

  /** Advance simulation by dt seconds. */
  update(dt) {
    if (!(dt >= 0)) return;
    for (const p of this.list) {
      p.life -= dt;
      const dragF = 1 - Math.min(0.99, p.drag * dt);
      p.vx *= dragF;
      p.vy = p.vy * dragF + p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
    if (this.list.some((p) => p.life <= 0)) this.list = this.list.filter((p) => p.life > 0);
  }

  clear() {
    this.list.length = 0;
  }
}

/**
 * @param {object} [opts]
 * @param {()=>number} [opts.clock] ms clock (default Date.now)
 * @param {boolean} [opts.reducedMotion=false]
 */
export class Tweens {
  constructor(opts = {}) {
    this.clock = typeof opts.clock === "function" ? opts.clock : () => Date.now();
    this.reducedMotion = !!opts.reducedMotion;
    this.active = new Set();
  }

  get count() {
    return this.active.size;
  }

  /**
   * Animate `onUpdate(eased)` from 0..1 over durationMs, then onComplete.
   * With reduced motion the tween completes synchronously at value 1.
   * Returns handle { cancel(), get done() }.
   */
  add({ durationMs = 300, ease = Easing.easeOut, onUpdate, onComplete } = {}) {
    if (typeof onUpdate !== "function") throw new TypeError("tween needs onUpdate");
    if (!(durationMs >= 0)) throw new RangeError("durationMs must be >= 0");
    const easeFn = typeof ease === "function" ? ease : Easing.easeOut;
    if (this.reducedMotion || durationMs === 0) {
      try {
        onUpdate(1);
      } catch {
        /* host hook must not break tweens */
      }
      try {
        onComplete?.();
      } catch {
        /* ignore */
      }
      return { done: true, cancel() {} };
    }
    const handle = {
      done: false,
      cancel: () => {
        handle.done = true;
        this.active.delete(rec);
      },
    };
    const rec = { t0: this.clock(), durationMs, easeFn, onUpdate, onComplete, handle };
    this.active.add(rec);
    return handle;
  }

  /** Advance all tweens; call every frame (or from GameLoop.step). */
  update(now = this.clock()) {
    for (const rec of [...this.active]) {
      const t = rec.durationMs === 0 ? 1 : Math.min(1, (now - rec.t0) / rec.durationMs);
      if (rec.handle.done) {
        this.active.delete(rec);
        continue;
      }
      try {
        rec.onUpdate(rec.easeFn(Math.max(0, t)));
      } catch {
        /* host hook must not break tweens */
      }
      if (t >= 1) {
        rec.handle.done = true;
        this.active.delete(rec);
        try {
          rec.onComplete?.();
        } catch {
          /* ignore */
        }
      }
    }
  }

  clear() {
    for (const rec of this.active) rec.handle.done = true;
    this.active.clear();
  }
}
