// controls.js — keyboard and mouse input for Neon Bay v3: WASD to move and
// drive, mouse look with pointer lock, click to shoot, E to interact, F to
// punch, Shift for NOS / sprint, Space to brake, Q for the radio, 1-4 to
// switch weapons, M to restart the job, P or Escape to pause.
export function createControls() {
  return {
    forward: false, back: false, left: false, right: false,
    sprint: false, brake: false, nos: false,
    mouseDX: 0, mouseDY: 0,
    mouseDown: false,
  };
}

export function bindControls(input, canvas, handlers) {
  const keys = {};
  window.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    keys[e.code] = true;
    sync();
    if (e.code === 'KeyE') handlers.onInteract();
    if (e.code === 'KeyF') handlers.onPunch();
    if (e.code === 'KeyQ') handlers.onRadio();
    if (e.code === 'KeyM') handlers.onRestartJob();
    if (e.code === 'KeyP' || e.code === 'Escape') handlers.onPause();
    if (e.code === 'Digit1') handlers.onWeapon(0);
    if (e.code === 'Digit2') handlers.onWeapon(1);
    if (e.code === 'Digit3') handlers.onWeapon(2);
    if (e.code === 'Digit4') handlers.onWeapon(3);
    if (e.code === 'KeyN') handlers.onMute();
    if (e.code === 'Enter' || e.code === 'Space') handlers.onDialogAdvance();
    if (['Space', 'ArrowUp', 'ArrowDown'].includes(e.code)) e.preventDefault();
  });
  window.addEventListener('keyup', (e) => {
    keys[e.code] = false;
    sync();
  });
  function sync() {
    input.forward = !!(keys.KeyW || keys.ArrowUp);
    input.back = !!(keys.KeyS || keys.ArrowDown);
    input.left = !!(keys.KeyA || keys.ArrowLeft);
    input.right = !!(keys.KeyD || keys.ArrowRight);
    input.sprint = !!keys.ShiftLeft || !!keys.ShiftRight;
    input.nos = input.sprint;
    input.brake = !!keys.Space;
  }
  canvas.addEventListener('click', () => handlers.onLockRequest());
  document.addEventListener('mousemove', (e) => {
    if (document.pointerLockElement === canvas) {
      input.mouseDX += e.movementX;
      input.mouseDY += e.movementY;
    }
  });
  canvas.addEventListener('mousedown', (e) => {
    if (e.button === 0) {
      input.mouseDown = true;
      handlers.onShoot();
    }
  });
  window.addEventListener('mouseup', () => { input.mouseDown = false; });
  window.addEventListener('blur', () => {
    for (const k of Object.keys(keys)) keys[k] = false;
    sync();
  });
}

export function consumeMouse(input) {
  const dx = input.mouseDX;
  const dy = input.mouseDY;
  input.mouseDX = 0;
  input.mouseDY = 0;
  return { dx, dy };
}
