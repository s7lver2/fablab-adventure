import { runJs } from './js-runner'

export interface WorkerRequest {
  code: string
  input: unknown
}

self.onmessage = (e: MessageEvent<WorkerRequest>) => {
  const { code, input } = e.data
  const result = runJs(code, input)
  self.postMessage(result)
}
