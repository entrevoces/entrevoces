// Pointer + keyboard input with real viewport-to-world transforms.
// Event targets are injected (tests pass fakes; games pass canvas/window).
// preventDefault is used ONLY for controls the game owns — bound keys and
// pointer gestures on the game surface — and NEVER inside text forms.

const FORM_TAGS = new Set(["INPUT", "TEXTAREA", "SELECT"]);

/** True when the event target is an editable form control we must not hijack. */
export function isFormElement(target) {
  if (!target || typeof target !== "object") return false;
  const tag = typeof target.tagName === "string" ? target.tagName.toUpperCase() : "";
  if (FORM_TAGS.has(tag)) return true;
  if (target.isContentEditable) return true;
  return false;
}

/**
 * @param {object} opts
 * @param {object} [opts.pointerTarget]  EventTarget-like for pointer events (game canvas)
 * @param {object} [opts.keyTarget]      EventTarget-like for key events (default: pointerTarget)
 * @param {object} [opts.blurTarget]     EventTarget-like watched for blur (default: keyTarget)
 * @param {()=>({left,top,width,height}|null)} [opts.getRect] canvas bounding rect
 * @param {(sx,sy,rect)=>({x,y})} [opts.toWorld] viewport->world transform
 *   (usually `(sx, sy, rect) => camera.screenToWorld(sx, sy, layout, rect)`)
 * @param {Record<string,(ev:{key,code,world,repeat})=>void>} [opts.bindings] owned key bindings
 * @param {boolean} [opts.ignoreKeyRepeat=true] drop auto-repeat keydowns
 * @param {(ev:{world,screen,durationMs,button})=>void} [opts.onTap] tap-select callback
 *   (accessible alternative to drag/precision gestures)
 * @param {number} [opts.tapSlopPx=12] max pointer travel that still counts as a tap
 * @param {number} [opts.tapMaxMs=400] max press duration that still counts as a tap
 * @param {(ev:{type,world,screen,pointerId,button})=>void} [opts.onPointer] raw pointer hook
 * @param {()=>number} [opts.clock] ms clock for tap timing (default Date.now)
 */
export class Input {
  constructor(opts = {}) {
    this.pointerTarget = opts.pointerTarget ?? null;
    this.keyTarget = opts.keyTarget ?? this.pointerTarget;
    this.blurTarget = opts.blurTarget ?? this.keyTarget;
    this.getRect = typeof opts.getRect === "function" ? opts.getRect : () => null;
    this.toWorld = typeof opts.toWorld === "function" ? opts.toWorld : ((sx, sy) => ({ x: sx, y: sy }));
    this.bindings = { ...(opts.bindings ?? {}) };
    this.ignoreKeyRepeat = opts.ignoreKeyRepeat ?? true;
    this.onTap = typeof opts.onTap === "function" ? opts.onTap : null;
    this.tapSlopPx = opts.tapSlopPx ?? 12;
    this.tapMaxMs = opts.tapMaxMs ?? 400;
    this.onPointer = typeof opts.onPointer === "function" ? opts.onPointer : null;
    this.clock = typeof opts.clock === "function" ? opts.clock : () => Date.now();

    this.keysDown = new Set();
    this.pointers = new Map(); // pointerId -> { startX, startY, x, y, startT, button }
    this.enabled = true;
    this._attached = false;
    this._disposed = false;

    this._onPointerDown = (ev) => this._pointerDown(ev);
    this._onPointerMove = (ev) => this._pointerMove(ev);
    this._onPointerUp = (ev) => this._pointerEnd(ev, "up");
    this._onPointerCancel = (ev) => this._pointerEnd(ev, "cancel");
    this._onKeyDown = (ev) => this._keyDown(ev);
    this._onKeyUp = (ev) => this._keyUp(ev);
    this._onBlur = () => this._releaseAll("blur");
  }

  bind(key, fn) {
    this.bindings[key] = fn;
    return this;
  }

  unbind(key) {
    delete this.bindings[key];
    return this;
  }

  setTapHandler(fn) {
    this.onTap = typeof fn === "function" ? fn : null;
    return this;
  }

  isDown(key) {
    return this.keysDown.has(key);
  }

  attach() {
    if (this._disposed) throw new Error("Input is disposed");
    if (this._attached) return this;
    const p = this.pointerTarget;
    if (p && typeof p.addEventListener === "function") {
      p.addEventListener("pointerdown", this._onPointerDown);
      p.addEventListener("pointermove", this._onPointerMove);
      p.addEventListener("pointerup", this._onPointerUp);
      p.addEventListener("pointercancel", this._onPointerCancel);
    }
    const k = this.keyTarget;
    if (k && typeof k.addEventListener === "function") {
      k.addEventListener("keydown", this._onKeyDown);
      k.addEventListener("keyup", this._onKeyUp);
    }
    const b = this.blurTarget;
    if (b && typeof b.addEventListener === "function" && b !== this.keyTarget) {
      b.addEventListener("blur", this._onBlur);
    } else if (k && typeof k.addEventListener === "function") {
      k.addEventListener("blur", this._onBlur);
    }
    this._attached = true;
    return this;
  }

