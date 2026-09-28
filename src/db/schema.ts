import type { SQLiteDatabase } from 'expo-sqlite';

/**
 * Migrations run in order, keyed by PRAGMA user_version. Only ever append.
 * Never drop or rewrite user data here.
 */
const MIGRATIONS: string[] = [
  // v1
  `
  CREATE TABLE IF NOT EXISTS activities (
    id TEXT PRIMARY KEY NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('hike', 'run')),
    status TEXT NOT NULL CHECK (status IN ('recording', 'paused', 'finished')),
    started_at INTEGER NOT NULL,
    ended_at INTEGER,
    moving_time_s INTEGER NOT NULL DEFAULT 0,
    distance_m REAL NOT NULL DEFAULT 0,
    elevation_gain_m REAL NOT NULL DEFAULT 0,
    elevation_loss_m REAL NOT NULL DEFAULT 0,
    title TEXT,
    current_segment INTEGER NOT NULL DEFAULT 0,
    segment_started_at INTEGER
  );

  CREATE TABLE IF NOT EXISTS points (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    activity_id TEXT NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
    ts INTEGER NOT NULL,
    lat REAL NOT NULL,
    lng REAL NOT NULL,
    altitude REAL,
    accuracy REAL,
    speed REAL,
    segment INTEGER NOT NULL DEFAULT 0
  );
  CREATE INDEX IF NOT EXISTS idx_points_activity_ts ON points(activity_id, ts);

  CREATE TABLE IF NOT EXISTS photos (
    id TEXT PRIMARY KEY NOT NULL,
    activity_id TEXT NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
    ts INTEGER NOT NULL,
    lat REAL,
    lng REAL,
    uri TEXT NOT NULL,
    caption TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_photos_activity ON photos(activity_id, ts);

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL
  );
  `,
];

export function migrate(db: SQLiteDatabase): void {
  db.execSync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  const row = db.getFirstSync<{ user_version: number }>('PRAGMA user_version');
  let version = row?.user_version ?? 0;
  while (version < MIGRATIONS.length) {
    const sql = MIGRATIONS[version];
    const next = version + 1;
    db.withTransactionSync(() => {
      db.execSync(sql);
      db.execSync(`PRAGMA user_version = ${next}`);
    });
    version = next;
  }
}
