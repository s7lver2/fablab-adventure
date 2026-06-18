import type { RunResult } from './js-runner'
import type { Language } from '../curriculum/types'

const ACTIVE_TIMEOUT_MS = 8000
const SAB_DATA_BYTES = 8192
const HEADER_BYTES = 8

type WorkerMessage =
  | { type: 'output'; line: string }
  | { type: 'input'; prompt: string }
  | ({ type: 'result' } & RunResult)

function spawnWorker(language: Language): Worker {
  // El patrón `new Worker(new URL('./archivo', import.meta.url))` debe ir INLINE:
  // así Turbopack lo compila como worker. Si la URL se guarda en una variable, el
  // bundler la trata como asset estático y sirve el .ts crudo → "error al cargar el worker".
  return language === 'python'
    ? new Worker(new URL('./python-worker.ts', import.meta.url), { type: 'module' })
    : new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })
}

/**
 * Ejecuta el código UNA vez sin interacción y devuelve el resultado completo.
 * Se usa al calificar (Enviar): no hay humano para escribir, así que input() devuelve "".
 */
export function runInWorker(code: string, input: unknown, language: Language = 'js'): Promise<RunResult> {
  return new Promise((resolve) => {
    const worker = spawnWorker(language)
    const timer = setTimeout(() => {
      worker.terminate()
      resolve({
        output: '',
        error: 'Tu programa tardó demasiado. Si tienes un bucle, revisa que llegue a su fin.',
        timeMs: ACTIVE_TIMEOUT_MS,
      })
    }, ACTIVE_TIMEOUT_MS)

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
    worker.onmessage = (e: MessageEvent<WorkerMessage>) => {
      // Sin SAB, el worker nunca pide input; solo emite 'output' (ignorado aquí) y 'result'.
      if (e.data.type !== 'result') return
      clearTimeout(timer)
      worker.terminate()
      const { output, error, timeMs } = e.data
      resolve({ output, error, timeMs })
    }
    // Sin `sab`: la entrada interactiva queda deshabilitada (input() → "").
    worker.postMessage({ code, input })
  })
}

export interface InteractiveHandlers {
  onOutput: (line: string) => void
  /** El programa pide entrada: la consola debe mostrar el cursor y dejar escribir. */
  onInputRequest: (prompt: string) => void
  onDone: (result: RunResult) => void
}

export interface InteractiveController {
  /** Envía la línea escrita por el usuario al programa en pausa. */
  provideInput: (line: string) => void
  /** Detiene el programa (botón parar / cambio de reto). */
  cancel: () => void
  /** true si la consola puede pedir input (requiere aislamiento de origen cruzado). */
  interactive: boolean
}

/**
 * Ejecuta el código en modo consola interactiva: la salida llega en vivo y, cuando el
 * programa llama a input()/leer(), se pausa y espera a que el usuario escriba.
 * Requiere SharedArrayBuffer (headers COOP/COEP); si no está, ejecuta sin poder pedir input.
 */
export function runInteractive(
  code: string,
  input: unknown,
  language: Language,
  handlers: InteractiveHandlers,
): InteractiveController {
  const isolated =
    typeof SharedArrayBuffer !== 'undefined' &&
    (typeof crossOriginIsolated === 'undefined' || crossOriginIsolated)

  const worker = spawnWorker(language)
  let finished = false
  let timer: ReturnType<typeof setTimeout> | null = null

  // SAB para la entrada bloqueante: [flag, longitud] + bytes del texto.
  let control: Int32Array | null = null
  let bytes: Uint8Array | null = null
  let sab: SharedArrayBuffer | undefined
  if (isolated) {
    sab = new SharedArrayBuffer(HEADER_BYTES + SAB_DATA_BYTES)
    control = new Int32Array(sab, 0, 2)
    bytes = new Uint8Array(sab, HEADER_BYTES)
  }

  const clearTimer = () => {
    if (timer) clearTimeout(timer)
    timer = null
  }
  const armTimer = () => {
    clearTimer()
    timer = setTimeout(() => finish({ output: '', error: 'Tu programa tardó demasiado. Si tienes un bucle, revisa que llegue a su fin.', timeMs: ACTIVE_TIMEOUT_MS }), ACTIVE_TIMEOUT_MS)
  }
  const finish = (result: RunResult) => {
    if (finished) return
    finished = true
    clearTimer()
    worker.terminate()
    handlers.onDone(result)
  }

  worker.onerror = (ev) => finish({ output: '', error: `No se pudo ejecutar el código (worker): ${ev.message || 'error al cargar el worker'}`, timeMs: 0 })
  worker.onmessageerror = () => finish({ output: '', error: 'No se pudo leer el resultado del worker.', timeMs: 0 })
  worker.onmessage = (e: MessageEvent<WorkerMessage>) => {
    const msg = e.data
    if (msg.type === 'output') {
      armTimer() // el programa sigue activo
      handlers.onOutput(msg.line)
    } else if (msg.type === 'input') {
      clearTimer() // esperando a la persona: sin límite de tiempo
      handlers.onInputRequest(msg.prompt)
    } else if (msg.type === 'result') {
      finish({ output: msg.output, error: msg.error, timeMs: msg.timeMs })
    }
  }

  armTimer()
  worker.postMessage({ code, input, sab })

  return {
    interactive: isolated,
    provideInput: (line: string) => {
      if (finished || !control || !bytes) return
      const enc = new TextEncoder().encode(line)
      const n = Math.min(enc.length, bytes.length)
      bytes.set(enc.subarray(0, n))
      Atomics.store(control, 1, n)
      Atomics.store(control, 0, 1)
      Atomics.notify(control, 0)
      armTimer() // el programa va a reanudar
    },
    cancel: () => finish({ output: '', error: undefined, timeMs: 0 }),
  }
}
