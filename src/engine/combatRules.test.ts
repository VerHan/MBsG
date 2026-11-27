import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyLoadoutEquipRule,
  computeWeaponBladeSegment,
  computeWeaponSweepHitbox,
  resolveCombatAction,
  resolveDisplayedWeapon,
  sampleRangedAimPose,
  sampleStickmanCombatPose,
  sampleWeaponBladeTrail,
  segmentIntersectsAABB,
  type CombatMoveType,
} from './combatRules.ts';

test('Ranged loadout (including Bow) automatically locks melee to short dagger', () => {
  const res = applyLoadoutEquipRule(
    {
      meleeWeapon: { defId: 'sword', tier: 'common', level: 1 },
      rangedWeapon: null,
      weaponInventory: [
        { defId: 'sword', tier: 'common', level: 1 },
        { defId: 'bow', tier: 'rare', level: 1 },
      ],
    },
    { defId: 'bow', tier: 'rare', level: 1 }
  );

  assert.equal(res.rangedWeapon?.defId, 'bow');
  assert.equal(res.meleeWeapon.defId, 'dagger');
  assert.ok(res.weaponInventory.some((w) => w.defId === 'dagger'));
});

test('Displayed weapon shows Ranged weapon by default and quick-draws Dagger only during melee hit', () => {
  const idleRanged = resolveDisplayedWeapon({
    meleeWeaponId: 'dagger',
    rangedWeaponId: 'pistol',
    isMeleeAttacking: false,
  });
  assert.equal(idleRanged.weaponId, 'pistol');
  assert.equal(idleRanged.mode, 'ranged_primary');
  assert.equal(idleRanged.showHolsteredDagger, true);
  assert.equal(idleRanged.showHolsteredRangedOnBack, false);

  const meleeQuickdraw = resolveDisplayedWeapon({
    meleeWeaponId: 'dagger',
    rangedWeaponId: 'bow',
    isMeleeAttacking: true,
  });
  assert.equal(meleeQuickdraw.weaponId, 'dagger');
  assert.equal(meleeQuickdraw.mode, 'melee_quickdraw');
  assert.equal(meleeQuickdraw.showHolsteredDagger, false);
  assert.equal(meleeQuickdraw.showHolsteredRangedOnBack, true);

  const pureMelee = resolveDisplayedWeapon({
    meleeWeaponId: 'katana',
    rangedWeaponId: null,
    isMeleeAttacking: false,
  });
  assert.equal(pureMelee.weaponId, 'katana');
  assert.equal(pureMelee.mode, 'melee_primary');
  assert.equal(pureMelee.showHolsteredDagger, false);
});

test('Equipping any non-dagger melee weapon unequips ranged weapon', () => {
  const res = applyLoadoutEquipRule(
    {
      meleeWeapon: { defId: 'dagger', tier: 'common', level: 1 },
      rangedWeapon: { defId: 'rifle', tier: 'epic', level: 2 },
      weaponInventory: [
        { defId: 'dagger', tier: 'common', level: 1 },
        { defId: 'rifle', tier: 'epic', level: 2 },
        { defId: 'katana', tier: 'rare', level: 1 },
      ],
    },
    { defId: 'katana', tier: 'rare', level: 1 }
  );

  assert.equal(res.meleeWeapon.defId, 'katana');
  assert.equal(res.rangedWeapon, null);
});

test('Conditional combat action resolver maps all 6 moves accurately', () => {
  assert.equal(
    resolveCombatAction({ onGround: true, isHold: false, isRightClick: false, hasGun: false, comboStep: 1 }),
    'standard_slash'
  );
  assert.equal(
    resolveCombatAction({ onGround: true, isHold: false, isRightClick: false, hasGun: false, comboStep: 2 }),
    'spin_horizontal'
  );
  assert.equal(
    resolveCombatAction({ onGround: true, isHold: false, isRightClick: false, hasGun: false, comboStep: 3 }),
    'mini_thrust'
  );
  assert.equal(
    resolveCombatAction({ onGround: false, isHold: false, isRightClick: false, hasGun: false, comboStep: 1 }),
    'spin_vertical'
  );
  assert.equal(
    resolveCombatAction({ onGround: false, isHold: true, isRightClick: false, hasGun: false, comboStep: 1 }),
    'air_slam_windup'
  );
  assert.equal(
    resolveCombatAction({ onGround: true, isHold: false, isRightClick: true, hasGun: false, comboStep: 1 }),
    'dash_thrust'
  );
  assert.equal(
    resolveCombatAction({ onGround: true, isHold: false, isRightClick: true, hasGun: true, comboStep: 1 }),
    'ranged_fire'
  );
});

test('Realistic two-handed IK grip, physical blade reach scaling, and ranged stances produce finite poses', () => {
  const moves: CombatMoveType[] = [
    'standard_slash',
    'spin_horizontal',
    'mini_thrust',
    'spin_vertical',
    'air_slam_windup',
    'air_slam_dive',
    'air_slam_impact',
    'dash_thrust',
  ];

  for (const move of moves) {
    for (const t of [0, 0.25, 0.5, 0.75, 1]) {
      const pose = sampleStickmanCombatPose(move, t, 'katana');
      assert.ok(Number.isFinite(pose.hand.x) && Number.isFinite(pose.hand.y));
      assert.ok(Number.isFinite(pose.offHand.x) && Number.isFinite(pose.offHand.y));
      assert.ok(Number.isFinite(pose.weaponAngle));
    }
  }

  // Two-handed weapons physically attach off-hand to weapon shaft during standard_slash
  const swordPose = sampleStickmanCombatPose('standard_slash', 0.4, 'sword');
  assert.equal(swordPose.offHandOnWeapon, true);
  const daggerPose = sampleStickmanCombatPose('standard_slash', 0.4, 'dagger');
  assert.equal(daggerPose.offHandOnWeapon, false);

  // Spear physical sweep hitbox must be significantly wider than short Combat Dagger
  const daggerBox = computeWeaponSweepHitbox('standard_slash', 'dagger', true, 100, 100);
  const spearBox = computeWeaponSweepHitbox('standard_slash', 'spear', true, 100, 100);
  assert.ok(spearBox.w > daggerBox.w + 10, `Expected spear (${spearBox.w}) > dagger (${daggerBox.w})`);

  // Blade trail samples produce finite world coordinates
  const trail = sampleWeaponBladeTrail('standard_slash', 0.48, 'katana', true, 100, 100, 6);
  assert.equal(trail.length, 6);
  const seg = computeWeaponBladeSegment(swordPose, 'sword', true, 100, 100);
  assert.ok(Math.hypot(seg.tipX - seg.hiltX, seg.tipY - seg.hiltY) > 14);

  // Segment vs AABB contact works cleanly
  assert.equal(segmentIntersectsAABB(0, 0, 20, 0, 10, -5, 10, 10), true);
  assert.equal(segmentIntersectsAABB(0, 0, 5, 0, 10, -5, 10, 10), false);

  // All 5 ranged weapon aim stances work cleanly
  for (const rId of ['pistol', 'dual_pistol', 'shotgun', 'bow', 'rifle'] as const) {
    const aim = sampleRangedAimPose(rId, 0.3);
    assert.ok(Number.isFinite(aim.mainHand.x) && Number.isFinite(aim.offHand.x));
    if (rId === 'dual_pistol') assert.equal(aim.hasOffhandGun, true);
    if (rId === 'bow') assert.ok(aim.bowDraw >= 0 && aim.twoHanded);
  }
});
