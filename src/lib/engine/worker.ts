import { runJs } from './js-runner'

export interface WorkerRequest {
  code: string
  input: unknown
  /** Buffer compartido para la entrada interactiva. Si falta, no hay input bloqueante. */
  sab?: SharedArrayBuffer
}

// Layout del SharedArrayBuffer:
//   Int32[0] = bandera (0 = esperando input, 1 = input listo)
//   Int32[1] = nº de bytes UTF-8 escritos
//   bytes a partir del offset 8 = texto de la línea introducida
const HEADER_BYTES = 8

function makeBlockingInput(sab: SharedArrayBuffer) {
  const control = new Int32Array(sab, 0, 2)
  const bytes = new Uint8Array(sab, HEADER_BYTES)
  const decoder = new TextDecoder()
  return (prompt: string): string => {
    Atomics.store(control, 0, 0)
    self.postMessage({ type: 'input', prompt })
    // Bloquea este hilo (worker) hasta que el hilo principal escriba la respuesta.
    Atomics.wait(control, 0, 0)
    const len = Math.min(Atomics.load(control, 1), bytes.length)
    return decoder.decode(bytes.subarray(0, len))
  }
}

self.onmessage = (e: MessageEvent<WorkerRequest>) => {
  const { code, input, sab } = e.data
  const result = runJs(code, input, {
    onOutput: (line) => self.postMessage({ type: 'output', line }),
    onInput: sab ? makeBlockingInput(sab) : undefined,
  })
  self.postMessage({ type: 'result', ...result })
}
