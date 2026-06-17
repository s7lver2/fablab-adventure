import type { RunResult } from './js-runner'

type SkulptModule = {
  configure: (opts: { output?: (text: string) => void; __future__?: unknown }) => void
  importMainWithBody: (name: string, dumpJS: boolean, code: string, canSuspend: boolean) => void
  python3: unknown
}

function getSk(): SkulptModule {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require('skulpt')
  return mod.default ?? mod
}

export function runPython(code: string, input: unknown): RunResult {
  const started = Date.now()
  const lines: string[] = []

  try {
    const Sk = getSk()
    Sk.configure({
      output: (text: string) => {
        if (text !== '\n') lines.push(text.replace(/\n$/, ''))
      },
      __future__: Sk.python3,
    })

    const inputLiteral = input === null || input === undefined
      ? 'None'
      : JSON.stringify(input)
    const injected = `input = ${inputLiteral}\n${code}`
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
