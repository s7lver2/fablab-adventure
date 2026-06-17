/** Normaliza la salida para comparar: recorta espacios finales por línea y bordes. */
export function normalize(output: string): string {
  return output
    .split('\n')
    .map((line) => line.replace(/\s+$/, ''))
    .join('\n')
    .replace(/^\n+|\n+$/g, '')
}

export function matchesExpected(produced: string, expected: string): boolean {
  return normalize(produced) === normalize(expected)
}
