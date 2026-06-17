import type Database from 'better-sqlite3'
import { DEFAULT_SETTINGS } from './defaults'

export class SettingsRepository {
  constructor(private db: Database.Database) {}

  get(key: string): string {
    const row = this.db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as
      | { value: string }
      | undefined
    return row?.value ?? DEFAULT_SETTINGS[key] ?? ''
  }

  getNumber(key: string): number {
    return Number(this.get(key))
  }

  getBool(key: string): boolean {
    return this.get(key) === 'true'
  }

  set(key: string, value: string): void {
    this.db
      .prepare(
        `INSERT INTO settings (key, value) VALUES (?, ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      )
      .run(key, value)
  }

  /** Defaults mezclados con overrides persistidos. */
  all(): Record<string, string> {
    const merged: Record<string, string> = { ...DEFAULT_SETTINGS }
    const rows = this.db.prepare('SELECT key, value FROM settings').all() as {
      key: string
      value: string
    }[]
    for (const r of rows) merged[r.key] = r.value
    return merged
  }
}
