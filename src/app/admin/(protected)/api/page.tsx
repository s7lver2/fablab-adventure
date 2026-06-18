'use client'
import { useState } from 'react'
import { API_ENDPOINTS } from '@/lib/admin/endpoints'
import type { ApiEndpoint } from '@/lib/admin/endpoints'

interface RequestState {
  method: string
  path: string
  pathParams: Record<string, string>
  queryParams: Record<string, string>
  body: string
}

interface ResponseState {
  status: number | null
  statusText: string
  headers: Record<string, string>
  body: string
  time: number
}

const METHOD_COLOR: Record<string, string> = {
  GET: '#10b981',
  POST: '#818cf8',
  PATCH: '#f59e0b',
  DELETE: '#f87171',
}

const METHOD_BG: Record<string, string> = {
  GET: 'rgba(16,185,129,0.12)',
  POST: 'rgba(129,140,248,0.12)',
  PATCH: 'rgba(245,158,11,0.12)',
  DELETE: 'rgba(248,113,113,0.12)',
}

export default function AdminApiPage() {
  const [selectedEndpoint, setSelectedEndpoint] = useState<ApiEndpoint | null>(API_ENDPOINTS[0] || null)
  const [request, setRequest] = useState<RequestState>({
    method: 'GET',
    path: '/api/auth/login',
    pathParams: {},
    queryParams: {},
    body: '{}',
  })
  const [response, setResponse] = useState<ResponseState | null>(null)
  const [loading, setLoading] = useState(false)
  const [confirmDestructive, setConfirmDestructive] = useState(false)

  function onSelectEndpoint(endpoint: ApiEndpoint) {
    setSelectedEndpoint(endpoint)
    setRequest({
      method: endpoint.method,
      path: endpoint.path,
      pathParams: {},
      queryParams: {},
      body: endpoint.body ? JSON.stringify({ [endpoint.body[0].name]: endpoint.body[0].example }, null, 2) : '{}',
    })
    setResponse(null)
    setConfirmDestructive(false)
  }

  function getResolvedPath(): string {
    let path = request.path
    if (selectedEndpoint?.pathParams) {
      for (const param of selectedEndpoint.pathParams) {
        const value = request.pathParams[param.name] || param.example
        path = path.replace(`[${param.name}]`, value)
      }
    }
    const queryString = Object.entries(request.queryParams)
      .filter(([, v]) => v)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join('&')
    return path + (queryString ? `?${queryString}` : '')
  }

  async function sendRequest() {
    if (selectedEndpoint?.destructive && !confirmDestructive) {
      setConfirmDestructive(true)
      return
    }

    const path = getResolvedPath()
    const startTime = Date.now()

    try {
      setLoading(true)
      const options: RequestInit = {
        method: request.method,
        headers: { 'Content-Type': 'application/json' },
      }
      if (request.method !== 'GET' && request.method !== 'HEAD') {
        try { options.body = request.body } catch { /* use as-is */ }
      }
      const res = await fetch(path, options)
      const body = await res.text()
      setResponse({
        status: res.status,
        statusText: res.statusText,
        headers: Object.fromEntries(res.headers.entries()),
        body,
        time: Date.now() - startTime,
      })
    } catch (error) {
      setResponse({ status: null, statusText: String(error), headers: {}, body: String(error), time: Date.now() - startTime })
    } finally {
      setLoading(false)
      setConfirmDestructive(false)
    }
  }

  const grouped = API_ENDPOINTS.reduce((acc, ep) => {
    if (!acc[ep.group]) acc[ep.group] = []
    acc[ep.group].push(ep)
    return acc
  }, {} as Record<string, ApiEndpoint[]>)

  const resolvedPath = getResolvedPath()
  const isSuccess = response?.status && response.status >= 200 && response.status < 300

  return (
    <div className="api-page">
      {/* ── Sidebar ── */}
      <aside className="api-sidebar">
        <div className="api-sidebar__header">
          <span className="api-sidebar__title">API</span>
          <span className="api-sidebar__count">{API_ENDPOINTS.length} endpoints</span>
        </div>
        {Object.entries(grouped).map(([group, endpoints]) => (
          <div key={group} className="api-group">
            <div className="api-group__label">{group}</div>
            {endpoints.map((ep) => {
              const isActive = selectedEndpoint === ep
              return (
                <button
                  key={`${ep.method}-${ep.path}`}
                  onClick={() => onSelectEndpoint(ep)}
                  className={`api-ep-btn${isActive ? ' api-ep-btn--active' : ''}`}
                >
                  <span className="api-method" style={{ color: METHOD_COLOR[ep.method] || '#94a3b8', background: METHOD_BG[ep.method] || 'transparent' }}>
                    {ep.method}
                  </span>
                  <span className="api-ep-path">{ep.path.replace('/api/', '')}</span>
                  {ep.destructive && <span className="api-ep-warn">⚠</span>}
                </button>
              )
            })}
          </div>
        ))}
      </aside>

      {/* ── Main panel ── */}
      <div className="api-main">
        {selectedEndpoint ? (
          <>
            {/* Request card */}
            <div className="api-card">
              <div className="api-card__header">
                <span className="api-method api-method--lg" style={{ color: METHOD_COLOR[selectedEndpoint.method] || '#94a3b8', background: METHOD_BG[selectedEndpoint.method] || 'transparent' }}>
                  {selectedEndpoint.method}
                </span>
                <code className="api-path-display">{resolvedPath}</code>
              </div>
              <p className="api-endpoint-desc">{selectedEndpoint.description}</p>

              {/* Path params */}
              {selectedEndpoint.pathParams && selectedEndpoint.pathParams.length > 0 && (
                <div className="api-field-group">
                  <div className="api-field-label">PATH PARAMS</div>
                  {selectedEndpoint.pathParams.map((param) => (
                    <div key={param.name} className="api-field">
                      <span className="api-field__name">{param.name}</span>
                      <input
                        type="text"
                        placeholder={param.example}
                        value={request.pathParams[param.name] || ''}
                        onChange={(e) => setRequest((s) => ({ ...s, pathParams: { ...s.pathParams, [param.name]: e.target.value } }))}
                        className="api-input"
                      />
                      <span className="api-field__hint">e.g. {param.example}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Body */}
              {selectedEndpoint.method !== 'GET' && selectedEndpoint.method !== 'DELETE' && (
                <div className="api-field-group">
                  <div className="api-field-label">REQUEST BODY</div>
                  <textarea
                    value={request.body}
                    onChange={(e) => setRequest((s) => ({ ...s, body: e.target.value }))}
                    className="api-textarea"
                    rows={6}
                  />
                </div>
              )}

              {/* Destructive confirm */}
              {selectedEndpoint.destructive && confirmDestructive && (
                <div className="api-destructive-warn">
                  <span>⚠️ Operación destructiva. ¿Confirmar?</span>
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                    <button onClick={sendRequest} className="api-btn api-btn--danger">Confirmar</button>
                    <button onClick={() => setConfirmDestructive(false)} className="api-btn api-btn--ghost">Cancelar</button>
                  </div>
                </div>
              )}

              {!confirmDestructive && (
                <button onClick={sendRequest} disabled={loading} className="api-btn api-btn--primary">
                  {loading ? (
                    <><span className="api-spinner" /> Enviando…</>
                  ) : (
                    <>↗ Enviar</>
                  )}
                </button>
              )}
            </div>

            {/* Response card */}
            {response && (
              <div className="api-card">
                <div className="api-card__header" style={{ justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span className={`api-status-badge ${isSuccess ? 'api-status-badge--ok' : 'api-status-badge--err'}`}>
                      {response.status ?? 'ERR'}
                    </span>
                    <span style={{ fontFamily: 'var(--adm-font-mono)', fontSize: 12, color: 'var(--adm-text-secondary)' }}>
                      {response.statusText}
                    </span>
                  </div>
                  <span style={{ fontFamily: 'var(--adm-font-mono)', fontSize: 11, color: 'var(--adm-text-tertiary)' }}>
                    {response.time} ms
                  </span>
                </div>
                <div className="api-response-body">
                  <pre>
                    {(() => {
                      try { return JSON.stringify(JSON.parse(response.body), null, 2) }
                      catch { return response.body }
                    })()}
                  </pre>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="api-empty">Selecciona un endpoint →</div>
        )}
      </div>

      <style>{`
        .api-page {
          display: grid;
          grid-template-columns: 240px 1fr;
          height: 100vh;
          overflow: hidden;
          background: var(--adm-bg-primary);
          font-family: var(--adm-font-sans);
        }

        /* ── Sidebar ── */
        .api-sidebar {
          border-right: 1px solid rgba(99,102,241,0.15);
          overflow-y: auto;
          padding: 1.25rem 0;
          scrollbar-width: thin;
          scrollbar-color: rgba(99,102,241,0.2) transparent;
        }
        .api-sidebar__header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 1rem 1rem;
          border-bottom: 1px solid rgba(99,102,241,0.1);
          margin-bottom: 0.75rem;
        }
        .api-sidebar__title {
          font-size: 11px;
          font-family: var(--adm-font-mono);
          font-weight: 700;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          color: var(--adm-accent);
        }
        .api-sidebar__count {
          font-size: 10px;
          font-family: var(--adm-font-mono);
          color: var(--adm-text-tertiary);
        }
        .api-group { margin-bottom: 1rem; padding: 0 0.75rem; }
        .api-group__label {
          font-size: 9px;
          font-family: var(--adm-font-mono);
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--adm-text-tertiary);
          padding: 0 0.25rem;
          margin-bottom: 0.35rem;
        }
        .api-ep-btn {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.45rem 0.6rem;
          background: transparent;
          border: 1px solid transparent;
          border-radius: 6px;
          cursor: pointer;
          text-align: left;
          transition: all 0.12s ease;
          margin-bottom: 2px;
        }
        .api-ep-btn:hover { background: rgba(99,102,241,0.06); }
        .api-ep-btn--active {
          background: rgba(99,102,241,0.1);
          border-color: rgba(99,102,241,0.25);
        }
        .api-ep-path {
          flex: 1;
          font-family: var(--adm-font-mono);
          font-size: 11px;
          color: var(--adm-text-secondary);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .api-ep-btn--active .api-ep-path { color: var(--adm-text-primary); }
        .api-ep-warn { color: #f59e0b; font-size: 10px; flex-shrink: 0; }

        /* ── Method badge ── */
        .api-method {
          font-family: var(--adm-font-mono);
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.06em;
          padding: 2px 6px;
          border-radius: 4px;
          flex-shrink: 0;
          text-transform: uppercase;
        }
        .api-method--lg {
          font-size: 11px;
          padding: 4px 10px;
        }

        /* ── Main panel ── */
        .api-main {
          overflow-y: auto;
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
          scrollbar-width: thin;
          scrollbar-color: rgba(99,102,241,0.2) transparent;
        }

        /* ── Cards ── */
        .api-card {
          background: rgba(255,255,255,0.03);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(99,102,241,0.15);
          border-radius: 12px;
          padding: 1.25rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .api-card__header {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding-bottom: 0.75rem;
          border-bottom: 1px solid rgba(99,102,241,0.1);
        }
        .api-path-display {
          font-family: var(--adm-font-mono);
          font-size: 13px;
          color: var(--adm-text-primary);
          word-break: break-all;
        }
        .api-endpoint-desc {
          font-size: 13px;
          color: var(--adm-text-secondary);
          line-height: 1.5;
          margin-top: -0.25rem;
        }

        /* ── Form fields ── */
        .api-field-group { display: flex; flex-direction: column; gap: 0.5rem; }
        .api-field-label {
          font-size: 9px;
          font-family: var(--adm-font-mono);
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--adm-accent);
        }
        .api-field { display: flex; flex-direction: column; gap: 0.3rem; }
        .api-field__name {
          font-family: var(--adm-font-mono);
          font-size: 11px;
          color: var(--adm-text-secondary);
        }
        .api-field__hint {
          font-family: var(--adm-font-mono);
          font-size: 10px;
          color: var(--adm-text-tertiary);
        }

        .api-input {
          background: rgba(99,102,241,0.05);
          border: 1px solid rgba(99,102,241,0.2);
          border-radius: 6px;
          padding: 0.5rem 0.75rem;
          color: var(--adm-text-primary);
          font-family: var(--adm-font-mono);
          font-size: 12px;
          transition: border-color 0.15s;
          outline: none;
        }
        .api-input:focus { border-color: rgba(99,102,241,0.6); box-shadow: 0 0 0 3px rgba(99,102,241,0.08); }
        .api-input::placeholder { color: var(--adm-text-tertiary); }

        .api-textarea {
          background: rgba(99,102,241,0.05);
          border: 1px solid rgba(99,102,241,0.2);
          border-radius: 6px;
          padding: 0.75rem;
          color: var(--adm-text-primary);
          font-family: var(--adm-font-mono);
          font-size: 12px;
          resize: vertical;
          min-height: 120px;
          outline: none;
          transition: border-color 0.15s;
          width: 100%;
        }
        .api-textarea:focus { border-color: rgba(99,102,241,0.6); box-shadow: 0 0 0 3px rgba(99,102,241,0.08); }

        /* ── Buttons ── */
        .api-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.55rem 1.1rem;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          border: none;
          transition: all 0.15s ease;
        }
        .api-btn--primary {
          background: var(--adm-accent);
          color: #fff;
          box-shadow: 0 2px 8px rgba(99,102,241,0.35);
        }
        .api-btn--primary:hover:not(:disabled) {
          background: #4f46e5;
          box-shadow: 0 4px 14px rgba(99,102,241,0.45);
          transform: translateY(-1px);
        }
        .api-btn--primary:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
        .api-btn--danger { background: rgba(248,113,113,0.15); color: #f87171; border: 1px solid rgba(248,113,113,0.3); }
        .api-btn--danger:hover { background: rgba(248,113,113,0.25); }
        .api-btn--ghost { background: rgba(255,255,255,0.05); color: var(--adm-text-secondary); border: 1px solid rgba(255,255,255,0.1); }
        .api-btn--ghost:hover { background: rgba(255,255,255,0.1); }

        /* ── Destructive warning ── */
        .api-destructive-warn {
          padding: 0.9rem 1rem;
          border-radius: 8px;
          background: rgba(245,158,11,0.08);
          border: 1px solid rgba(245,158,11,0.25);
          font-size: 13px;
          color: #fbbf24;
        }

        /* ── Status badge ── */
        .api-status-badge {
          font-family: var(--adm-font-mono);
          font-size: 13px;
          font-weight: 700;
          padding: 3px 10px;
          border-radius: 6px;
        }
        .api-status-badge--ok { background: rgba(16,185,129,0.12); color: #34d399; }
        .api-status-badge--err { background: rgba(248,113,113,0.12); color: #f87171; }

        /* ── Response body ── */
        .api-response-body {
          background: rgba(0,0,0,0.25);
          border: 1px solid rgba(99,102,241,0.1);
          border-radius: 8px;
          padding: 0.75rem 1rem;
          max-height: 320px;
          overflow: auto;
          scrollbar-width: thin;
          scrollbar-color: rgba(99,102,241,0.2) transparent;
        }
        .api-response-body pre {
          font-family: var(--adm-font-mono);
          font-size: 12px;
          color: var(--adm-text-primary);
          margin: 0;
          white-space: pre-wrap;
          word-break: break-all;
        }

        /* ── Spinner ── */
        .api-spinner {
          display: inline-block;
          width: 12px;
          height: 12px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: #fff;
          border-radius: 50%;
          animation: api-spin 0.6s linear infinite;
        }
        @keyframes api-spin { to { transform: rotate(360deg); } }

        /* ── Empty state ── */
        .api-empty {
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: var(--adm-font-mono);
          font-size: 13px;
          color: var(--adm-text-tertiary);
          letter-spacing: 0.05em;
        }

        @media (max-width: 768px) {
          .api-page { grid-template-columns: 1fr; }
          .api-sidebar { border-right: none; border-bottom: 1px solid rgba(99,102,241,0.15); max-height: 200px; }
        }
      `}</style>
    </div>
  )
}