  detach() {
    if (!this._attached) return this;
    const p = this.pointerTarget;
    if (p && typeof p.removeEventListener === "function") {
      for (const [type, fn] of [
        ["pointerdown", this._onPointerDown],
        ["pointermove", this._onPointerMove],
        ["pointerup", this._onPointerUp],
        ["pointercancel", this._onPointerCancel],
      ]) {
        try {
          p.removeEventListener(type, fn);
        } catch {
          /* ignore */
        }
      }
    }
    const k = this.keyTarget;
    if (k && typeof k.removeEventListener === "function") {
      for (const [type, fn] of [
        ["keydown", this._onKeyDown],
        ["keyup", this._onKeyUp],
        ["blur", this._onBlur],
      ]) {
        try {
          k.removeEventListener(type, fn);
        } catch {
          /* ignore */
        }
      }
    }
    const b = this.blurTarget;
    if (b && b !== this.keyTarget && typeof b.removeEventListener === "function") {
      try {
        b.removeEventListener("blur", this._onBlur);
      } catch {
        /* ignore */
      }
    }
    this._attached = false;
    return this;
  }

  /** detach() + drop all state. The instance must not be reused. */
  dispose() {
    if (this._disposed) return;
    this.detach();
    this._releaseAll("dispose");
    this._disposed = true;
  }

  _screenOf(ev) {
    return { x: ev.clientX ?? 0, y: ev.clientY ?? 0 };
  }

  _worldOf(ev) {
    const s = this._screenOf(ev);
    let rect = null;
    try {
      rect = this.getRect();
    } catch {
      rect = null;
    }
    try {
      return { world: this.toWorld(s.x, s.y, rect), screen: s };
    } catch {
      return { world: { x: s.x, y: s.y }, screen: s };
    }
  }

  _pointerDown(ev) {
    if (!this.enabled || this._disposed) return;
    if (isFormElement(ev.target)) return; // never hijack text forms
    const { world, screen } = this._worldOf(ev);
    const id = ev.pointerId ?? "mouse";
    this.pointers.set(id, {
      startX: screen.x,
      startY: screen.y,
      x: screen.x,
      y: screen.y,
      startT: this.clock(),
      button: ev.button ?? 0,
    });
    // Pointer capture keeps drags/cancels routed to the surface. Best-effort.
    try {
      ev.target?.setPointerCapture?.(ev.pointerId);
    } catch {
      /* capture unsupported — cancel events still handled */
    }
    if (typeof ev.preventDefault === "function" && this.pointerTarget) {
      try {
        ev.preventDefault();
      } catch {
        /* passive listener — gesture still tracked */
      }
    }
    if (this.onPointer) {
      try {
        this.onPointer({ type: "down", world, screen, pointerId: id, button: ev.button ?? 0 });
      } catch {
        /* host hook must not break input */
      }
    }
  }

  _pointerMove(ev) {
    if (!this.enabled || this._disposed) return;
    const id = ev.pointerId ?? "mouse";
    const tracked = this.pointers.get(id);
    if (!tracked) return;
    const { world, screen } = this._worldOf(ev);
    tracked.x = screen.x;
    tracked.y = screen.y;
    if (this.onPointer) {
      try {
        this.onPointer({ type: "move", world, screen, pointerId: id, button: ev.button ?? 0 });
      } catch {
        /* ignore */
      }
    }
  }

  _pointerEnd(ev, kind) {
    const id = ev.pointerId ?? "mouse";
    const tracked = this.pointers.get(id);
    try {
      if (typeof ev.target?.releasePointerCapture === "function" && ev.pointerId !== undefined) {
        ev.target.releasePointerCapture(ev.pointerId);
      }
    } catch {
      /* ignore */
    }
    this.pointers.delete(id);
    if (!this.enabled || this._disposed) return;
    if (!tracked) return; // untracked pointer: nothing to do (no tap synthesis)
    const { world, screen } = this._worldOf(ev);
    if (this.onPointer) {
      try {
        this.onPointer({ type: kind, world, screen, pointerId: id, button: ev.button ?? 0 });
      } catch {
        /* ignore */
      }
    }
    if (kind === "cancel") return; // cancelled gestures never count as taps
    if (!this.onTap) return;
    const dx = screen.x - tracked.startX;
    const dy = screen.y - tracked.startY;
    const dist = Math.hypot(dx, dy);
    const dt = this.clock() - tracked.startT;
    if (dist <= this.tapSlopPx && dt <= this.tapMaxMs) {
      try {
        this.onTap({ world, screen, durationMs: dt, button: tracked.button });
      } catch {
        /* host hook must not break input */
      }
    }
  }

  _keyDown(ev) {
    if (!this.enabled || this._disposed) return;
    if (isFormElement(ev.target)) return; // never hijack text forms
    const key = ev.key ?? ev.code;
    if (!key) return;
    if (ev.repeat && this.ignoreKeyRepeat) return;
    const owned = Object.prototype.hasOwnProperty.call(this.bindings, key);
    this.keysDown.add(key);
    if (owned) {
      if (typeof ev.preventDefault === "function") {
        try {
          ev.preventDefault();
        } catch {
          /* passive — binding still fires */
        }
      }
      try {
        this.bindings[key]({ key, code: ev.code, repeat: !!ev.repeat });
      } catch {
        /* host hook must not break input */
      }
    }
  }

  _keyUp(ev) {
    const key = ev.key ?? ev.code;
    if (key) this.keysDown.delete(key);
  }

  /** Clear held keys and tracked pointers (blur / surface loss recovery). */
  _releaseAll(_reason) {
    this.keysDown.clear();
    this.pointers.clear();
  }
}
