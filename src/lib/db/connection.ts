import Database from 'better-sqlite3'
import path from 'node:path'
import { createSchema } from './schema'
import { seedCurriculum } from '../curriculum/seed'

let instance: Database.Database | null = null

function defaultDbPath(): string {
  // En Vercel (serverless) el sistema de archivos del proyecto es de solo lectura;
  // la única carpeta escribible es /tmp. La DB es efímera: se recrea y resiembra en
  // cada arranque en frío gracias a las migraciones idempotentes. Suficiente para pruebas.
  if (process.env.VERCEL) return '/tmp/data.sqlite'
  return path.join(process.cwd(), 'data.sqlite')
}

export function getDb(): Database.Database {
  if (instance) return instance
  const file = process.env.DB_PATH ?? defaultDbPath()
  instance = new Database(file)
  createSchema(instance)
  seedCurriculum(instance)
  return instance
}
