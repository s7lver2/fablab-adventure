import type { RunResult, RunIO } from './js-runner'

type SkulptModule = {
  configure: (opts: {
    output?: (text: string) => void
    __future__?: unknown
    inputfun?: (prompt: string) => string
    inputfunTakesPrompt?: boolean
  }) => void
  importMainWithBody: (name: string, dumpJS: boolean, code: string, canSuspend: boolean) => void
  python3: unknown
}

export function runPython(code: string, input: unknown, io: RunIO = {}): RunResult {
  const started = Date.now()

  try {
    // Check if Skulpt is available globally (bundled or loaded)
    if (typeof globalThis === 'undefined' || !('Sk' in globalThis)) {
      return {
        output: '',
        error: 'Python no está disponible en este navegador. Usa JavaScript en su lugar.',
        timeMs: Date.now() - started
      }
    }

    const Sk = (globalThis as any).Sk as SkulptModule
    const lines: string[] = []

    Sk.configure({
      output: (text: string) => {
        if (text === '\n') return
        const line = text.replace(/\n$/, '')
        lines.push(line)
        io.onOutput?.(line)
      },
      __future__: Sk.python3,
      // input() lee de la consola interactiva. inputfun síncrona: en el worker
      // bloquea con Atomics.wait hasta que el usuario escribe. El eco del prompt y
      // del valor lo pinta la consola del hilo principal.
      inputfun: (prompt: string): string => (io.onInput ? io.onInput(prompt ?? '') : ''),
      inputfunTakesPrompt: true,
    })

    // Inyecta los datos del reto como variable `input` solo cuando los hay; si no, deja
    // libre el builtin input() para programas interactivos del alumno.
    const hasData = input !== null && input !== undefined
    const injected = hasData ? `input = ${JSON.stringify(input)}\n${code}` : code
    Sk.importMainWithBody('<alumno>', false, injected, false)

    return { output: lines.join('\n'), timeMs: Date.now() - started }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return { output: '', error: friendlyPythonError(msg), timeMs: Date.now() - started }
  }
}

function friendlyPythonError(raw: string): string {
  if (/SyntaxError/i.test(raw))
    return 'Hay un error de sintaxis. Revisa paréntesis e indentación.'
  if (/NameError/i.test(raw)) {
    const name = raw.match(/name '(\w+)'/)?.[1]
    return `No reconozco "${name ?? 'algo'}". ¿Está mal escrito o aún no lo has creado?`
  }
  if (/IndentationError/i.test(raw))
    return 'La indentación no es correcta. Usa 4 espacios al entrar en un bloque.'
  return 'Tu programa tuvo un problema. Revisa el código e inténtalo de nuevo.'
}
