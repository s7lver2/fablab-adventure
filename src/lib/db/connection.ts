import Database from 'better-sqlite3'
import path from 'node:path'
import { createSchema } from './schema'
import { seedCurriculum } from '../curriculum/seed'

let instance: Database.Database | null = null

export function getDb(): Database.Database {
  if (instance) return instance
  const file = process.env.DB_PATH ?? path.join(process.cwd(), 'data.sqlite')
  instance = new Database(file)
  createSchema(instance)
  seedCurriculum(instance)
  return instance
}
