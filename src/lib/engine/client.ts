import type { RunResult } from './js-runner'
import type { Language } from '../curriculum/types'

const TIMEOUT_MS = 3000

export function runInWorker(code: string, input: unknown, language: Language = 'js'): Promise<RunResult> {
  return new Promise((resolve) => {
    const workerUrl =
      language === 'python'
        ? new URL('./python-worker.ts', import.meta.url)
        : new URL('./worker.ts', import.meta.url)

    const worker = new Worker(workerUrl)
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
