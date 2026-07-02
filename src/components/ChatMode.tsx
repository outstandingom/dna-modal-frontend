import { useState, useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import { api } from '../services/api'
import GraphMode from './GraphMode'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  toolCalls?: { tool: string; result: string }[]
}

interface Props {
  onGraphUpdate: () => void
}

export default function ChatMode({ onGraphUpdate }: Props) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const handleSend = async () => {
    const text = input.trim()
    if (!text || loading) return
    setInput('')
    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: text }
    setMessages(prev => [...prev, userMsg])
    setLoading(true)
    try {
      const res = await api.sendAgentMessage(text)
      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: res.response,
        toolCalls: res.tool_calls,
      }
      setMessages(prev => [...prev, assistantMsg])
      onGraphUpdate()
    } catch (err: unknown) {
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `⚠️ Error: ${err instanceof Error ? err.message : 'Could not reach the API. Is your server running?'}`,
      }
      setMessages(prev => [...prev, errorMsg])
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const adjustHeight = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 140) + 'px'
    }
  }

  const toolIcon = (name: string) => name === 'search_graph' ? '🔍' : '🧠'

  return (
    <div className="chat-layout">
      <div className="chat-panel">
        <div className="chat-messages">
          {messages.length === 0 && (
            <div className="chat-empty">
              <div className="chat-empty-icon">🧬</div>
              <h3>DNA Knowledge Graph Agent</h3>
              <p>Ask me anything or teach me something new! I'll autonomously search or learn from the vector graph.</p>
            </div>
          )}
          {messages.map(msg => (
            <div key={msg.id} className={`message ${msg.role}`}>
              <div className="message-avatar">
                {msg.role === 'user' ? '👤' : '🤖'}
              </div>
              <div className="message-body">
                <div className="message-bubble">
                  {msg.role === 'assistant'
                    ? <ReactMarkdown>{msg.content}</ReactMarkdown>
                    : <p>{msg.content}</p>}
                </div>
                {msg.toolCalls && msg.toolCalls.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {msg.toolCalls.map((tc, i) => (
                      <span key={i} className="tool-badge">
                        {toolIcon(tc.tool)} {tc.tool}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="message assistant">
              <div className="message-avatar">🤖</div>
              <div className="typing-indicator">
                <div className="typing-dots">
                  <span /><span /><span />
                </div>
                Thinking...
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="chat-input-area">
          <div className="chat-input-row">
            <textarea
              ref={textareaRef}
              className="chat-textarea"
              value={input}
              onChange={adjustHeight}
              onKeyDown={handleKeyDown}
              placeholder="Ask a question or say 'Learn that X causes Y'... (Enter to send, Shift+Enter for newline)"
              rows={1}
              disabled={loading}
            />
            <button className="send-btn" onClick={handleSend} disabled={loading || !input.trim()}>
              {loading
                ? <div className="spinner" />
                : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
              }
            </button>
          </div>
        </div>
      </div>

      <div className="chat-graph-panel">
        <div className="panel-header">
          <span>🕸️</span> Live Knowledge Graph
        </div>
        <GraphMode mini />
      </div>
    </div>
  )
}
