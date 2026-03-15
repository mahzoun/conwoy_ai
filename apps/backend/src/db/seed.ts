import { query } from './client';
import { v4 as uuidv4 } from 'uuid';
import {
  BOARD_WIDTH,
  BOARD_HEIGHT,
  MAX_GENERATIONS,
  DEFAULT_ENTRY_FEE_WEI,
  SETUP_TIMEOUT_SECONDS,
  MAX_INITIAL_CELLS,
} from '@conwoy/shared';

const defaultConfig = {
  boardWidth: BOARD_WIDTH,
  boardHeight: BOARD_HEIGHT,
  maxGenerations: MAX_GENERATIONS,
  entryFeeWei: DEFAULT_ENTRY_FEE_WEI,
  setupTimeoutSeconds: SETUP_TIMEOUT_SECONDS,
  maxInitialCells: MAX_INITIAL_CELLS,
};

async function seed() {
  console.log('Seeding database...');

  // Create a sample finished match
  const matchId = uuidv4();
  const p1Id = uuidv4();
  const p2Id = uuidv4();

  await query(
    `INSERT INTO matches (id, phase, config, winner, final_score_p1, final_score_p2,
      cumulative_score_p1, cumulative_score_p2, result_signature, created_at, started_at, finished_at)
     VALUES ($1, 'finished', $2, '1', 42, 31, 12500, 9800, 'sample-sig-0x123', NOW() - INTERVAL '2 hours', NOW() - INTERVAL '2 hours' + INTERVAL '5 minutes', NOW() - INTERVAL '1 hour')
     ON CONFLICT DO NOTHING`,
    [matchId, JSON.stringify(defaultConfig)]
  );

  await query(
    `INSERT INTO players (id, match_id, slot, wallet_address, agent_id, selected_pattern_id, placed_cells, is_ready)
     VALUES ($1, $2, 1, '0x1234567890123456789012345678901234567890', 'architect', 'block', '[[5,10],[5,20],[10,15]]', true)
     ON CONFLICT DO NOTHING`,
    [p1Id, matchId]
  );

  await query(
    `INSERT INTO players (id, match_id, slot, wallet_address, agent_id, selected_pattern_id, placed_cells, is_ready)
     VALUES ($1, $2, 2, '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd', 'swarm', 'glider', '[[25,10],[28,15],[30,20]]', true)
     ON CONFLICT DO NOTHING`,
    [p2Id, matchId]
  );

  // Create a sample waiting match
  const waitingMatchId = uuidv4();
  const waitingP1Id = uuidv4();

  await query(
    `INSERT INTO matches (id, phase, config, created_at)
     VALUES ($1, 'waiting', $2, NOW())
     ON CONFLICT DO NOTHING`,
    [waitingMatchId, JSON.stringify({ ...defaultConfig, entryFeeWei: '100000000000000000' })]
  );

  await query(
    `INSERT INTO players (id, match_id, slot, wallet_address, agent_id, placed_cells, is_ready)
     VALUES ($1, $2, 1, '0x1234567890123456789012345678901234567890', null, '[]', false)
     ON CONFLICT DO NOTHING`,
    [waitingP1Id, waitingMatchId]
  );

  console.log(`Seeded matches: ${matchId}, ${waitingMatchId}`);
  console.log('Seed complete.');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
