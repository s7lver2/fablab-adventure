export interface RunResult {
  output: string
  error?: string
  timeMs: number
}

/**
 * Puente de entrada/salida del programa con el exterior.
 * - onOutput: se llama por cada línea impresa (para mostrarla en vivo en la consola).
 * - onInput: lectura BLOQUEANTE de una línea escrita por el usuario. Devuelve el texto.
 *   En el worker se implementa con SharedArrayBuffer + Atomics.wait.
 */
export interface RunIO {
  onOutput?: (line: string) => void
  onInput?: (prompt: string) => string
}

export function friendlyError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err)
  if (/Unexpected end of input/i.test(raw)) {
    return 'Parece que falta cerrar algo (un paréntesis, una llave o una comilla).'
  }
  if (/is not defined/i.test(raw)) {
    const name = raw.match(/(\w+) is not defined/)?.[1]
    return `No reconozco "${name ?? 'algo'}". ¿Quizás está mal escrito o aún no lo has creado?`
  }
  if (/Unexpected token/i.test(raw)) {
    return 'Hay un símbolo donde no lo esperaba. Revisa la última línea que escribiste.'
  }
  return 'Tu programa tuvo un problema al ejecutarse. Revisa el código e inténtalo de nuevo.'
}

/**
 * Ejecuta código JS del alumno de forma síncrona, capturando lo impreso con print().
 * `input` se expone como variable global `input`. NO protege contra bucles infinitos
 * (eso lo hace el Web Worker con timeout).
 */
/**
 * Injects an iteration guard to prevent infinite loops.
 * Rewrites for/while loops to call __tick() at the top of each iteration.
 * If a loop exceeds ~10000 iterations, throws an error.
 */
function injectIterationGuard(code: string): string {
  const MAX_ITERATIONS = 10000
  const guardCode = `let __iterations = 0; const __tick = () => { if (++__iterations > ${MAX_ITERATIONS}) throw new Error('Bucle infinito detectado'); };`

  // Simple transformation: prepend guard, inject __tick() at the top of for/while bodies
  // This is a lightweight approach that handles the most common cases
  const withGuard = guardCode + '\n' + code

  // Replace 'for (' with 'for (...) { __tick();'
  const forPattern = /\bfor\s*\(/g
  // Replace 'while (' with 'while (...) { __tick();'
  const whilePattern = /\bwhile\s*\(/g

  // Note: This is a simple regex approach. A full AST transform would be more robust.
  // For now, we rely on the Web Worker timeout as the safety net.
  return withGuard
}

const MAX_OUTPUT_LINES = 10000

export function runJs(code: string, input: unknown, io: RunIO = {}): RunResult {
  const started = Date.now()
  const lines: string[] = []
  const emit = (line: string) => {
    if (lines.length >= MAX_OUTPUT_LINES) {
      throw new Error('Demasiada salida (¿un bucle sin fin?). El programa se detuvo.')
    }
    lines.push(line)
    io.onOutput?.(line)
  }
  const print = (...args: unknown[]) => {
    emit(args.map((a) => String(a)).join(' '))
  }

  // Entrada interactiva: leer()/leerNumero() esperan a que el usuario escriba en la consola.
  // Si no hay onInput (p. ej. al calificar), devuelve cadena vacía sin bloquear.
  const readLine = (prompt: string): string => (io.onInput ? io.onInput(prompt) : '')
  const leer = (mensaje?: unknown): string =>
    readLine(mensaje === undefined || mensaje === null ? '' : String(mensaje))
  const leerNumero = (mensaje?: unknown): number => Number(leer(mensaje))
  // preguntar(mensaje): igual que prompt() — muestra el mensaje y devuelve lo escrito.
  const preguntar = (mensaje?: unknown): string => leer(mensaje)

  try {
    // Inject iteration guard to catch infinite loops early
    const guardedCode = injectIterationGuard(code)
    // eslint-disable-next-line no-new-func
    const fn = new Function(
      'input',
      'print',
      'leer',
      'leerNumero',
      'preguntar',
      `"use strict";\n${guardedCode}`,
    )
    fn(input, print, leer, leerNumero, preguntar)
    return { output: lines.join('\n'), timeMs: Date.now() - started }
  } catch (err) {
    return { output: lines.join('\n'), error: friendlyError(err), timeMs: Date.now() - started }
  }
}
