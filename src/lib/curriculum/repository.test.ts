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

describe('CurriculumRepository.listConceptsWithChallenges', () => {
  let db: Database.Database

  beforeEach(() => {
    db = new Database(':memory:')
    createSchema(db)
    seedCurriculum(db)
  })

  it('retorna 7 conceptos', () => {
    const concepts = new CurriculumRepository(db).listConceptsWithChallenges()
    expect(concepts).toHaveLength(7)
  })

  it('el primer concepto es Primeros pasos con 5 retos', () => {
    const [first] = new CurriculumRepository(db).listConceptsWithChallenges()
    expect(first.slug).toBe('primeros-pasos')
    expect(first.challenges).toHaveLength(5)
  })

  it('los retos están ordenados por ord', () => {
    const [first] = new CurriculumRepository(db).listConceptsWithChallenges()
    const ords = first.challenges.map((c) => c.ord)
    expect(ords).toEqual([...ords].sort((a, b) => a - b))
  })
})
