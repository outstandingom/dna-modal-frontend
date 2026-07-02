import { useState, useEffect, useCallback } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { supabase } from './lib/supabase'
import type { User } from '@supabase/supabase-js'
import { api } from './services/api'
import ChatMode from './components/ChatMode'
import ApiExplorer from './components/ApiExplorer'
import GraphMode from './components/GraphMode'
import Auth from './components/Auth'
import './index.css'
import SettingsModal from './components/SettingsModal'

type Tab = 'chat' | 'api' | 'graph'

// ── Protected Dashboard ───────────────────────────────────────
function Dashboard({ user }: { user: User }) {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<Tab>('chat')
  const [isOnline, setIsOnline] = useState(false)
  const [totalConcepts, setTotalConcepts] = useState(0)
  const [totalRelationships, setTotalRelationships] = useState(0)
  const [showSettings, setShowSettings] = useState(false)

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

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    navigate('/auth')
  }

  const avatarLetter = user.email?.[0].toUpperCase() ?? '?'
  const displayName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'User'

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
          <button className={`tab-btn ${activeTab === 'chat' ? 'active' : ''}`} onClick={() => setActiveTab('chat')}>🤖 Chat</button>
          <button className={`tab-btn ${activeTab === 'api' ? 'active' : ''}`} onClick={() => setActiveTab('api')}>🛠️ API Explorer</button>
          <button className={`tab-btn ${activeTab === 'graph' ? 'active' : ''}`} onClick={() => setActiveTab('graph')}>🕸️ Graph</button>
          <button 
            onClick={() => setShowSettings(true)} 
            className="tab-btn"
            style={{ color: '#06b6d4', fontWeight: 'bold' }}
            title="AI Settings"
          >
            ⚙️ AI Settings
          </button>
        </nav>

        <div className="topbar-status">
          <div className={`status-dot ${isOnline ? 'online' : 'offline'}`} />
          <span>{isOnline ? 'Live' : 'Offline'}</span>
          <div className="stat-chip">Nodes: <span>{totalConcepts}</span></div>
          <div className="stat-chip">Bonds: <span>{totalRelationships}</span></div>
          {/* User avatar + logout */}
          <div className="user-avatar" title={displayName}>{avatarLetter}</div>
          <button className="logout-btn" onClick={handleSignOut} title="Sign out">⏻</button>
        </div>
      </header>

      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}

      <main className="main-content">
        {activeTab === 'chat' && <ChatMode onGraphUpdate={fetchStats} userId={user.id} />}
        {activeTab === 'api' && <ApiExplorer />}
        {activeTab === 'graph' && <GraphMode />}
      </main>
    </div>
  )
}

// ── Auth Guard ────────────────────────────────────────────────
function AuthGuard() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return (
      <div className="auth-page">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, color: 'var(--text-muted)' }}>
          <div className="spinner" style={{ width: 40, height: 40, borderWidth: 3 }} />
          <p>Loading...</p>
        </div>
      </div>
    )
  }

  return user ? <Dashboard user={user} /> : <Navigate to="/auth" replace />
}

// ── Root App ──────────────────────────────────────────────────
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/auth" element={<Auth />} />
        <Route path="/*" element={<AuthGuard />} />
      </Routes>
    </BrowserRouter>
  )
}
