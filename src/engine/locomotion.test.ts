import test from 'node:test';
import assert from 'node:assert/strict';
import { computeAnalogStickVector, computeArrowPadState, sampleWalkGait } from './locomotion';

test('6-function Virtual Analog Stick resolves Left, Right, Down, Up Jump, Up-Right Jump, and Up-Left Jump', () => {
  const neutral = computeAnalogStickVector(4, 3, 52, 0.16);
  assert.equal(neutral.active, false);
  assert.equal(neutral.x, 0);
  assert.equal(neutral.direction, 'neutral');
  assert.equal(neutral.zone, 'neutral');
  assert.equal(neutral.jump, false);

  const right = computeAnalogStickVector(60, 0, 52, 0.16);
  assert.equal(right.active, true);
  assert.equal(right.direction, 'right');
  assert.equal(right.zone, 'right');
  assert.equal(right.x, 1);
  assert.equal(Math.round(right.knobX), 52);
  assert.equal(right.jump, false);
  assert.equal(right.dropDown, false);

  const leftHalf = computeAnalogStickVector(-30, 2, 52, 0.16);
  assert.equal(leftHalf.active, true);
  assert.equal(leftHalf.direction, 'left');
  assert.equal(leftHalf.zone, 'left');
  assert.equal(leftHalf.jump, false);
  assert.ok(leftHalf.x < -0.3 && leftHalf.x > -0.8, `Expected partial analog left speed, got ${leftHalf.x}`);

  const down = computeAnalogStickVector(3, 46, 52, 0.16);
  assert.equal(down.active, true);
  assert.equal(down.zone, 'down');
  assert.equal(down.dropDown, true);
  assert.equal(down.jump, false);
  assert.equal(down.direction, 'neutral');

  // Symmetric Straight Up -> Pure vertical jump (x = 0)
  const jumpUp = computeAnalogStickVector(3, -48, 52, 0.16);
  assert.equal(jumpUp.zone, 'jump_up');
  assert.equal(jumpUp.jump, true);
  assert.equal(jumpUp.x, 0);
  assert.equal(jumpUp.direction, 'neutral');

  // Up-Right Diagonal -> Forward jump right with strong forward speed
  const jumpRight = computeAnalogStickVector(34, -36, 52, 0.16);
  assert.equal(jumpRight.zone, 'jump_right');
  assert.equal(jumpRight.jump, true);
  assert.equal(jumpRight.direction, 'right');
  assert.ok(jumpRight.x >= 0.78, `Expected strong forward jump right speed, got ${jumpRight.x}`);

  // Up-Left Diagonal -> Forward jump left with strong left speed
  const jumpLeft = computeAnalogStickVector(-34, -36, 52, 0.16);
  assert.equal(jumpLeft.zone, 'jump_left');
  assert.equal(jumpLeft.jump, true);
  assert.equal(jumpLeft.direction, 'left');
  assert.ok(jumpLeft.x <= -0.78, `Expected strong forward jump left speed, got ${jumpLeft.x}`);
});

test('4-way Arrow D-Pad resolves Left, Right, Up (Jump), Down (Drop), and Up-Left/Up-Right diagonals cleanly', () => {
  const r = 64;
  assert.equal(computeArrowPadState(2, -2, r).active, false);

  const right = computeArrowPadState(48, -4, r);
  assert.equal(right.right, true);
  assert.equal(right.up, false);
  assert.equal(right.down, false);
  assert.equal(right.direction, 'right');

  const left = computeArrowPadState(-48, 4, r);
  assert.equal(left.left, true);
  assert.equal(left.up, false);
  assert.equal(left.direction, 'left');

  const up = computeArrowPadState(0, -48, r);
  assert.equal(up.up, true);
  assert.equal(up.left, false);
  assert.equal(up.right, false);
  assert.equal(up.direction, 'up');

  const upRight = computeArrowPadState(38, -38, r);
  assert.equal(upRight.up, true);
  assert.equal(upRight.right, true);
  assert.equal(upRight.direction, 'up-right');

  const down = computeArrowPadState(4, 48, r);
  assert.equal(down.down, true);
  assert.equal(down.up, false);
  assert.equal(down.direction, 'down');
});

test('Walk gait lifts foot ONLY during forward swing phase and plants foot during backward push-off (no moonwalk)', () => {
  const hipY = -11;

  // Phase = 0: sin(0)=0, cos(0)=+1 -> moving FORWARD in local +X -> MUST be lifted off the ground (footY < -1)
  const forwardSwing = sampleWalkGait(0, 165, true, hipY, 165);
  assert.equal(forwardSwing.isSkidding, false);
  assert.ok(
    forwardSwing.frontLeg.footY < -3.5,
    `Front foot must lift during forward swing, got footY=${forwardSwing.frontLeg.footY}`
  );
  // Back leg is at phase=PI: cos(PI)=-1 -> moving BACKWARD in stance -> MUST be planted on ground (footY === -1)
  assert.equal(forwardSwing.backLeg.footY, -1);

  // Phase = PI: front leg moving backward on ground, back leg swinging forward in air
  const pushOff = sampleWalkGait(Math.PI, 165, true, hipY, 165);
  assert.equal(pushOff.frontLeg.footY, -1);
  assert.ok(pushOff.backLeg.footY < -3.5);
});

test('Walk gait knee always bends forward in facing direction for both right and left movement', () => {
  const hipY = -11;
  for (let i = 0; i < 12; i++) {
    const phase = (i / 12) * Math.PI * 2;
    const rightGait = sampleWalkGait(phase, 150, true, hipY, 165);
    const leftGait = sampleWalkGait(phase, -150, false, hipY, 165);

    // Local +X is always forward (mirrored by ctx.scale(-1, 1) when facingRight = false)
    const fMidRight = (1 + rightGait.frontLeg.footX) * 0.5;
    assert.ok(
      rightGait.frontLeg.kneeX >= fMidRight - 0.1,
      `Right-run knee must bend forward (+X): kneeX=${rightGait.frontLeg.kneeX}, mid=${fMidRight}`
    );

    // Left run with vx = -150 and facingRight = false produces identical local forward stride
    assert.equal(leftGait.isSkidding, false);
    assert.equal(Math.round(leftGait.frontLeg.footX * 100), Math.round(rightGait.frontLeg.footX * 100));
    assert.equal(Math.round(leftGait.frontLeg.kneeX * 100), Math.round(rightGait.frontLeg.kneeX * 100));
  }
});

test('Walk gait triggers crisp turn-skid brace when velocity opposes new analog facing direction', () => {
  // Moving right at +120, player abruptly snaps analog stick LEFT (facingRight = false)
  const skid = sampleWalkGait(1.2, 120, false, -11, 165);
  assert.equal(skid.isSkidding, true);
  assert.ok(skid.frontLeg.footX > 3, 'Lead foot should brace forward in new facing direction');
  assert.equal(skid.frontLeg.footY, -1);
  assert.equal(skid.backLeg.footY, -1);
});
