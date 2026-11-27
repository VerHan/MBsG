// ============================================================
// RIFTBOUND: SLAYER CORPS — InputManager
// Keyboard + Mouse + Multi-Touch Virtual Gamepad handler.
// ============================================================

export type InputAction =
  | 'move_left'
  | 'move_right'
  | 'jump'
  | 'dash'
  | 'drop_down'    // S on thin platform / pogo-slash
  | 'melee'
  | 'ranged'
  | 'interact'
  | 'heal'
  | 'use_ammo'
  | 'inventory'
  | 'pause'
  | 'adrenaline';

interface KeyBinding {
  action: InputAction;
  keys: string[];
  mouse?: number;
}

const DEFAULT_BINDINGS: KeyBinding[] = [
  { action: 'move_left',  keys: ['KeyA', 'ArrowLeft'] },
  { action: 'move_right', keys: ['KeyD', 'ArrowRight'] },
  { action: 'jump',       keys: ['Space', 'KeyW', 'ArrowUp'] },
  { action: 'drop_down',  keys: ['KeyS', 'ArrowDown'] },
  { action: 'dash',       keys: ['ShiftLeft', 'ShiftRight'] },
  { action: 'melee',      keys: ['KeyJ'], mouse: 0 },
  { action: 'ranged',     keys: ['KeyK'], mouse: 2 },
  { action: 'interact',   keys: ['KeyE'] },
  { action: 'heal',       keys: ['KeyQ'] },
  { action: 'use_ammo',   keys: ['KeyR'] },
  { action: 'inventory',  keys: ['KeyI', 'Tab'] },
  { action: 'pause',      keys: ['Escape', 'KeyP'] },
  { action: 'adrenaline', keys: ['KeyF'] },
];

export class InputManager {
  private _held = new Map<InputAction, boolean>();
  private _justPressed = new Map<InputAction, boolean>();
  private _justReleased = new Map<InputAction, boolean>();

  private _keysDown = new Set<string>();
  private _mouseDown = new Set<number>();
  private _virtualDown = new Set<InputAction>();

  private _bindings: KeyBinding[];
  private _enabled = true;

  public mouseX = 0;
  public mouseY = 0;

  constructor(canvas: HTMLCanvasElement, bindings = DEFAULT_BINDINGS) {
    this._bindings = bindings;

    for (const b of bindings) {
      this._held.set(b.action, false);
      this._justPressed.set(b.action, false);
      this._justReleased.set(b.action, false);
    }

    window.addEventListener('keydown', (e) => {
      if (!this._enabled) return;
      if (['Space', 'Tab', 'ArrowUp', 'ArrowDown'].includes(e.code)) {
        e.preventDefault();
      }
      this._keysDown.add(e.code);
    });

    window.addEventListener('keyup', (e) => {
      this._keysDown.delete(e.code);
    });

    canvas.addEventListener('mousedown', (e) => {
      if (!this._enabled) return;
      e.preventDefault();
      this._mouseDown.add(e.button);
    });

    canvas.addEventListener('mouseup', (e) => {
      this._mouseDown.delete(e.button);
    });

    canvas.addEventListener('mousemove', (e) => {
      const rect = canvas.getBoundingClientRect();
      this.mouseX = e.clientX - rect.left;
      this.mouseY = e.clientY - rect.top;
    });

    canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    window.addEventListener('blur', () => {
      this._keysDown.clear();
      this._mouseDown.clear();
      this._virtualDown.clear();
    });
  }

  /** Set virtual button state from mobile TouchControls */
  setVirtualAction(action: InputAction, down: boolean) {
    if (!this._enabled && down) return;
    if (down) this._virtualDown.add(action);
    else this._virtualDown.delete(action);
  }

  update() {
    for (const binding of this._bindings) {
      const wasHeld = this._held.get(binding.action) ?? false;
      let isHeld = this._virtualDown.has(binding.action);

      if (!isHeld) {
        for (const key of binding.keys) {
          if (this._keysDown.has(key)) {
            isHeld = true;
            break;
          }
        }
      }

      if (!isHeld && binding.mouse !== undefined) {
        if (this._mouseDown.has(binding.mouse)) {
          isHeld = true;
        }
      }

      this._held.set(binding.action, isHeld);
      this._justPressed.set(binding.action, isHeld && !wasHeld);
      this._justReleased.set(binding.action, !isHeld && wasHeld);
    }
  }

  isHeld(action: InputAction): boolean {
    return this._held.get(action) ?? false;
  }

  isJustPressed(action: InputAction): boolean {
    return this._justPressed.get(action) ?? false;
  }

  isJustReleased(action: InputAction): boolean {
    return this._justReleased.get(action) ?? false;
  }

  setEnabled(enabled: boolean) {
    this._enabled = enabled;
    if (!enabled) {
      this._keysDown.clear();
      this._mouseDown.clear();
      this._virtualDown.clear();
    }
  }
}
