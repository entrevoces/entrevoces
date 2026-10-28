// Viewport/camera: CSS-pixel layouts that reflow on portrait instead of
// shrinking a desktop canvas into unreadable targets. Pure math — no DOM —
// so tests drive it directly and games share one layout vocabulary.

/**
 * @param {object} opts
 * @param {number} opts.designWidth   world units visible in landscape width
 * @param {number} opts.designHeight  world units visible in landscape height
 * @param {number} [opts.portraitAspect=0.9] viewport w/h below this => portrait reflow
 * @param {number} [opts.portraitWorldHeight] visible world height in portrait
 *   reflow (defaults to designWidth * 1.35, showing more vertical space).
 * @param {number} [opts.minScale] minimum scale factor; layout reports when
 *   content would fall below it via `belowMinScale` instead of silently shrinking.
 */
export class Camera {
  constructor(opts = {}) {
    if (!(opts.designWidth > 0) || !(opts.designHeight > 0)) {
      throw new RangeError("Camera needs designWidth/designHeight > 0");
    }
    this.designWidth = opts.designWidth;
    this.designHeight = opts.designHeight;
    this.portraitAspect = opts.portraitAspect ?? 0.9;
    this.portraitWorldHeight = opts.portraitWorldHeight ?? opts.designWidth * 1.35;
    this.minScale = opts.minScale ?? 0;
    this.viewport = { w: opts.designWidth, h: opts.designHeight, dpr: 1 };
    this.layoutCache = null;
  }

  /**
   * Compute layout for a viewport given in CSS pixels.
   * Landscape: contain-fit the design box (letterbox). Portrait: reflow —
   * keep full design width visible and extend visible height, so targets
   * stay tappable instead of scaling down.
   */
  layout(viewportW, viewportH, dpr = 1) {
    if (!(viewportW > 0) || !(viewportH > 0)) throw new RangeError("viewport must be > 0");
    this.viewport = { w: viewportW, h: viewportH, dpr };
    const aspect = viewportW / viewportH;
    let mode, scale, visibleW, visibleH;
    if (aspect < this.portraitAspect) {
      mode = "portrait";
      visibleW = this.designWidth;
      visibleH = this.portraitWorldHeight;
      scale = viewportW / visibleW;
    } else {
      mode = "landscape";
      scale = Math.min(viewportW / this.designWidth, viewportH / this.designHeight);
      visibleW = viewportW / scale;
      visibleH = viewportH / scale;
    }
    const offsetX = (viewportW - visibleW * scale) / 2;
    const offsetY = (viewportH - visibleH * scale) / 2;
    const layout = {
      mode,
      scale,
      offsetX,
      offsetY,
      visibleW,
      visibleH,
      viewportW,
      viewportH,
      belowMinScale: this.minScale > 0 && scale < this.minScale,
    };
    this.layoutCache = layout;
    return layout;
  }

  /** CSS-pixel screen point -> world point. `rect` is the canvas bounding rect. */
  screenToWorld(sx, sy, layout = this.layoutCache, rect = null) {
    const l = layout ?? this._needLayout();
    const rx = rect ? rect.left : 0;
    const ry = rect ? rect.top : 0;
    return {
      x: ((sx - rx) - l.offsetX) / l.scale,
      y: ((sy - ry) - l.offsetY) / l.scale,
    };
  }

  /** World point -> CSS-pixel screen point (relative to the canvas rect origin). */
  worldToScreen(wx, wy, layout = this.layoutCache) {
    const l = layout ?? this._needLayout();
    return { x: wx * l.scale + l.offsetX, y: wy * l.scale + l.offsetY };
  }

  /** Resize a canvas backing store for a layout (device pixels, DPR-aware). */
  canvasSize(layout = this.layoutCache, dpr = this.viewport.dpr) {
    const l = layout ?? this._needLayout();
    return {
      width: Math.max(1, Math.round(l.viewportW * dpr)),
      height: Math.max(1, Math.round(l.viewportH * dpr)),
    };
  }

  _needLayout() {
    if (!this.layoutCache) throw new Error("Camera.layout() must run before transforms");
    return this.layoutCache;
  }
}
