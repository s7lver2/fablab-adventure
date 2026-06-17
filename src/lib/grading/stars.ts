export interface StarInput {
  correct: boolean
  attempts: number
  hintsUsed: number
}

/** Umbrales por defecto (configurables por reto en hitos posteriores). */
export function computeStars({ correct, attempts, hintsUsed }: StarInput): number {
  if (!correct) return 0
  const penalty = attempts - 1 + hintsUsed
  if (penalty === 0) return 3
  if (penalty <= 3) return 2
  return 1
}
