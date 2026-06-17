import { describe, it, expect } from 'vitest'
import Database from 'better-sqlite3'
import { createSchema } from '../db/schema'
import { seedCurriculum } from './seed'
import { CurriculumRepository } from './repository'

function seeded() {
  const db = new Database(':memory:')
  createSchema(db)
  seedCurriculum(db)
  return new CurriculumRepository(db)
}

describe('CurriculumRepository', () => {
  it('lista los retos en orden', () => {
    const repo = seeded()
    const list = repo.listChallenges()
    expect(list.length).toBeGreaterThanOrEqual(2)
    expect(list[0].ord).toBeLessThanOrEqual(list[1].ord)
  })

  it('devuelve un reto con su variante JS y casos de prueba (sin salida esperada en la variante)', () => {
    const repo = seeded()
    const slug = repo.listChallenges()[0].slug
    const full = repo.getChallengeBySlug(slug)!
    expect(full.variants.js).toBeTruthy()
    expect(full.testCases.length).toBeGreaterThanOrEqual(1)
    expect(full.testCases[0].expectedOutput).toBeTruthy()
  })

  it('devuelve null para un slug inexistente', () => {
    const repo = seeded()
    expect(repo.getChallengeBySlug('no-existe')).toBeNull()
  })
})
