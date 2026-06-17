import { runPython } from './python-runner'

interface WorkerRequest {
  code: string
  input: unknown
}

self.onmessage = (e: MessageEvent<WorkerRequest>) => {
  const { code, input } = e.data
  self.postMessage(runPython(code, input))
}
