import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { generateProceduralStage } from './ProceduralStageGenerator.ts';
import type { InteractableInstance } from '../entities/Interactables.ts';

function getChests(interactables: InteractableInstance[]) {
  return interactables.filter((i) => i.data.kind === 'chest');
}

describe('ProceduralStageGenerator & 30-Question Bank', () => {
  it('generates exactly 30 chests per stage with strictly 1 rare weapon chest and 29 HP/Energy/item supply chests', () => {
    for (const stage of [1, 2, 3] as const) {
      const level = generateProceduralStage(stage, `student_test_stage_${stage}`);
      const chests = getChests(level.interactables);

      assert.equal(chests.length, 30, `Stage ${stage} must have exactly 30 chests`);

      const weaponChests = chests.filter(
        (c) => c.data.kind === 'chest' && Boolean(c.data.chest.loot.weaponId)
      );
      assert.equal(
        weaponChests.length,
        1,
        `Stage ${stage} must have STRICTLY 1 weapon chest (found ${weaponChests.length})`
      );

      const supplyChests = chests.filter(
        (c) => c.data.kind === 'chest' && !c.data.chest.loot.weaponId
      );
      assert.equal(supplyChests.length, 29, `Stage ${stage} must have 29 non-weapon supply chests`);

      for (const sc of supplyChests) {
        if (sc.data.kind !== 'chest') continue;
        const loot = sc.data.chest.loot;
        assert.equal(loot.weaponId, undefined, 'Supply chest must not drop weapons');
        assert.equal(loot.armorId, undefined, 'Supply chest must not drop armor');
        const hasUsefulSupply =
          Boolean(loot.hpRestore) ||
          Boolean(loot.energyRestore) ||
          Boolean(loot.nanoVials) ||
          Boolean(loot.ammoPacks);
        assert.ok(hasUsefulSupply, 'Every supply chest must grant HP, Energy, Nano-Vial, or Reload Pack');
      }
    }
  });

  it('produces deterministic layouts for the same seed and different stage/chest/NPC patterns for different seeds', () => {
    const runA1 = generateProceduralStage(2, 'player_alpha_run_1');
    const runA2 = generateProceduralStage(2, 'player_alpha_run_1');
    const runB = generateProceduralStage(2, 'player_beta_run_99');

    // Same seed -> identical chest coordinates and enemy roster
    assert.deepEqual(
      getChests(runA1.interactables).map((c) => [c.x, c.y]),
      getChests(runA2.interactables).map((c) => [c.x, c.y])
    );
    assert.deepEqual(
      runA1.enemies.map((e) => [e.defId, e.x, e.y]),
      runA2.enemies.map((e) => [e.defId, e.x, e.y])
    );

    // Different seeds -> different room pattern, chest placement, and enemy placement
    const chestsA = getChests(runA1.interactables).map((c) => `${c.x}:${c.y}`).join(',');
    const chestsB = getChests(runB.interactables).map((c) => `${c.x}:${c.y}`).join(',');
    assert.notEqual(chestsA, chestsB, 'Different players/seeds should get distinct chest placements');

    const enemiesA = runA1.enemies.map((e) => `${e.defId}@${e.x}`).join(',');
    const enemiesB = runB.enemies.map((e) => `${e.defId}@${e.x}`).join(',');
    assert.notEqual(enemiesA, enemiesB, 'Different players/seeds should get distinct NPC patterns');
  });

  it('strictly escalates enemy count & respawn rate across Stage 1 -> Stage 2 -> Stage 3 and spawns new enemy patterns', () => {
    const s1 = generateProceduralStage(1, 'escalation_seed');
    const s2 = generateProceduralStage(2, 'escalation_seed');
    const s3 = generateProceduralStage(3, 'escalation_seed');

    assert.ok(
      s1.enemies.length < s2.enemies.length && s2.enemies.length < s3.enemies.length,
      `Enemies must escalate: S1=${s1.enemies.length}, S2=${s2.enemies.length}, S3=${s3.enemies.length}`
    );
    assert.ok(
      (s1.respawnInterval ?? 99) > (s2.respawnInterval ?? 99) &&
        (s2.respawnInterval ?? 99) > (s3.respawnInterval ?? 99),
      'Respawn interval must get faster on higher stages'
    );
    assert.ok(
      s1.enemies.every((e) => e.canRespawn) && s2.enemies.every((e) => e.canRespawn),
      'Procedural stage roamers must be configured to respawn'
    );

    // Verify new enemy types appear across stages
    const allTypes = new Set([
      ...s1.enemies.map((e) => e.defId),
      ...s2.enemies.map((e) => e.defId),
      ...s3.enemies.map((e) => e.defId),
    ]);
    assert.ok(allTypes.has('void_hopper'), 'void_hopper (leap_slammer) must spawn');
    assert.ok(allTypes.has('pulse_acolyte'), 'pulse_acolyte (burst_sniper) must spawn');
    assert.ok(allTypes.has('rift_lancer'), 'rift_lancer (dash_lancer) must spawn');
  });

  it('has at least 30 unique Informatics questions per stage in puzzles.json', () => {
    const raw = fs.readFileSync(path.resolve(process.cwd(), 'src/data/puzzles.json'), 'utf8');
    const parsed = JSON.parse(raw) as {
      questions: Array<{
        id: string;
        stage: number;
        options: string[];
        correctIndex: number;
        usedIn: string[];
      }>;
    };

    const uniqueIds = new Set(parsed.questions.map((q) => q.id));
    assert.equal(uniqueIds.size, parsed.questions.length, 'All question IDs must be unique');

    for (const stage of [1, 2, 3]) {
      const stageQs = parsed.questions.filter((q) => q.stage === stage);
      assert.ok(
        stageQs.length >= 30,
        `Stage ${stage} must have at least 30 questions (found ${stageQs.length})`
      );
      for (const q of stageQs) {
        assert.equal(q.options.length, 4, `Question ${q.id} must have 4 options`);
        assert.ok(
          q.correctIndex >= 0 && q.correctIndex < 4,
          `Question ${q.id} correctIndex out of bounds`
        );
        assert.ok(q.usedIn.includes('chest'), `Question ${q.id} must be usable in chests`);
      }
    }
  });
});
