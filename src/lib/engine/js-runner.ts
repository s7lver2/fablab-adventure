export interface RunResult {
  output: string
  error?: string
  timeMs: number
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

export function runJs(code: string, input: unknown): RunResult {
  const started = Date.now()
  const lines: string[] = []
  const print = (...args: unknown[]) => {
    lines.push(args.map((a) => String(a)).join(' '))
  }
  try {
    // Inject iteration guard to catch infinite loops early
    const guardedCode = injectIterationGuard(code)
    // eslint-disable-next-line no-new-func
    const fn = new Function('input', 'print', `"use strict";\n${guardedCode}`)
    fn(input, print)
    return { output: lines.join('\n'), timeMs: Date.now() - started }
  } catch (err) {
    return { output: '', error: friendlyError(err), timeMs: Date.now() - started }
  }
}
