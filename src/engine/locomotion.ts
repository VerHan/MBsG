// ============================================================
// RIFTBOUND: SLAYER CORPS — Locomotion & Virtual Analog Math
// Pure, deterministic bipedal run-cycle kinematics (anti-moonwalk
// forward stride + 2-bone knee IK + turn-skid brace) and smooth
// circular mobile virtual analog joystick vector solver.
// ============================================================

export interface AnalogStickSample {
  /** Normalized horizontal axis [-1..1] after deadzone rescaling */
  x: number;
  /** Normalized vertical axis [-1..1] after deadzone rescaling */
  y: number;
  /** Visual thumb knob X offset in CSS pixels, clamped within maxRadius */
  knobX: number;
  /** Visual thumb knob Y offset in CSS pixels, clamped within maxRadius */
  knobY: number;
  /** Normalized magnitude [0..1] after deadzone */
  magnitude: number;
  /** Discrete horizontal facing intent */
  direction: 'left' | 'right' | 'neutral';
  /** True when pulling stick cleanly downward to drop through thin platforms */
  dropDown: boolean;
  /** True when stick is outside deadzone */
  active: boolean;
}

/**
 * Compute normalized analog stick output and clamped visual knob coordinates
 * from pointer displacement (dx, dy) relative to stick center.
 */
export function computeAnalogStickVector(
  dx: number,
  dy: number,
  maxRadius: number,
  deadzone = 0.16
): AnalogStickSample {
  const safeRadius = Math.max(1, maxRadius);
  const rawDist = Math.hypot(dx, dy);

  if (rawDist === 0) {
    return {
      x: 0,
      y: 0,
      knobX: 0,
      knobY: 0,
      magnitude: 0,
      direction: 'neutral',
      dropDown: false,
      active: false,
    };
  }

  const clampedDist = Math.min(rawDist, safeRadius);
  const nx = dx / rawDist;
  const ny = dy / rawDist;
  const knobX = nx * clampedDist;
  const knobY = ny * clampedDist;

  const rawNorm = clampedDist / safeRadius;
  if (rawNorm <= deadzone) {
    return {
      x: 0,
      y: 0,
      knobX,
      knobY,
      magnitude: 0,
      direction: 'neutral',
      dropDown: false,
      active: false,
    };
  }

  const scaledMag = Math.min(1, (rawNorm - deadzone) / Math.max(0.01, 1 - deadzone));
  const x = Math.max(-1, Math.min(1, nx * scaledMag));
  const y = Math.max(-1, Math.min(1, ny * scaledMag));

  const horizThreshold = 0.14;
  const direction: 'left' | 'right' | 'neutral' =
    x > horizThreshold ? 'right' : x < -horizThreshold ? 'left' : 'neutral';

  const dropDown = y > 0.62 && Math.abs(y) > Math.abs(x) * 0.85;

  return {
    x: direction === 'neutral' ? 0 : x,
    y,
    knobX,
    knobY,
    magnitude: scaledMag,
    direction,
    dropDown,
    active: true,
  };
}

export interface ArrowPadSample {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  /** Primary horizontal movement axis (-1, 0, +1) */
  x: number;
  /** Primary visual readout direction */
  direction: 'left' | 'right' | 'up' | 'down' | 'up-left' | 'up-right' | 'neutral';
  active: boolean;
}

/**
 * Compute crisp 4-way Arrow D-Pad state from thumb offset (dx, dy) relative to pad center.
 * Supports direct key taps (◄ ► ▲ ▼), seamless thumb slide across arrows, and
 * natural run+jump diagonals (↖ Up-Left / ↗ Up-Right) while preventing accidental
 * jumps or platform drops when running purely left or right.
 */
export function computeArrowPadState(
  dx: number,
  dy: number,
  radius: number
): ArrowPadSample {
  const safeR = Math.max(1, radius);
  const dist = Math.hypot(dx, dy);
  if (dist < safeR * 0.16) {
    return {
      left: false,
      right: false,
      up: false,
      down: false,
      x: 0,
      direction: 'neutral',
      active: false,
    };
  }

  const nx = dx / safeR;
  const ny = dy / safeR;
  const absX = Math.abs(nx);
  const absY = Math.abs(ny);

  // Horizontal activates cleanly on left/right arms and diagonals
  const left = nx <= -0.22 && absX >= absY * 0.35;
  const right = nx >= 0.22 && absX >= absY * 0.35;

  // Up (Jump) activates on top arm and crisp upper diagonals (not pure horizontal)
  const up = ny <= -0.28 && absY >= absX * 0.52;

  // Down (Drop through thin platform) requires clear downward intent
  const down = !up && ny >= 0.34 && absY >= absX * 0.72;

  let direction: ArrowPadSample['direction'] = 'neutral';
  if (up && left) direction = 'up-left';
  else if (up && right) direction = 'up-right';
  else if (up) direction = 'up';
  else if (down) direction = 'down';
  else if (left) direction = 'left';
  else if (right) direction = 'right';

  return {
    left,
    right,
    up,
    down,
    x: left ? -1 : right ? 1 : 0,
    direction,
    active: left || right || up || down,
  };
}

export interface LegJointPose {
  kneeX: number;
  kneeY: number;
  footX: number;
  footY: number;
  /** Boot toe pitch in radians (positive = toe down push-off, negative = heel-strike) */
  footPitch: number;
}

