import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DASH_THRUST_ENERGY_COST,
  DUAL_CROSS_COMBO_ENERGY_COST,
  GROUND_SLAM_ENERGY_COST,
  applyLoadoutEquipRule,
  canWeaponAirSlam,
  canWeaponDashThrust,
  canWeaponDualCombo,
  canWeaponGroundSlam,
  computeWeaponBladeSegment,
  computeWeaponSweepHitbox,
  getRightClickSkillMeta,
  resolveCombatAction,
  resolveDisplayedWeapon,
  sampleOffhandBladeTrail,
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

test('Balancing rules: Dagger cannot Slam, Dash Thrust only on Sword/Katana/Spear, Ground Slam on Axe/Hammer, Dual X-Combo on Dual Sword', () => {
  // 1. Dagger CANNOT Aerial Slam
  assert.equal(canWeaponAirSlam('dagger'), false);
  assert.equal(canWeaponAirSlam('sword'), true);
  assert.equal(
    resolveCombatAction({
      onGround: false,
      isHold: true,
      isRightClick: false,
      hasGun: true,
      comboStep: 1,
      weaponId: 'dagger',
    }),
    'spin_vertical'
  );
  assert.equal(
    resolveCombatAction({
      onGround: false,
      isHold: true,
      isRightClick: false,
      hasGun: false,
      comboStep: 1,
      weaponId: 'sword',
    }),
    'air_slam_windup'
  );

  // 2. Dash Thrust ONLY on sword, katana, spear (with energy cost)
  assert.ok(DASH_THRUST_ENERGY_COST > 0);
  for (const okId of ['sword', 'katana', 'spear'] as const) {
    assert.equal(canWeaponDashThrust(okId), true);
    assert.equal(
      resolveCombatAction({
        onGround: true,
        isHold: false,
        isRightClick: true,
        hasGun: false,
        comboStep: 1,
        weaponId: okId,
      }),
      'dash_thrust'
    );
  }
  for (const noId of ['dagger', 'needle', 'axe', 'hammer', 'dual_sword'] as const) {
    assert.equal(canWeaponDashThrust(noId), false);
  }
  assert.equal(
    resolveCombatAction({
      onGround: true,
      isHold: false,
      isRightClick: true,
      hasGun: false,
      comboStep: 1,
      weaponId: 'needle',
    }),
    'none'
  );

  // 3. Axe & Hammer Hold Right-Click = Ground Slam (with energy cost)
  assert.ok(GROUND_SLAM_ENERGY_COST > 0);
  for (const heavyId of ['axe', 'hammer'] as const) {
    assert.equal(canWeaponGroundSlam(heavyId), true);
    assert.equal(
      resolveCombatAction({
        onGround: true,
        isHold: false,
        isRightClick: true,
        hasGun: false,
        comboStep: 1,
        weaponId: heavyId,
      }),
      'ground_slam_charge'
    );
    assert.equal(
      resolveCombatAction({
        onGround: true,
        isHold: true,
        isRightClick: true,
        hasGun: false,
        comboStep: 1,
        weaponId: heavyId,
      }),
      'ground_slam_impact'
    );
  }

  // 4. Dual Sword RMB + LMB extra combo = Dual Cross Combo (2x DMG, energy cost)
  assert.ok(DUAL_CROSS_COMBO_ENERGY_COST > 0);
  assert.equal(canWeaponDualCombo('dual_sword'), true);
  assert.equal(
    resolveCombatAction({
      onGround: true,
      isHold: false,
      isRightClick: false,
      hasGun: false,
      comboStep: 1,
      weaponId: 'dual_sword',
      isDualChord: true,
    }),
    'dual_cross_combo'
  );
  // Plain RMB on Dual Sword without LMB does NOT trigger dash_thrust
  assert.equal(
    resolveCombatAction({
      onGround: true,
      isHold: false,
      isRightClick: true,
      hasGun: false,
      comboStep: 1,
      weaponId: 'dual_sword',
    }),
    'none'
  );

  // 5. Skill meta reflects every weapon cleanly
  assert.equal(getRightClickSkillMeta('sword', false).kind, 'dash_thrust');
  assert.equal(getRightClickSkillMeta('axe', false).kind, 'ground_slam');
  assert.equal(getRightClickSkillMeta('hammer', false).kind, 'ground_slam');
  assert.equal(getRightClickSkillMeta('dual_sword', false).kind, 'dual_combo');
  assert.equal(getRightClickSkillMeta('dagger', true, 12).kind, 'ranged');
});

