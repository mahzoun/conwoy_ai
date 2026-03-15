-- Conway's Game of Life Competitive - Initial Schema
-- Migration: 001_initial

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- matches table
-- ============================================================
CREATE TABLE IF NOT EXISTS matches (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contract_match_id   BIGINT,
    transaction_hash    VARCHAR(66),
    phase               VARCHAR(20) NOT NULL DEFAULT 'waiting'
                            CHECK (phase IN ('waiting', 'setup', 'ready', 'running', 'finished')),
    config              JSONB NOT NULL,
    winner              VARCHAR(10),   -- '1', '2', 'draw', or NULL
    final_score_p1      INTEGER NOT NULL DEFAULT 0,
    final_score_p2      INTEGER NOT NULL DEFAULT 0,
    cumulative_score_p1 INTEGER NOT NULL DEFAULT 0,
    cumulative_score_p2 INTEGER NOT NULL DEFAULT 0,
    result_signature    TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    started_at          TIMESTAMPTZ,
    finished_at         TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_matches_phase ON matches(phase);
CREATE INDEX IF NOT EXISTS idx_matches_created_at ON matches(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_matches_contract_match_id ON matches(contract_match_id);

-- ============================================================
-- players table
-- ============================================================
CREATE TABLE IF NOT EXISTS players (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    match_id            UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    slot                SMALLINT NOT NULL CHECK (slot IN (1, 2)),
    wallet_address      VARCHAR(42) NOT NULL,
    agent_id            VARCHAR(20),
    selected_pattern_id VARCHAR(20),
    pattern_rotation    SMALLINT NOT NULL DEFAULT 0 CHECK (pattern_rotation IN (0, 90, 180, 270)),
    pattern_mirror      BOOLEAN NOT NULL DEFAULT FALSE,
    placed_cells        JSONB NOT NULL DEFAULT '[]',
    is_ready            BOOLEAN NOT NULL DEFAULT FALSE,
    UNIQUE (match_id, slot),
    UNIQUE (match_id, wallet_address)
);

CREATE INDEX IF NOT EXISTS idx_players_wallet_address ON players(wallet_address);
CREATE INDEX IF NOT EXISTS idx_players_match_id ON players(match_id);

-- ============================================================
-- game_states table (stores simulation snapshots every N generations)
-- ============================================================
CREATE TABLE IF NOT EXISTS game_states (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    match_id    UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    generation  INTEGER NOT NULL,
    board_state JSONB NOT NULL,
    score_p1    INTEGER NOT NULL DEFAULT 0,
    score_p2    INTEGER NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (match_id, generation)
);

CREATE INDEX IF NOT EXISTS idx_game_states_match_id ON game_states(match_id);
CREATE INDEX IF NOT EXISTS idx_game_states_generation ON game_states(match_id, generation);

-- ============================================================
-- match_history materialized view
-- ============================================================
CREATE MATERIALIZED VIEW IF NOT EXISTS match_history AS
SELECT
    m.id AS match_id,
    p.wallet_address,
    p.slot AS player_slot,
    opp.wallet_address AS opponent_address,
    CASE
        WHEN m.winner IS NULL THEN NULL
        WHEN m.winner = 'draw' THEN 'draw'
        WHEN m.winner::INT = p.slot THEN 'win'
        ELSE 'loss'
    END AS result,
    CASE WHEN p.slot = 1 THEN m.final_score_p1 ELSE m.final_score_p2 END AS final_score_self,
    CASE WHEN p.slot = 1 THEN m.final_score_p2 ELSE m.final_score_p1 END AS final_score_opponent,
    (m.config->>'entryFeeWei')::TEXT AS entry_fee_wei,
    m.finished_at
FROM matches m
JOIN players p ON p.match_id = m.id
LEFT JOIN players opp ON opp.match_id = m.id AND opp.slot != p.slot
WHERE m.phase = 'finished';

CREATE UNIQUE INDEX IF NOT EXISTS idx_match_history_unique ON match_history(match_id, wallet_address);
CREATE INDEX IF NOT EXISTS idx_match_history_wallet ON match_history(wallet_address);
CREATE INDEX IF NOT EXISTS idx_match_history_finished_at ON match_history(finished_at DESC);

-- ============================================================
-- Function to refresh match_history
-- ============================================================
CREATE OR REPLACE FUNCTION refresh_match_history()
RETURNS TRIGGER AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY match_history;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger to refresh on match finish
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'trg_refresh_match_history'
    ) THEN
        CREATE TRIGGER trg_refresh_match_history
        AFTER UPDATE OF phase ON matches
        FOR EACH ROW
        WHEN (NEW.phase = 'finished')
        EXECUTE FUNCTION refresh_match_history();
    END IF;
END;
$$;
