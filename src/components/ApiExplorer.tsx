import { useState } from 'react'
import { api } from '../services/api'

interface EndpointField {
  name: string
  label: string
  type?: string
  placeholder?: string
  options?: string[]
}

interface EndpointDef {
  method: 'GET' | 'POST'
  path: string
  description: string
  fields?: EndpointField[]
  call: (vals: Record<string, string>) => Promise<unknown>
}

const ENDPOINTS: EndpointDef[] = [
  {
    method: 'GET', path: '/ping',
    description: 'Check if the server is alive.',
    call: () => api.ping(),
  },
  {
    method: 'GET', path: '/health',
    description: 'Full health status of the knowledge graph.',
    call: () => api.health(),
  },
  {
    method: 'GET', path: '/concepts',
    description: 'List all concepts stored in the knowledge graph.',
    call: () => api.getConcepts(),
  },
  {
    method: 'GET', path: '/global-context',
    description: 'Get global graph statistics (total nodes, bonds, centroid).',
    call: () => api.getGlobalContext(),
  },
  {
    method: 'GET', path: '/predict',
    description: 'Run fuzzy 12-dimensional prediction for a concept.',
    fields: [{ name: 'concept', label: 'Concept', placeholder: 'e.g. login' }],
    call: (v) => api.predict(v.concept || ''),
  },
  {
    method: 'POST', path: '/agent',
    description: 'Autonomous LLM agent — the model decides which tool to use.',
    fields: [{ name: 'message', label: 'Message', placeholder: 'e.g. A user cannot log in, what should I do?' }],
    call: (v) => api.sendAgentMessage(v.message || ''),
  },
  {
    method: 'POST', path: '/sentence',
    description: 'Generate a descriptive sentence for a concept.',
    fields: [{ name: 'concept', label: 'Concept', placeholder: 'e.g. authentication' }],
    call: (v) => api.generateSentence(v.concept || ''),
  },
  {
    method: 'POST', path: '/search/essence',
    description: 'Search by essence dimensions (physical features).',
    fields: [
      { name: 'query', label: 'Query', placeholder: 'e.g. password reset' },
      { name: 'top_k', label: 'Top K Results', placeholder: '5' },
    ],
    call: (v) => api.searchEssence(v.query || '', Number(v.top_k) || 5),
  },
  {
    method: 'POST', path: '/search/identity',
    description: 'Search by identity dimensions (semantic features).',
    fields: [
      { name: 'query', label: 'Query', placeholder: 'e.g. billing issue' },
      { name: 'top_k', label: 'Top K Results', placeholder: '5' },
    ],
    call: (v) => api.searchIdentity(v.query || '', Number(v.top_k) || 5),
  },
  {
    method: 'POST', path: '/relationships/add',
    description: 'Manually add a weighted relationship between two concepts.',
    fields: [
      { name: 'concept_a', label: 'Concept A', placeholder: 'e.g. login issue' },
      { name: 'concept_b', label: 'Concept B', placeholder: 'e.g. account locked' },
      { name: 'weight', label: 'Weight (0.0 – 1.0)', placeholder: '0.9' },
      { name: 'color', label: 'Relation Type', options: ['CAUSES', 'IS_A', 'HAS', 'RELATED'] },
    ],
    call: (v) => api.addRelationship(v.concept_a || '', v.concept_b || '', Number(v.weight) || 0.8, v.color || 'RELATED'),
  },
]

function EndpointCard({ ep }: { ep: EndpointDef }) {
  const [open, setOpen] = useState(false)
  const [values, setValues] = useState<Record<string, string>>({})
  const [response, setResponse] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [isError, setIsError] = useState(false)

  const handleRun = async () => {
    setLoading(true)
    setIsError(false)
    try {
      const res = await ep.call(values)
      setResponse(JSON.stringify(res, null, 2))
    } catch (e: unknown) {
      setIsError(true)
      setResponse(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="endpoint-card">
      <div className="endpoint-header" onClick={() => setOpen(o => !o)}>
        <span className={`method-badge method-${ep.method}`}>{ep.method}</span>
        <code className="endpoint-path">{ep.path}</code>
        <span className="endpoint-desc">{ep.description}</span>
        <svg className={`chevron ${open ? 'open' : ''}`} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
      </div>

      {open && (
        <div className="endpoint-body">
          {ep.fields?.map(field => (
            <div key={field.name}>
              <div className="field-label">{field.label}</div>
              {field.options ? (
                <select
                  className="field-select"
                  value={values[field.name] || field.options[0]}
                  onChange={e => setValues(v => ({ ...v, [field.name]: e.target.value }))}
                >
                  {field.options.map(opt => <option key={opt}>{opt}</option>)}
                </select>
              ) : (
                <input
                  className="field-input"
                  placeholder={field.placeholder}
                  value={values[field.name] || ''}
                  onChange={e => setValues(v => ({ ...v, [field.name]: e.target.value }))}
                  type={field.type || 'text'}
                />
              )}
            </div>
          ))}
          <button className="run-btn" onClick={handleRun} disabled={loading}>
            {loading ? <><div className="spinner" style={{ width: 14, height: 14 }} /> Running…</> : '▶ Send Request'}
          </button>
          {response !== null && (
            <pre className={`response-box ${isError ? 'response-error' : ''}`}>{response}</pre>
          )}
        </div>
      )}
    </div>
  )
}

export default function ApiExplorer() {
  const getEndpoints = ENDPOINTS.filter(e => e.method === 'GET')
  const postEndpoints = ENDPOINTS.filter(e => e.method === 'POST')

  return (
    <div className="api-explorer">
      <div className="api-section-title">🟢 GET Endpoints</div>
      {getEndpoints.map(ep => <EndpointCard key={ep.path} ep={ep} />)}
      <div className="api-section-title">🟣 POST Endpoints</div>
      {postEndpoints.map(ep => <EndpointCard key={ep.path} ep={ep} />)}
    </div>
  )
}
