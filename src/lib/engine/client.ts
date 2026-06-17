import type { RunResult } from './js-runner'

const TIMEOUT_MS = 3000

/** Ejecuta el código del alumno en un Worker aislado, abortando si tarda demasiado. */
export function runInWorker(code: string, input: unknown): Promise<RunResult> {
  return new Promise((resolve) => {
    const worker = new Worker(new URL('./worker.ts', import.meta.url))
    const timer = setTimeout(() => {
      worker.terminate()
      resolve({
        output: '',
        error: 'Tu programa tardó demasiado. ¿Quizás hay un bucle que no termina?',
        timeMs: TIMEOUT_MS,
      })
    }, TIMEOUT_MS)

    worker.onmessage = (e: MessageEvent<RunResult>) => {
      clearTimeout(timer)
      worker.terminate()
      resolve(e.data)
    }
    worker.postMessage({ code, input })
  })
}
