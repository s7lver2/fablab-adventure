import type Database from 'better-sqlite3'
import type { ProfileUpdate, Role, User } from './types'
import type { Language } from '../curriculum/types'
import { hashPassword, verifyPassword as verifyHash } from '../auth/password'

interface UserRow {
  id: number
  username: string
  display_name: string
  avatar: string
  profile_message: string
  role: Role
  hidden: number
  created_at: number
  last_seen: number
  chosen_language?: string | null
}

function toUser(row: UserRow): User {
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    avatar: row.avatar,
    profileMessage: row.profile_message,
    role: row.role,
    hidden: row.hidden === 1,
    createdAt: row.created_at,
    lastSeen: row.last_seen,
    chosenLanguage: (row.chosen_language as Language | null) ?? null,
  }
}

export class UserRepository {
  constructor(private db: Database.Database) {}

  findById(id: number): User | null {
    const row = this.db.prepare('SELECT * FROM users WHERE id = ?').get(id) as UserRow | undefined
    return row ? toUser(row) : null
  }

  findByUsername(username: string): User | null {
    const row = this.db.prepare('SELECT * FROM users WHERE username = ?').get(username) as
      | UserRow
      | undefined
    return row ? toUser(row) : null
  }

  findOrCreateByUsername(username: string): User {
    const clean = username.trim().toLowerCase()
    if (clean === 'root') {
      throw new Error('El nombre de usuario "root" está reservado.')
    }
    const existing = this.findByUsername(clean)
    const now = Date.now()
    if (existing) {
      this.db.prepare('UPDATE users SET last_seen = ? WHERE id = ?').run(now, existing.id)
      return existing
    }
    const info = this.db
      .prepare(
        `INSERT INTO users (username, display_name, role, hidden, created_at, last_seen)
         VALUES (?, ?, 'user', 0, ?, ?)`,
      )
      .run(clean, clean, now, now)
    return this.findById(Number(info.lastInsertRowid))!
  }

  updateProfile(id: number, update: ProfileUpdate): void {
    this.db
      .prepare(
        'UPDATE users SET display_name = ?, avatar = ?, profile_message = ? WHERE id = ? AND role = (SELECT role FROM users WHERE id = ?)',
      )
      .run(update.displayName, update.avatar, update.profileMessage, id, id)
  }

  verifyPassword(username: string, plain: string): boolean {
    const row = this.db
      .prepare('SELECT password_hash FROM users WHERE username = ?')
      .get(username.trim().toLowerCase()) as { password_hash: string | null } | undefined
    if (!row?.password_hash) return false
    return verifyHash(plain, row.password_hash)
  }

  setPassword(username: string, plain: string): void {
    this.db
      .prepare('UPDATE users SET password_hash = ? WHERE username = ?')
      .run(hashPassword(plain), username.trim().toLowerCase())
  }

  listAll(includeHidden = false): User[] {
    const rows = this.db
      .prepare(`SELECT * FROM users ${includeHidden ? '' : 'WHERE hidden = 0'} ORDER BY created_at`)
      .all() as UserRow[]
    return rows.map(toUser)
  }

  createAdmin(username: string, displayName: string, password: string): User {
    const clean = username.trim().toLowerCase()
    const now = Date.now()
    const info = this.db
      .prepare(
        `INSERT INTO users (username, display_name, role, hidden, password_hash, created_at, last_seen)
         VALUES (?, ?, 'admin', 0, ?, ?, ?)`,
      )
      .run(clean, displayName || clean, hashPassword(password), now, now)
    return this.findById(Number(info.lastInsertRowid))!
  }

  setRole(userId: number, role: Role): void {
    this.db.prepare("UPDATE users SET role = ? WHERE id = ? AND role != 'root'").run(role, userId)
  }

  setLanguage(userId: number, lang: Language): void {
    this.db
      .prepare('UPDATE users SET chosen_language = ? WHERE id = ?')
      .run(lang, userId)
  }
}
