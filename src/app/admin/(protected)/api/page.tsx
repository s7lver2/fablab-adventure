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
        try {
          options.body = request.body
        } catch {
          // Use body as-is
        }
      }

      const res = await fetch(path, options)
      const body = await res.text()
      const time = Date.now() - startTime

      setResponse({
        status: res.status,
        statusText: res.statusText,
        headers: Object.fromEntries(res.headers.entries()),
        body,
        time,
      })
    } catch (error) {
      setResponse({
        status: null,
        statusText: String(error),
        headers: {},
        body: String(error),
        time: Date.now() - startTime,
      })
    } finally {
      setLoading(false)
      setConfirmDestructive(false)
    }
  }

  const grouped = API_ENDPOINTS.reduce(
    (acc, ep) => {
      if (!acc[ep.group]) acc[ep.group] = []
      acc[ep.group].push(ep)
      return acc
    },
    {} as Record<string, ApiEndpoint[]>,
  )

  const methodColor: Record<string, string> = {
    GET: '#10b981',
    POST: '#7c3aed',
    PATCH: '#f59e0b',
    DELETE: '#ef4444',
  }

  return (
    <div className="admin-api-page">
      <div className="admin-api-sidebar">
        <h2 style={{ marginBottom: '1rem', fontSize: '1.1rem', fontWeight: 800 }}>API Endpoints</h2>
        {Object.entries(grouped).map(([group, endpoints]) => (
          <div key={group} style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--adm-text-tertiary)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
              {group}
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {endpoints.map((ep) => (
                <button
                  key={`${ep.method}-${ep.path}`}
                  onClick={() => onSelectEndpoint(ep)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.5rem 0.75rem',
                    background: selectedEndpoint === ep ? 'var(--adm-bg-secondary)' : 'transparent',
                    border: selectedEndpoint === ep ? `1px solid var(--adm-accent)` : '1px solid transparent',
                    borderRadius: '6px',
                    color: selectedEndpoint === ep ? 'var(--adm-accent)' : 'var(--adm-text-secondary)',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    textAlign: 'left',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (selectedEndpoint !== ep) {
                      (e.target as HTMLButtonElement).style.background = 'var(--adm-bg-secondary)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedEndpoint !== ep) {
                      (e.target as HTMLButtonElement).style.background = 'transparent'
                    }
                  }}
                >
                  <span
                    style={{
                      background: methodColor[ep.method] || '#666',
                      color: 'white',
                      padding: '0.25rem 0.5rem',
                      borderRadius: '3px',
                      fontSize: '0.75rem',
                      fontWeight: 800,
                      flexShrink: 0,
                    }}
                  >
                    {ep.method}
                  </span>
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {ep.path}
                  </span>
                  {ep.destructive && <span style={{ color: 'var(--adm-warning)' }}>⚠️</span>}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="admin-api-main">
        {selectedEndpoint ? (
          <>
            <div className="admin-api-section">
              <h2 style={{ marginBottom: '0.5rem' }}>{selectedEndpoint.path}</h2>
              <p style={{ color: 'var(--adm-text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                {selectedEndpoint.description}
              </p>

              {/* Path params */}
              {selectedEndpoint.pathParams && selectedEndpoint.pathParams.length > 0 && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 700, display: 'block', marginBottom: '0.5rem' }}>Path Parameters</label>
                  {selectedEndpoint.pathParams.map((param) => (
                    <div key={param.name} style={{ marginBottom: '0.5rem' }}>
                      <input
                        type="text"
                        placeholder={param.example}
                        value={request.pathParams[param.name] || ''}
                        onChange={(e) => setRequest((s) => ({ ...s, pathParams: { ...s.pathParams, [param.name]: e.target.value } }))}
                        style={{
                          width: '100%',
                          padding: '0.5rem',
                          background: 'var(--adm-bg-secondary)',
                          border: `1px solid var(--adm-border)`,
                          borderRadius: '4px',
                          color: 'var(--adm-text-primary)',
                          fontSize: '0.9rem',
                        }}
                      />
                      <div style={{ fontSize: '0.8rem', color: 'var(--adm-text-tertiary)', marginTop: '0.25rem' }}>
                        Example: {param.example}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Body */}
              {selectedEndpoint.method !== 'GET' && selectedEndpoint.method !== 'DELETE' && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 700, display: 'block', marginBottom: '0.5rem' }}>Request Body (JSON)</label>
                  <textarea
                    value={request.body}
                    onChange={(e) => setRequest((s) => ({ ...s, body: e.target.value }))}
                    style={{
                      width: '100%',
                      minHeight: '120px',
                      padding: '0.75rem',
                      background: 'var(--adm-bg-secondary)',
                      border: `1px solid var(--adm-border)`,
                      borderRadius: '4px',
                      color: 'var(--adm-text-primary)',
                      fontFamily: 'var(--adm-font-mono)',
                      fontSize: '0.85rem',
                    }}
                  />
                </div>
              )}

              {/* Confirm destructive */}
              {selectedEndpoint.destructive && confirmDestructive && (
                <div
                  style={{
                    background: 'var(--adm-warning)',
                    color: 'white',
                    padding: '1rem',
                    borderRadius: '6px',
                    marginBottom: '1rem',
                    fontSize: '0.9rem',
                  }}
                >
                  ⚠️ This is a destructive operation. Are you sure?
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                    <button
                      onClick={sendRequest}
                      style={{
                        background: 'var(--adm-danger)',
                        color: 'white',
                        border: 'none',
                        padding: '0.5rem 1rem',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontWeight: 600,
                      }}
                    >
                      Confirm
                    </button>
                    <button
                      onClick={() => setConfirmDestructive(false)}
                      style={{
                        background: 'rgba(255,255,255,0.2)',
                        color: 'white',
                        border: 'none',
                        padding: '0.5rem 1rem',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontWeight: 600,
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {!confirmDestructive && (
                <button
                  onClick={sendRequest}
                  disabled={loading}
                  style={{
                    background: 'var(--adm-accent)',
                    color: 'white',
                    border: 'none',
                    padding: '0.75rem 1.5rem',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: 700,
                    fontSize: '0.95rem',
                    opacity: loading ? 0.5 : 1,
                  }}
                >
                  {loading ? 'Enviando…' : 'Enviar'}
                </button>
              )}
            </div>

            {/* Response */}
            {response && (
              <div className="admin-api-section">
                <h3 style={{ marginBottom: '1rem', fontSize: '0.95rem', fontWeight: 700 }}>
                  Response{' '}
                  <span
                    style={{
                      color:
                        response.status && response.status >= 200 && response.status < 300
                          ? 'var(--adm-success)'
                          : 'var(--adm-danger)',
                      fontWeight: 600,
                    }}
                  >
                    {response.status} {response.statusText}
                  </span>
                  <span style={{ color: 'var(--adm-text-tertiary)', fontSize: '0.85rem', marginLeft: '1rem' }}>
                    {response.time}ms
                  </span>
                </h3>

                <div
                  style={{
                    background: 'var(--adm-bg-secondary)',
                    border: `1px solid var(--adm-border)`,
                    borderRadius: '6px',
                    padding: '0.75rem',
                    overflow: 'auto',
                    maxHeight: '300px',
                  }}
                >
                  <pre
                    style={{
                      color: 'var(--adm-text-primary)',
                      fontFamily: 'var(--adm-font-mono)',
                      fontSize: '0.85rem',
                      margin: 0,
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-all',
                    }}
                  >
                    {(() => {
                      try {
                        return JSON.stringify(JSON.parse(response.body), null, 2)
                      } catch {
                        return response.body
                      }
                    })()}
                  </pre>
                </div>
              </div>
            )}
          </>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--adm-text-tertiary)' }}>
            Selecciona un endpoint para empezar
          </div>
        )}
      </div>

      <style>{`
        .admin-api-page {
          display: grid;
          grid-template-columns: 280px 1fr;
          gap: 1.5rem;
          padding: 1.5rem;
          height: 100vh;
          overflow: hidden;
        }
        .admin-api-sidebar {
          overflow-y: auto;
          padding-right: 0.75rem;
        }
        .admin-api-main {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.5rem;
          overflow-y: auto;
          padding-right: 0.75rem;
        }
        .admin-api-section {
          background: var(--adm-bg-secondary);
          border: 1px solid var(--adm-border);
          border-radius: 8px;
          padding: 1.5rem;
        }
        @media (max-width: 1200px) {
          .admin-api-main {
            grid-template-columns: 1fr;
          }
        }
        @media (max-width: 768px) {
          .admin-api-page {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  )
}
