import type Database from 'better-sqlite3'
import { createHash } from 'node:crypto'

export function createSchema(db: Database.Database): void {
  db.pragma('journal_mode = WAL')
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      display_name TEXT NOT NULL,
      avatar TEXT NOT NULL DEFAULT '',
      profile_message TEXT NOT NULL DEFAULT '',
      role TEXT NOT NULL DEFAULT 'user',
      hidden INTEGER NOT NULL DEFAULT 0,
      password_hash TEXT,
      created_at INTEGER NOT NULL,
      last_seen INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS concepts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      ord INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS challenges (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      concept_id INTEGER NOT NULL REFERENCES concepts(id),
      slug TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      narrative TEXT NOT NULL DEFAULT '',
      ord INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS challenge_variants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      challenge_id INTEGER NOT NULL REFERENCES challenges(id),
      language TEXT NOT NULL,
      statement TEXT NOT NULL,
      starter_code TEXT NOT NULL DEFAULT '',
      hints_json TEXT NOT NULL DEFAULT '[]',
      UNIQUE(challenge_id, language)
    );
    CREATE TABLE IF NOT EXISTS test_cases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      challenge_id INTEGER NOT NULL REFERENCES challenges(id),
      input_json TEXT NOT NULL,
      expected_output TEXT NOT NULL,
      ord INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS progress (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      challenge_id INTEGER NOT NULL REFERENCES challenges(id),
      stars INTEGER NOT NULL DEFAULT 0,
      attempts INTEGER NOT NULL DEFAULT 0,
      hints_used INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'in_progress',
      completed_at INTEGER,
      UNIQUE(user_id, challenge_id)
    );
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      user_id INTEGER,
      path TEXT NOT NULL DEFAULT '',
      session_id TEXT NOT NULL DEFAULT '',
      user_agent TEXT NOT NULL DEFAULT '',
      referrer TEXT NOT NULL DEFAULT '',
      meta_json TEXT NOT NULL DEFAULT '{}',
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_events_created ON events(created_at);
    CREATE INDEX IF NOT EXISTS idx_events_session ON events(session_id);
    CREATE TABLE IF NOT EXISTS review_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      challenge_id INTEGER NOT NULL REFERENCES challenges(id),
      language TEXT NOT NULL,
      submitted_code TEXT NOT NULL,
      submitted_output TEXT NOT NULL,
      message TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'pending',
      reviewer_admin_id INTEGER REFERENCES users(id),
      feedback TEXT NOT NULL DEFAULT '',
      created_at INTEGER NOT NULL,
      resolved_at INTEGER
    );
  `)
  // Migración idempotente: añadir chosen_language si no existe
  try {
    db.exec("ALTER TABLE users ADD COLUMN chosen_language TEXT")
  } catch {
    // columna ya existe
  }
  seedRoot(db)
}

function seedRoot(db: Database.Database): void {
  const exists = db.prepare("SELECT 1 FROM users WHERE username = 'root'").get()
  if (exists) return
  const now = Date.now()
  // Contraseña por defecto del root: 'changeme' (se cambiará en el hito de admin).
  const hash = createHash('sha256').update('changeme').digest('hex')
  db.prepare(
    `INSERT INTO users (username, display_name, avatar, profile_message, role, hidden, password_hash, created_at, last_seen)
     VALUES ('root', 'root', '', '', 'root', 1, ?, ?, ?)`,
  ).run(hash, now, now)
}
