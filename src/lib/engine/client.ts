import type { RunResult } from './js-runner'
import type { Language } from '../curriculum/types'

const TIMEOUT_MS = 5000

export function runInWorker(code: string, input: unknown, language: Language = 'js'): Promise<RunResult> {
  return new Promise((resolve) => {
    // El patrón `new Worker(new URL('./archivo', import.meta.url))` debe ir INLINE:
    // así Turbopack lo compila como worker. Si la URL se guarda en una variable, el
    // bundler la trata como asset estático y sirve el .ts crudo → "error al cargar el worker".
    const worker =
      language === 'python'
        ? new Worker(new URL('./python-worker.ts', import.meta.url), { type: 'module' })
        : new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })
    const timer = setTimeout(() => {
      worker.terminate()
      resolve({
        output: '',
        error: 'Tu programa tardó demasiado. Si tienes un bucle, revisa que llegue a su fin.',
        timeMs: TIMEOUT_MS,
      })
    }, TIMEOUT_MS)

    worker.onerror = (ev) => {
      clearTimeout(timer)
      worker.terminate()
      resolve({ output: '', error: `No se pudo ejecutar el código (worker): ${ev.message || 'error al cargar el worker'}`, timeMs: 0 })
    }
    worker.onmessageerror = () => {
      clearTimeout(timer)
      worker.terminate()
      resolve({ output: '', error: 'No se pudo leer el resultado del worker.', timeMs: 0 })
    }

    worker.onmessage = (e: MessageEvent<RunResult>) => {
      clearTimeout(timer)
      worker.terminate()
      resolve(e.data)
    }
    worker.postMessage({ code, input })
  })
}
