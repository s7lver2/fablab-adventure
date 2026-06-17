import { describe, it, expect } from 'vitest'
import { nextChallengeSlug } from './next'
import type { ChallengeSummary } from '../curriculum/types'

const list: ChallengeSummary[] = [
  { id: 1, slug: 'a', title: 'A', ord: 0 },
  { id: 2, slug: 'b', title: 'B', ord: 1 },
  { id: 3, slug: 'c', title: 'C', ord: 2 },
]

describe('nextChallengeSlug', () => {
  it('sugiere el primero si no hay nada completado', () => {
    expect(nextChallengeSlug(list, [])).toBe('a')
  })
  it('sugiere el primero no completado en orden', () => {
    expect(nextChallengeSlug(list, [1])).toBe('b')
    expect(nextChallengeSlug(list, [1, 2])).toBe('c')
  })
  it('devuelve null si todo está completado', () => {
    expect(nextChallengeSlug(list, [1, 2, 3])).toBeNull()
  })
})
