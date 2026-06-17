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
export function runJs(code: string, input: unknown): RunResult {
  const started = Date.now()
  const lines: string[] = []
  const print = (...args: unknown[]) => {
    lines.push(args.map((a) => String(a)).join(' '))
  }
  try {
    // eslint-disable-next-line no-new-func
    const fn = new Function('input', 'print', `"use strict";\n${code}`)
    fn(input, print)
    return { output: lines.join('\n'), timeMs: Date.now() - started }
  } catch (err) {
    return { output: '', error: friendlyError(err), timeMs: Date.now() - started }
  }
}