test('Conditional combat action resolver maps ground 3-hit combo and gun fire accurately', () => {
  assert.equal(
    resolveCombatAction({ onGround: true, isHold: false, isRightClick: false, hasGun: false, comboStep: 1, weaponId: 'sword' }),
    'standard_slash'
  );
  assert.equal(
    resolveCombatAction({ onGround: true, isHold: false, isRightClick: false, hasGun: false, comboStep: 2, weaponId: 'sword' }),
    'spin_horizontal'
  );
  assert.equal(
    resolveCombatAction({ onGround: true, isHold: false, isRightClick: false, hasGun: false, comboStep: 3, weaponId: 'sword' }),
    'mini_thrust'
  );
  assert.equal(
    resolveCombatAction({ onGround: false, isHold: false, isRightClick: false, hasGun: false, comboStep: 1, weaponId: 'sword' }),
    'spin_vertical'
  );
  assert.equal(
    resolveCombatAction({ onGround: true, isHold: false, isRightClick: true, hasGun: true, comboStep: 1, weaponId: 'dagger' }),
    'ranged_fire'
  );
});

test('Realistic two-handed IK grip, physical blade reach scaling, twin blade trails, and ranged stances produce finite poses', () => {
  const moves: CombatMoveType[] = [
    'standard_slash',
    'spin_horizontal',
    'mini_thrust',
    'spin_vertical',
    'air_slam_windup',
    'air_slam_dive',
    'air_slam_impact',
    'dash_thrust',
    'ground_slam_charge',
    'ground_slam_impact',
    'dual_cross_combo',
  ];

  for (const move of moves) {
    for (const t of [0, 0.25, 0.5, 0.75, 1]) {
      const wId =
        move === 'dual_cross_combo'
          ? 'dual_sword'
          : move === 'ground_slam_charge' || move === 'ground_slam_impact'
            ? 'hammer'
            : 'katana';
      const pose = sampleStickmanCombatPose(move, t, wId);
      assert.ok(Number.isFinite(pose.hand.x) && Number.isFinite(pose.hand.y));
      assert.ok(Number.isFinite(pose.offHand.x) && Number.isFinite(pose.offHand.y));
      assert.ok(Number.isFinite(pose.weaponAngle));
    }
  }

  // Two-handed weapons physically attach off-hand to weapon shaft during standard_slash & ground slam
  const swordPose = sampleStickmanCombatPose('standard_slash', 0.4, 'sword');
  assert.equal(swordPose.offHandOnWeapon, true);
  const hammerSlamPose = sampleStickmanCombatPose('ground_slam_impact', 0.35, 'hammer');
  assert.equal(hammerSlamPose.offHandOnWeapon, true);
  const daggerPose = sampleStickmanCombatPose('standard_slash', 0.4, 'dagger');
  assert.equal(daggerPose.offHandOnWeapon, false);

  // Dual Cross Combo produces distinct opposing blade angles and off-hand trail
  const dualPose = sampleStickmanCombatPose('dual_cross_combo', 0.42, 'dual_sword');
  assert.ok(dualPose.offWeaponAngle !== undefined);
  const offTrail = sampleOffhandBladeTrail('dual_cross_combo', 0.48, true, 100, 100, 6);
  assert.equal(offTrail.length, 6);
  assert.ok(Number.isFinite(offTrail[5].tipX) && Number.isFinite(offTrail[5].tipY));

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
