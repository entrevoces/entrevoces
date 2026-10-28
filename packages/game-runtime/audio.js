// Audio mixer for BUNDLED cue/ambience files. No TTS, no synthesis claims,
// no runtime network. The AudioContext factory is injected so silent
// environments (no WebAudio) and tests report { available:false } and keep
// the game playable: playCue() then returns { played:false } instead of
// throwing, and nothing blocks play.

/**
 * @param {object} [opts]
 * @param {()=>AudioContext|null} [opts.createContext] factory; return null when
 *   audio is unavailable (default: try window.AudioContext lazily)
 * @param {()=>({muted:boolean,volume:number}|null)} [opts.loadPersisted] read
 *   mute/volume (game wires this to VersionedStore)
 * @param {(state:{muted:boolean,volume:number})=>void} [opts.savePersisted]
 * @param {object} [opts.visibilityTarget] watched for visibilitychange/hidden
 *   to suspend; visible to resume. Pass null to disable.
 * @param {object} [opts.nowImpl] unused; kept out — timing uses context clock.
 */
export class AudioMixer {
  constructor(opts = {}) {
    this.createContext = opts.createContext ?? defaultCreateContext;
    this.loadPersisted = typeof opts.loadPersisted === "function" ? opts.loadPersisted : null;
    this.savePersisted = typeof opts.savePersisted === "function" ? opts.savePersisted : null;
    this.visibilityTarget = opts.visibilityTarget === undefined ? null : opts.visibilityTarget;

    this.context = null;
    this.available = null; // unknown until ensureContext()
    this.unavailableReason = "";
    this.unlocked = false;
    this.muted = false;
    this.volume = 1;
    this.masterGain = null;
    this.cues = new Map(); // name -> AudioBuffer (or opaque buffer from adapter)
    this.ambienceNodes = new Map(); // name -> { source, gain }
    this._visibilityAttached = false;
    this._disposed = false;

    try {
      const persisted = this.loadPersisted?.();
      if (persisted && typeof persisted === "object") {
        this.muted = !!persisted.muted;
        if (typeof persisted.volume === "number") {
          this.volume = Math.min(1, Math.max(0, persisted.volume));
        }
      }
    } catch {
      /* corrupt persisted prefs must not break audio */
    }
  }

  status() {
    return {
      available: this.available !== false,
      reason: this.available === false ? this.unavailableReason : "",
      unlocked: this.unlocked,
      muted: this.muted,
      volume: this.volume,
      cues: this.cues.size,
    };
  }

  /** Create (or return) the context. Never throws: reports unavailable instead. */
  ensureContext() {
    if (this._disposed) return null;
    if (this.context) return this.context;
    if (this.available === false) return null;
    let ctx = null;
    try {
      ctx = this.createContext();
    } catch (err) {
      return this._markUnavailable(err?.message ?? String(err));
    }
    if (!ctx) return this._markUnavailable("no WebAudio in this environment");
    this.context = ctx;
    this.available = true;
    try {
      this.masterGain = ctx.createGain();
      this.masterGain.gain.value = this.muted ? 0 : this.volume;
      this.masterGain.connect(ctx.destination);
    } catch (err) {
      return this._markUnavailable(err?.message ?? String(err));
    }
    this._attachVisibility();
    return ctx;
  }

  /**
   * Unlock on a user gesture (call from Play button / first pointerdown).
   * Resolves true when audio can sound, false when silent (play continues).
   */
  async unlock() {
    const ctx = this.ensureContext();
    if (!ctx) return false;
    try {
      if (typeof ctx.resume === "function" && ctx.state === "suspended") await ctx.resume();
      this.unlocked = true;
      return true;
    } catch {
      return false; // silent is fine — never blocks play
    }
  }

  registerCue(name, buffer) {
    if (!name) throw new TypeError("cue name required");
    this.cues.set(name, buffer);
    return this;
  }

  unregisterCue(name) {
    this.cues.delete(name);
    return this;
  }

  /**
   * Play a registered cue. Never throws for missing/unavailable audio:
   * returns { played:false, reason } so games can continue silently.
   */
  playCue(name, opts = {}) {
    if (this._disposed) return { played: false, reason: "disposed" };
    if (this.muted) return { played: false, reason: "muted" };
    const ctx = this.ensureContext();
    if (!ctx) return { played: false, reason: this.unavailableReason || "unavailable" };
    if (!this.unlocked) return { played: false, reason: "locked" };
    const buffer = this.cues.get(name);
    if (!buffer) return { played: false, reason: `unknown-cue:${name}` };
    try {
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      if (opts.rate && typeof src.playbackRate !== "undefined") src.playbackRate.value = opts.rate;
      const g = ctx.createGain();
      g.gain.value = typeof opts.volume === "number" ? Math.min(1, Math.max(0, opts.volume)) : 1;
      src.connect(g);
      g.connect(this.masterGain ?? ctx.destination);
      src.start();
      return { played: true, reason: "" };
    } catch (err) {
      return { played: false, reason: err?.message ?? String(err) };
    }
  }

