import { runPython } from './python-runner'

interface WorkerRequest {
  code: string
  input: unknown
  sab?: SharedArrayBuffer
}

const HEADER_BYTES = 8

function makeBlockingInput(sab: SharedArrayBuffer) {
  const control = new Int32Array(sab, 0, 2)
  const bytes = new Uint8Array(sab, HEADER_BYTES)
  const decoder = new TextDecoder()
  return (prompt: string): string => {
    Atomics.store(control, 0, 0)
    self.postMessage({ type: 'input', prompt })
    Atomics.wait(control, 0, 0)
    const len = Math.min(Atomics.load(control, 1), bytes.length)
    return decoder.decode(bytes.subarray(0, len))
  }
}

self.onmessage = (e: MessageEvent<WorkerRequest>) => {
  const { code, input, sab } = e.data
  const result = runPython(code, input, {
    onOutput: (line) => self.postMessage({ type: 'output', line }),
    onInput: sab ? makeBlockingInput(sab) : undefined,
  })
  self.postMessage({ type: 'result', ...result })
}
