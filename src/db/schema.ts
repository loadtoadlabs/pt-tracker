// Inactive groundwork only. See docs/BRANCH_RECONCILIATION.md before enabling storage.
export const DATABASE_NAME = 'loadtoad.db';
export const DATABASE_VERSION = 1;

export const SCHEMA_V1 = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS app_meta (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS user_profile (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  profile_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS training_sessions (
  id TEXT PRIMARY KEY NOT NULL,
  started_at TEXT NOT NULL,
  completed_at TEXT,
  scheduled_day TEXT NOT NULL,
  session_kind TEXT NOT NULL,
  session_title TEXT NOT NULL,
  training_phase TEXT NOT NULL,
  readiness_energy INTEGER,
  readiness_soreness INTEGER,
  readiness_pain INTEGER,
  readiness_action TEXT,
  completed_blocks INTEGER NOT NULL DEFAULT 0,
  skipped_blocks INTEGER NOT NULL DEFAULT 0,
  total_blocks INTEGER NOT NULL DEFAULT 0,
  notes TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS session_blocks (
  id TEXT PRIMARY KEY NOT NULL,
  session_id TEXT NOT NULL,
  block_key TEXT NOT NULL,
  position INTEGER NOT NULL,
  title TEXT NOT NULL,
  prescription TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  result_text TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  modified INTEGER NOT NULL DEFAULT 0,
  modification_text TEXT NOT NULL DEFAULT '',
  FOREIGN KEY (session_id) REFERENCES training_sessions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS exercise_sets (
  id TEXT PRIMARY KEY NOT NULL,
  session_id TEXT NOT NULL,
  block_id TEXT,
  exercise_key TEXT NOT NULL,
  exercise_name TEXT NOT NULL,
  set_number INTEGER NOT NULL,
  reps INTEGER,
  weight_lb REAL,
  duration_seconds INTEGER,
  distance_meters REAL,
  effort_rpe REAL,
  completed INTEGER NOT NULL DEFAULT 1,
  notes TEXT NOT NULL DEFAULT '',
  FOREIGN KEY (session_id) REFERENCES training_sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (block_id) REFERENCES session_blocks(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS pfa_results (
  id TEXT PRIMARY KEY NOT NULL,
  recorded_at TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'manual',
  is_mock INTEGER NOT NULL DEFAULT 0,
  cardio_component TEXT NOT NULL,
  cardio_result_text TEXT NOT NULL,
  hamr_level INTEGER,
  hamr_shuttle INTEGER,
  two_mile_seconds INTEGER,
  two_km_walk_seconds INTEGER,
  strength_component TEXT NOT NULL,
  strength_reps INTEGER NOT NULL,
  core_component TEXT NOT NULL,
  core_reps INTEGER,
  plank_seconds INTEGER,
  projected_score REAL,
  notes TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS measurements (
  id TEXT PRIMARY KEY NOT NULL,
  recorded_at TEXT NOT NULL,
  weight_lb REAL,
  waist_inches REAL,
  height_inches REAL,
  waist_to_height REAL,
  source TEXT NOT NULL DEFAULT 'weekly-check-in',
  notes TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS achievements (
  id TEXT PRIMARY KEY NOT NULL,
  achievement_key TEXT NOT NULL UNIQUE,
  unlocked_at TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  hidden INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_training_sessions_started_at
  ON training_sessions(started_at DESC);

CREATE INDEX IF NOT EXISTS idx_session_blocks_session_id
  ON session_blocks(session_id, position);

CREATE INDEX IF NOT EXISTS idx_exercise_sets_session_id
  ON exercise_sets(session_id, set_number);

CREATE INDEX IF NOT EXISTS idx_pfa_results_recorded_at
  ON pfa_results(recorded_at DESC);

CREATE INDEX IF NOT EXISTS idx_measurements_recorded_at
  ON measurements(recorded_at DESC);
`;
