declare module 'skulpt' {
  const Sk: {
    configure: (opts: { output?: (text: string) => void; __future__?: unknown }) => void
    importMainWithBody: (name: string, dumpJS: boolean, code: string, canSuspend: boolean) => void
    python3: unknown
  }
  export default Sk
}
