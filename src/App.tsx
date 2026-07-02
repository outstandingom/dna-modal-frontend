import { useState, useEffect, useCallback } from 'react'
import { api } from './services/api'
import ChatMode from './components/ChatMode'
import ApiExplorer from './components/ApiExplorer'
import GraphMode from './components/GraphMode'
import './index.css'

type Tab = 'chat' | 'api' | 'graph'

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('chat')
  const [isOnline, setIsOnline] = useState(false)
  const [totalConcepts, setTotalConcepts] = useState(0)
  const [totalRelationships, setTotalRelationships] = useState(0)

  const fetchStats = useCallback(async () => {
    try {
      await api.ping()
      setIsOnline(true)
      const ctx = await api.getGlobalContext()
      setTotalConcepts(ctx.total_concepts ?? 0)
      setTotalRelationships(ctx.total_relationships ?? 0)
    } catch {
      setIsOnline(false)
    }
  }, [])

  useEffect(() => {
    fetchStats()
    const interval = setInterval(fetchStats, 10000)
    return () => clearInterval(interval)
  }, [fetchStats])

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-brand">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="3" fill="currentColor" />
            <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2z" stroke="url(#grad)" strokeWidth="1.5" fill="none" />
            <path d="M4 8h4M16 8h4M4 16h4M16 16h4" stroke="url(#grad2)" strokeWidth="1.5" strokeLinecap="round" />
            <defs>
              <linearGradient id="grad" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
                <stop stopColor="#6366f1" /><stop offset="1" stopColor="#06b6d4" />
              </linearGradient>
              <linearGradient id="grad2" x1="4" y1="12" x2="20" y2="12" gradientUnits="userSpaceOnUse">
                <stop stopColor="#6366f1" /><stop offset="1" stopColor="#06b6d4" />
              </linearGradient>
            </defs>
          </svg>
          DNA Knowledge Graph
        </div>

        <nav className="topbar-tabs">
          <button className={`tab-btn ${activeTab === 'chat' ? 'active' : ''}`} onClick={() => setActiveTab('chat')}>
            🤖 Chat
          </button>
          <button className={`tab-btn ${activeTab === 'api' ? 'active' : ''}`} onClick={() => setActiveTab('api')}>
            🛠️ API Explorer
          </button>
          <button className={`tab-btn ${activeTab === 'graph' ? 'active' : ''}`} onClick={() => setActiveTab('graph')}>
            🕸️ Graph
          </button>
        </nav>

        <div className="topbar-status">
          <div className={`status-dot ${isOnline ? 'online' : 'offline'}`} />
          <span>{isOnline ? 'Live' : 'Offline'}</span>
          <div className="stat-chip">Nodes: <span>{totalConcepts}</span></div>
          <div className="stat-chip">Bonds: <span>{totalRelationships}</span></div>
        </div>
      </header>

      <main className="main-content">
        {activeTab === 'chat' && <ChatMode onGraphUpdate={fetchStats} />}
        {activeTab === 'api' && <ApiExplorer />}
        {activeTab === 'graph' && <GraphMode />}
      </main>
    </div>
  )
}
