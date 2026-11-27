import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyLoadoutEquipRule,
  resolveCombatAction,
  sampleStickmanCombatPose,
  type CombatMoveType,
} from './combatRules';

test('Gun loadout automatically locks melee to short dagger', () => {
  const res = applyLoadoutEquipRule(
    {
      meleeWeapon: { defId: 'needle', tier: 'common', level: 1 },
      rangedWeapon: null,
      weaponInventory: [
        { defId: 'needle', tier: 'common', level: 1 },
        { defId: 'dagger', tier: 'common', level: 1 },
        { defId: 'shotgun', tier: 'rare', level: 1 },
      ],
    },
    { defId: 'shotgun', tier: 'rare', level: 1 }
  );

  assert.equal(res.rangedWeapon?.defId, 'shotgun');
  assert.equal(res.meleeWeapon.defId, 'dagger');
  assert.ok(res.notice?.includes('Dagger'));
});

test('Equipping any non-dagger melee weapon unequips ranged gun', () => {
  const res = applyLoadoutEquipRule(
    {
      meleeWeapon: { defId: 'dagger', tier: 'common', level: 1 },
      rangedWeapon: { defId: 'pistol', tier: 'common', level: 1 },
      weaponInventory: [
        { defId: 'dagger', tier: 'common', level: 1 },
        { defId: 'sword', tier: 'rare', level: 2 },
        { defId: 'pistol', tier: 'common', level: 1 },
      ],
    },
    { defId: 'sword', tier: 'rare', level: 2 }
  );

  assert.equal(res.meleeWeapon.defId, 'sword');
  assert.equal(res.rangedWeapon, null);
  assert.ok(res.notice?.includes('Dash Thrust'));
});

test('Conditional combat action resolver maps all 6 moves accurately', () => {
  // Ground 3-hit left click combo: Slash -> Spin Horizontal -> Small Thrust
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

  // Jump Hit Tap -> Spin Vertical ONLY in air
  assert.equal(
    resolveCombatAction({ onGround: false, isHold: false, isRightClick: false, hasGun: false, comboStep: 1 }),
    'spin_vertical'
  );

  // Jump Hit Hold -> Air Slam
  assert.equal(
    resolveCombatAction({ onGround: false, isHold: true, isRightClick: false, hasGun: false, comboStep: 1 }),
    'air_slam_windup'
  );

  // Right Click -> Dash Thrust in Melee mode, Ranged Fire in Gun mode
  assert.equal(
    resolveCombatAction({ onGround: true, isHold: false, isRightClick: true, hasGun: false, comboStep: 1 }),
    'dash_thrust'
  );
  assert.equal(
    resolveCombatAction({ onGround: true, isHold: false, isRightClick: true, hasGun: true, comboStep: 1 }),
    'ranged_fire'
  );
});

test('Stickman pose rig produces finite dynamic poses across all moves and phases', () => {
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
    for (const t of [0, 0.15, 0.45, 0.85, 1]) {
      const pose = sampleStickmanCombatPose(move, t);
      assert.ok(Number.isFinite(pose.torsoTilt), `${move}@${t} torsoTilt finite`);
      assert.ok(Number.isFinite(pose.hand.x) && Number.isFinite(pose.hand.y), `${move}@${t} hand finite`);
      assert.ok(pose.squashX > 0.5 && pose.squashX < 2, `${move}@${t} squashX sane`);
      assert.ok(pose.squashY > 0.5 && pose.squashY < 2, `${move}@${t} squashY sane`);
    }
  }

  // Verify windup vs snap contrast on standard slash
  const windup = sampleStickmanCombatPose('standard_slash', 0.18);
  const snap = sampleStickmanCombatPose('standard_slash', 0.5);
  assert.ok(windup.torsoTilt < 0 && snap.torsoTilt > 0, 'Standard slash leans back on windup then snaps forward');

  // Verify dash thrust extends hand further forward during lunge than anticipation
  const dashWindup = sampleStickmanCombatPose('dash_thrust', 0.1);
  const dashPeak = sampleStickmanCombatPose('dash_thrust', 0.55);
  assert.ok(dashPeak.hand.x > dashWindup.hand.x + 12, 'Dash thrust extends sharply forward');
});