export interface WalkGaitSample {
  frontLeg: LegJointPose;
  backLeg: LegJointPose;
  /** Counter-swinging off-hand arm angle in radians */
  offArmAngle: number;
  /** Dynamic stride vertical bounce */
  runBob: number;
  /** Forward torso lean in radians */
  bodyTilt: number;
  /** True when braking/reversing against momentum */
  isSkidding: boolean;
}

/**
 * Solve 2-bone leg IK in local facing space (+X = forward, +Y = down)
 * with anatomically forward-bending knee (+X bend).
 */
function solveForwardKneeIK(
  hipX: number,
  hipY: number,
  footX: number,
  footY: number,
  thighLen: number,
  shinLen: number
): { kneeX: number; kneeY: number } {
  const dx = footX - hipX;
  const dy = footY - hipY;
  const maxReach = thighLen + shinLen - 0.15;
  const minReach = Math.abs(thighLen - shinLen) + 0.25;
  const rawDist = Math.hypot(dx, dy);
  const dist = Math.max(minReach, Math.min(maxReach, rawDist || 0.001));

  const baseAngle = Math.atan2(dy, dx);
  const cosBend =
    (thighLen * thighLen + dist * dist - shinLen * shinLen) / (2 * thighLen * dist);
  const clampedCos = Math.max(-1, Math.min(1, cosBend));
  // Subtract bend angle in screen coords (+X right, +Y down) so knee ALWAYS bends FORWARD (+X)!
  const kneeAngle = baseAngle - Math.acos(clampedCos);

  return {
    kneeX: hipX + Math.cos(kneeAngle) * thighLen,
    kneeY: hipY + Math.sin(kneeAngle) * thighLen,
  };
}

function sampleSingleLeg(
  phase: number,
  hipX: number,
  hipY: number,
  speedRatio: number
): LegJointPose {
  // Forward running biomechanics in local facing space (+X = direction of travel):
  // footX = sin(phase) * amp
  // d(footX)/d(phase) = +cos(phase) * amp:
  //   - cos(phase) > 0 => SWING PHASE (foot moves FORWARD from -amp -> +amp, LIFTED OFF GROUND!)
  //   - cos(phase) <= 0 => STANCE PHASE (foot moves BACKWARD from +amp -> -amp, PLANTED ON GROUND!)
  const s = Math.sin(phase);
  const c = Math.cos(phase);

  const strideAmp = 2.2 + 4.4 * speedRatio;
  const liftAmp = 1.6 + 2.8 * speedRatio;

  const isSwing = c > 0;
  // Smooth arch lift strictly during forward swing phase (c > 0)
  const lift = isSwing ? Math.pow(c, 0.85) * liftAmp : 0;

  // Slight forward bias on reach so front foot clearly leads in the direction of movement
  const footX = s * strideAmp + 0.6 * speedRatio;
  const footY = -1 - lift;

  const { kneeX, kneeY } = solveForwardKneeIK(hipX, hipY, footX, footY, 5.8, 5.6);

  // Toe-off tilts boot slightly down when pushing back; heel-strike tilts slightly up when reaching forward
  const footPitch = isSwing ? -0.18 * c * speedRatio : Math.max(0, -s) * 0.24 * speedRatio;

  return {
    kneeX,
    kneeY,
    footX,
    footY,
    footPitch,
  };
}

/**
 * Sample realistic forward-aligned bipedal running kinematics in character local space
 * (+X = facing direction, which mirrors to screen-left automatically when facingRight = false).
 */
export function sampleWalkGait(
  walkPhase: number,
  vx: number,
  facingRight: boolean,
  hipY: number,
  maxSpeed = 165
): WalkGaitSample {
  const facingDir = facingRight ? 1 : -1;
  const signedRatio = Math.max(-1, Math.min(1, (vx * facingDir) / Math.max(1, maxSpeed)));
  const speedRatio = Math.min(1, Math.abs(vx) / Math.max(1, maxSpeed));

  // If player abruptly reversed analog stick against existing momentum, show crisp turn-skid brace
  if (signedRatio < -0.18 && speedRatio > 0.22) {
    const fFootX = 5.2;
    const fFootY = -1;
    const bFootX = -4.5;
    const bFootY = -1;
    const fKnee = solveForwardKneeIK(1, hipY, fFootX, fFootY, 5.8, 5.6);
    const bKnee = solveForwardKneeIK(-1, hipY, bFootX, bFootY, 5.8, 5.6);
    return {
      frontLeg: { ...fKnee, footX: fFootX, footY: fFootY, footPitch: -0.22 },
      backLeg: { ...bKnee, footX: bFootX, footY: bFootY, footPitch: 0.16 },
      offArmAngle: -0.45,
      runBob: 1.4,
      bodyTilt: -0.12,
      isSkidding: true,
    };
  }

  const frontLeg = sampleSingleLeg(walkPhase, 1, hipY, speedRatio);
  const backLeg = sampleSingleLeg(walkPhase + Math.PI, -1, hipY, speedRatio);

  // Double-frequency vertical bob (lowest at mid-stance, highest at flight/push-off)
  const runBob = Math.abs(Math.sin(walkPhase)) * 1.65 * speedRatio;
  const bodyTilt = (0.1 + 0.12 * speedRatio) * (speedRatio > 0.05 ? 1 : 0);
  // Counter-swing off-hand arm opposite to the front leg
  const offArmAngle = -Math.sin(walkPhase) * 0.85 * speedRatio;

  return {
    frontLeg,
    backLeg,
    offArmAngle,
    runBob,
    bodyTilt,
    isSkidding: false,
  };
}
