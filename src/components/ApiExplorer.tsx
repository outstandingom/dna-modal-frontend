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
  category?: 'DNA Model API' | 'Graph Data API' | 'Utility API'
  fields?: EndpointField[]
  call: (vals: Record<string, string>) => Promise<unknown>
}

const ENDPOINTS: EndpointDef[] = [
  {
    method: 'GET', path: '/ping',
    description: 'Check if the server is alive.',
    category: 'Utility API',
    call: () => api.ping(),
  },
  {
    method: 'GET', path: '/health',
    description: 'Full health status of the knowledge graph.',
    category: 'Utility API',
    call: () => api.health(),
  },
  {
    method: 'GET', path: '/concepts',
    description: 'List all concepts stored in the knowledge graph.',
    category: 'Graph Data API',
    call: () => api.getConcepts(),
  },
  {
    method: 'GET', path: '/global-context',
    description: 'Get global graph statistics (total nodes, bonds, centroid).',
    category: 'Graph Data API',
    call: () => api.getGlobalContext(),
  },
  {
    method: 'GET', path: '/predict',
    description: 'Run fuzzy 12-dimensional prediction for a concept.',
    category: 'DNA Model API',
    fields: [{ name: 'concept', label: 'Concept', placeholder: 'e.g. login' }],
    call: (v) => api.predict(v.concept || ''),
  },
  {
    method: 'POST', path: '/agent',
    description: 'Autonomous LLM agent — the model decides which tool to use.',
    category: 'DNA Model API',
    fields: [{ name: 'message', label: 'Message', placeholder: 'e.g. A user cannot log in, what should I do?' }],
    call: (v) => api.sendAgentMessage(v.message || ''),
  },
  {
    method: 'POST', path: '/sentence',
    description: 'Generate a descriptive sentence for a concept.',
    category: 'DNA Model API',
    fields: [{ name: 'concept', label: 'Concept', placeholder: 'e.g. authentication' }],
    call: (v) => api.generateSentence(v.concept || ''),
  },
  {
    method: 'POST', path: '/search/essence',
    description: 'Search by essence dimensions (physical features).',
    category: 'DNA Model API',
    fields: [
      { name: 'query', label: 'Query', placeholder: 'e.g. password reset' },
      { name: 'top_k', label: 'Top K Results', placeholder: '5' },
    ],
    call: (v) => api.searchEssence(v.query || '', Number(v.top_k) || 5),
  },
  {
    method: 'POST', path: '/search/identity',
    description: 'Search by identity dimensions (semantic features).',
    category: 'DNA Model API',
    fields: [
      { name: 'query', label: 'Query', placeholder: 'e.g. billing issue' },
      { name: 'top_k', label: 'Top K Results', placeholder: '5' },
    ],
    call: (v) => api.searchIdentity(v.query || '', Number(v.top_k) || 5),
  },
  {
    method: 'POST', path: '/relationships/add',
    description: 'Manually add a weighted relationship between two concepts.',
    category: 'Graph Data API',
    fields: [
      { name: 'concept_a', label: 'Concept A', placeholder: 'e.g. login issue' },
      { name: 'concept_b', label: 'Concept B', placeholder: 'e.g. account locked' },
      { name: 'weight', label: 'Weight (0.0 – 1.0)', placeholder: '0.9' },
      { name: 'color', label: 'Relation Type', options: ['CAUSES', 'IS_A', 'HAS', 'RELATED'] },
    ],
    call: (v) => api.addRelationship(v.concept_a || '', v.concept_b || '', Number(v.weight) || 0.8, v.color || 'RELATED'),
  },
  {
    method: 'GET', path: '/projection/info',
    description: 'Get information about the 128->12 dimension projection layer.',
    category: 'DNA Model API',
    call: () => api.getProjectionInfo(),
  },
  {
    method: 'POST', path: '/projection/retrain',
    description: 'Retrain the projection layer from current concept vectors.',
    category: 'DNA Model API',
    call: () => api.retrainProjection(),
  },
  {
    method: 'POST', path: '/knowledge/load',
    description: 'Dynamically load a built-in knowledge domain (e.g. technology, history, science).',
    category: 'Graph Data API',
    fields: [{ name: 'source', label: 'Knowledge Source', placeholder: 'e.g. technology' }],
    call: (v) => api.loadKnowledge(v.source || 'technology'),
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
    <div className={`endpoint-card ${ep.category === 'DNA Model API' ? 'dna-highlight' : ''}`}>
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
  const categories = ['DNA Model API', 'Graph Data API', 'Utility API'] as const
  const [orchMessage, setOrchMessage] = useState('')
  const [orchResponse, setOrchResponse] = useState<string | null>(null)
  const [orchLoading, setOrchLoading] = useState(false)
  const [orchError, setOrchError] = useState(false)

  const handleOrchestrate = async () => {
    if (!orchMessage.trim()) return
    setOrchLoading(true)
    setOrchError(false)
    try {
      const res = await api.orchestrate(orchMessage)
      setOrchResponse(JSON.stringify(res, null, 2))
    } catch (e: unknown) {
      setOrchError(true)
      setOrchResponse(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setOrchLoading(false)
    }
  }

  return (
    <div className="api-explorer">
      {/* ── Orchestrator Hero Card ── */}
      <div className="orchestrator-card">
        <div className="orchestrator-header">
          <span className="orchestrator-icon">🧬</span>
          <div>
            <h2 className="orchestrator-title">DNA Orchestrator</h2>
            <p className="orchestrator-subtitle">Single API — Full Pipeline. Send one message, get the complete DNA analysis.</p>
          </div>
          <span className="method-badge method-POST" style={{ marginLeft: 'auto', alignSelf: 'flex-start' }}>POST</span>
          <code className="endpoint-path" style={{ alignSelf: 'flex-start' }}>/orchestrate</code>
        </div>
        <div className="orchestrator-body">
          <input
            className="orchestrator-input"
            placeholder="e.g. A user cannot login to their account"
            value={orchMessage}
            onChange={e => setOrchMessage(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleOrchestrate()}
          />
          <button className="orchestrator-btn" onClick={handleOrchestrate} disabled={orchLoading}>
            {orchLoading ? <><div className="spinner" style={{ width: 16, height: 16 }} /> Analyzing…</> : '🚀 Run Full Pipeline'}
          </button>
        </div>
        {orchResponse !== null && (
          <pre className={`response-box ${orchError ? 'response-error' : ''}`} style={{ margin: '0 20px 20px' }}>{orchResponse}</pre>
        )}
      </div>

      {/* ── Category Groups ── */}
      {categories.map(cat => {
        const catEndpoints = ENDPOINTS.filter(e => (e.category || 'Utility API') === cat)
        if (catEndpoints.length === 0) return null
        return (
          <div key={cat} className="api-category-group">
            <div className={`api-section-title ${cat === 'DNA Model API' ? 'dna-title' : ''}`}>
              {cat === 'DNA Model API' ? '🧬 ' : cat === 'Graph Data API' ? '🕸️ ' : '⚙️ '}
              {cat}
            </div>
            {catEndpoints.map(ep => <EndpointCard key={ep.path} ep={ep} />)}
          </div>
        )
      })}
    </div>
  )
}
