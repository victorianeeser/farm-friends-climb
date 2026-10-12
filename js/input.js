// Touch/mouse: left or right half of the screen. Keyboard (desktop testing): arrows / A-D, Space/Enter, P / Esc.

export class Input {
  constructor() {
    this.pointers = new Map(); // pointerId -> { dir, order }
    this.order = 0;
    this.keys = { left: false, right: false };
    this.impulses = [];
    this.onPress = null;   // any tap/click on the play area
    this.onConfirm = null; // Space / Enter
    this.onPause = null;   // P / Escape

    const dirOf = (e) => (e.clientX < window.innerWidth / 2 ? -1 : 1);
    const onUi = (e) => e.target.closest && e.target.closest('button');

    window.addEventListener('pointerdown', (e) => {
      if (onUi(e)) return;
      const dir = dirOf(e);
      this.pointers.set(e.pointerId, { dir, order: ++this.order });
      this.impulses.push(dir);
      if (this.onPress) this.onPress();
    });
    window.addEventListener('pointermove', (e) => {
      const ptr = this.pointers.get(e.pointerId);
      if (ptr) ptr.dir = dirOf(e); // sliding a finger across the middle switches sides
    });
    const release = (e) => this.pointers.delete(e.pointerId);
    window.addEventListener('pointerup', release);
    window.addEventListener('pointercancel', release);
    window.addEventListener('blur', () => this.clear());

    // Stop iOS double-tap zoom, text selection callouts and rubber-band scrolling.
    document.addEventListener('touchstart', (e) => { if (!onUi(e)) e.preventDefault(); }, { passive: false });
    document.addEventListener('gesturestart', (e) => e.preventDefault());
    document.addEventListener('contextmenu', (e) => e.preventDefault());

    window.addEventListener('keydown', (e) => {
      const k = e.key.toLowerCase();
      if (k === 'arrowleft' || k === 'a') {
        if (!e.repeat) this.impulses.push(-1);
        this.keys.left = true;
      } else if (k === 'arrowright' || k === 'd') {
        if (!e.repeat) this.impulses.push(1);
        this.keys.right = true;
      } else if ((k === ' ' || k === 'enter') && !e.repeat) {
        if (this.onConfirm) this.onConfirm();
      } else if ((k === 'p' || k === 'escape') && !e.repeat && this.onPause) {
        this.onPause();
      } else {
        return;
      }
      e.preventDefault();
    });
    window.addEventListener('keyup', (e) => {
      const k = e.key.toLowerCase();
      if (k === 'arrowleft' || k === 'a') this.keys.left = false;
      if (k === 'arrowright' || k === 'd') this.keys.right = false;
    });
  }

  // -1, 0 or 1. The most recently pressed finger wins; otherwise the keyboard.
  get steer() {
    let latest = null;
    for (const ptr of this.pointers.values()) {
      if (!latest || ptr.order > latest.order) latest = ptr;
    }
    if (latest) return latest.dir;
    return (this.keys.right ? 1 : 0) - (this.keys.left ? 1 : 0);
  }

  takeImpulse() {
    return this.impulses.shift() || 0;
  }

  clear() {
    this.pointers.clear();
    this.keys.left = this.keys.right = false;
    this.impulses.length = 0;
  }
}