  /** Looping ambience bed. start/stop are idempotent per name. */
  startAmbience(name, opts = {}) {
    if (this.ambienceNodes.has(name)) return { playing: true, duplicate: true };
    const ctx = this.ensureContext();
    if (!ctx) return { playing: false, reason: this.unavailableReason || "unavailable" };
    if (!this.unlocked) return { playing: false, reason: "locked" };
    const buffer = this.cues.get(name);
    if (!buffer) return { playing: false, reason: `unknown-cue:${name}` };
    try {
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      src.loop = true;
      const g = ctx.createGain();
      g.gain.value = typeof opts.volume === "number" ? Math.min(1, Math.max(0, opts.volume)) : 0.4;
      src.connect(g);
      g.connect(this.masterGain ?? ctx.destination);
      src.start();
      this.ambienceNodes.set(name, { source: src, gain: g });
      return { playing: true, duplicate: false };
    } catch (err) {
      return { playing: false, reason: err?.message ?? String(err) };
    }
  }

  stopAmbience(name) {
    const node = this.ambienceNodes.get(name);
    if (!node) return false;
    this.ambienceNodes.delete(name);
    try {
      node.source.stop();
    } catch {
      /* already stopped */
    }
    try {
      node.source.disconnect();
      node.gain.disconnect();
    } catch {
      /* ignore */
    }
    return true;
  }

  setMuted(muted) {
    this.muted = !!muted;
    this._applyGain();
    this._persist();
    return this.muted;
  }

  setVolume(v) {
    if (typeof v !== "number" || Number.isNaN(v)) throw new TypeError("volume must be a number");
    this.volume = Math.min(1, Math.max(0, v));
    this._applyGain();
    this._persist();
    return this.volume;
  }

  dispose() {
    if (this._disposed) return;
    for (const name of [...this.ambienceNodes.keys()]) this.stopAmbience(name);
    this._detachVisibility();
    this.cues.clear();
    if (this.context) {
      try {
        if (typeof this.context.close === "function") this.context.close();
      } catch {
        /* ignore */
      }
    }
    this.context = null;
    this._disposed = true;
  }

  _applyGain() {
    if (this.masterGain && this.context) {
      try {
        this.masterGain.gain.value = this.muted ? 0 : this.volume;
      } catch {
        /* ignore */
      }
    }
  }

  _persist() {
    if (!this.savePersisted) return;
    try {
      this.savePersisted({ muted: this.muted, volume: this.volume });
    } catch {
      /* persistence failure must not break audio */
    }
  }

  _markUnavailable(reason) {
    this.available = false;
    this.unavailableReason = reason || "unavailable";
    this.context = null;
    return null;
  }

  async _suspendForBackground() {
    if (!this.context || this.available === false) return;
    try {
      if (typeof this.context.suspend === "function" && this.context.state === "running") {
        await this.context.suspend();
      }
    } catch {
      /* ignore */
    }
  }

  async _resumeForForeground() {
    if (!this.context || this.available === false || this._disposed) return;
    if (!this.unlocked) return;
    try {
      if (typeof this.context.resume === "function" && this.context.state === "suspended") {
        await this.context.resume();
      }
    } catch {
      /* silent stays silent */
    }
  }

  _attachVisibility() {
    const t = this.visibilityTarget;
    if (!t || this._visibilityAttached || typeof t.addEventListener !== "function") return;
    t.addEventListener("visibilitychange", this._visibilityHandler());
    this._visibilityAttached = true;
  }

  _visibilityHandler() {
    if (!this._visFn) {
      const target = this.visibilityTarget;
      this._visFn = () => {
        let hidden = false;
        if (target && typeof target.hidden === "boolean") hidden = target.hidden;
        else if (typeof document !== "undefined") hidden = !!document.hidden;
        if (hidden) this._suspendForBackground();
        else this._resumeForForeground();
      };
    }
    return this._visFn;
  }

  _detachVisibility() {
    const t = this.visibilityTarget;
    if (!t || !this._visibilityAttached || typeof t.removeEventListener !== "function") return;
    try {
      t.removeEventListener("visibilitychange", this._visibilityHandler());
    } catch {
      /* ignore */
    }
    this._visibilityAttached = false;
  }
}

function defaultCreateContext() {
  const g = globalThis;
  const AC = g.AudioContext ?? g.webkitAudioContext;
  if (typeof AC !== "function") return null;
  return new AC();
}
