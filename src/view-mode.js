/* Music Monster view-mode state machine: Mode2D <-> Mode25D <-> Mode3D.
   Renderer-agnostic and dependency-free. It owns *which* view is active, the
   cross-fade weight used while the 3D (WebGL) layer fades in or out, and
   persistence of the player's choice. It never touches the 2D/2.5D camera or the
   character generator; the host reacts through the onChange callback.
   Classic script: window.MMSViewMode. CommonJS: require('./view-mode.js'). */
(function (scope, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else scope.MMSViewMode = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const Mode2D = '2d', Mode25D = '2.5d', Mode3D = '3d';
  const MODES = Object.freeze([Mode2D, Mode25D, Mode3D]);
  const LABELS = Object.freeze({ '2d': '2D', '2.5d': '2.5D', '3d': '3D' });
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const isMode = m => MODES.includes(m);

  class ViewModeMachine {
    // available(mode) lets the host veto a state (e.g. 3D without WebGL).
    // onChange(next, prev, { initial }) runs after the state has changed.
    constructor({ initial = Mode2D, available = () => true, onChange = () => {},
      reducedMotion = false, fadeSeconds = 0.7 } = {}) {
      this.available = available; this.onChange = onChange;
      this.reducedMotion = !!reducedMotion; this.fadeSeconds = Math.max(0.01, fadeSeconds);
      this.mode = isMode(initial) && available(initial) ? initial : Mode2D;
      this.previous = null;
      // 0 = canvas pipelines only, 1 = WebGL layer only; in between = cross-fade.
      this.blend3d = this.mode === Mode3D ? 1 : 0;
    }
    get label() { return LABELS[this.mode]; }
    get transitioning() { return this.blend3d > 0 && this.blend3d < 1; }
    // True while the WebGL layer has to be drawn (steady 3D, or fading in/out).
    get layer3dVisible() { return this.blend3d > 0; }
    can(mode) { return isMode(mode) && this.available(mode); }
    next(step = 1) {
      for (let i = 1; i <= MODES.length; i++) {
        const candidate = MODES[(MODES.indexOf(this.mode) + step * i + MODES.length * i) % MODES.length];
        if (candidate !== this.mode && this.available(candidate)) return candidate;
      }
      return this.mode;
    }
    // Returns true if the state changed.
    request(mode) {
      if (!this.can(mode) || mode === this.mode) return false;
      const prev = this.mode; this.previous = prev; this.mode = mode;
      if (this.reducedMotion) this.blend3d = mode === Mode3D ? 1 : 0;
      this.onChange(mode, prev, { initial: false });
      return true;
    }
    cycle(step = 1) { return this.request(this.next(step)); }
    // Silent correction (e.g. WebGL failed after 3D was requested). No onChange.
    force(mode) {
      if (!isMode(mode)) return;
      this.mode = mode; this.blend3d = mode === Mode3D ? this.blend3d : 0;
    }
    // Apply the starting state through the same code path as a transition.
    start() { this.onChange(this.mode, null, { initial: true }); }
    update(dt) {
      const target = this.mode === Mode3D ? 1 : 0;
      if (this.blend3d === target) return this.blend3d;
      const step = Math.max(0, dt) / this.fadeSeconds;
      this.blend3d = target > this.blend3d ? Math.min(1, this.blend3d + step) : Math.max(0, this.blend3d - step);
      return this.blend3d;
    }
  }

  function create(options) { return new ViewModeMachine(options); }
  // Settings persistence (host passes localStorage; export/import already allow this key).
  function load(storage, key) {
    try { const v = JSON.parse(storage.getItem(key) || 'null'); return isMode(v?.mode) ? v.mode : Mode2D; }
    catch { return Mode2D; }
  }
  function save(storage, key, mode) {
    try { storage.setItem(key, JSON.stringify({ mode })); return true; } catch { return false; }
  }
  return { Mode2D, Mode25D, Mode3D, MODES, LABELS, ViewModeMachine, create, load, save, clamp };
});
