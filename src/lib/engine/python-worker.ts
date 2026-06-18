import { runPython } from './python-runner'

interface WorkerRequest {
  code: string
  input: unknown
}

self.onmessage = (e: MessageEvent<WorkerRequest>) => {
  const { code, input } = e.data
  const result = runPython(code, input)
  self.postMessage(result)
}
