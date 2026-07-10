import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../types/api';

interface SettingsModalProps {
  onClose: () => void;
}

interface Provider {
  id: string;
  name: string;
  default_model: string;
  free_tier: boolean;
  get_key_url: string;
  requires_base_url: boolean;
}

export default function SettingsModal({ onClose }: SettingsModalProps) {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);

  const [selectedProvider, setSelectedProvider] = useState(localStorage.getItem('dna_llm_provider') || '');
  const [apiKey, setApiKey] = useState(localStorage.getItem('dna_llm_api_key') || '');
  const [model, setModel] = useState(localStorage.getItem('dna_llm_model') || '');
  const [baseUrl, setBaseUrl] = useState(localStorage.getItem('dna_llm_base_url') || '');

  useEffect(() => {
    // Fetch providers from the Render backend
    fetch(`${API_BASE_URL}/providers`)
      .then(res => res.json())
      .then(data => {
        setProviders(data.providers || []);
        setLoading(false);
      })
      .catch(() => {
        // Fallback list if backend /providers endpoint is unreachable
        // NOTE: AWS EC2 URL removed — was: http://ec2-13-217-0-95.compute-1.amazonaws.com:7860/providers
        setProviders([
          { id: 'local_graph', name: 'Independent Graph Mode (No LLM)', default_model: 'native-12-dim-vectors', free_tier: true, get_key_url: '', requires_base_url: false },
          { id: 'groq', name: 'Groq', default_model: 'llama-3.3-70b-versatile', free_tier: true, get_key_url: 'https://console.groq.com/keys', requires_base_url: false },
          { id: 'gemini', name: 'Google Gemini', default_model: 'gemini-2.0-flash', free_tier: true, get_key_url: 'https://aistudio.google.com/apikey', requires_base_url: false },
          { id: 'openai', name: 'OpenAI', default_model: 'gpt-4o-mini', free_tier: false, get_key_url: 'https://platform.openai.com/api-keys', requires_base_url: false },
          { id: 'huggingface', name: 'Hugging Face', default_model: 'Qwen/Qwen2.5-72B-Instruct', free_tier: true, get_key_url: 'https://huggingface.co/settings/tokens', requires_base_url: false },
          { id: 'deepseek', name: 'DeepSeek', default_model: 'deepseek-chat', free_tier: true, get_key_url: 'https://platform.deepseek.com/api_keys', requires_base_url: false },
          { id: 'custom', name: 'Custom / Self-Hosted', default_model: '', free_tier: false, get_key_url: '', requires_base_url: true }
        ]);
        setLoading(false);
      });
  }, []);

  const handleProviderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newProviderId = e.target.value;
    setSelectedProvider(newProviderId);
    setSaved(false);
    
    if (newProviderId && newProviderId !== 'custom') {
      const p = providers.find(p => p.id === newProviderId);
      if (p) setModel(p.default_model);
    }
  };

  const handleSave = () => {
    if (selectedProvider) localStorage.setItem('dna_llm_provider', selectedProvider);
    else localStorage.removeItem('dna_llm_provider');

    if (apiKey) localStorage.setItem('dna_llm_api_key', apiKey);
    else localStorage.removeItem('dna_llm_api_key');

    if (model) localStorage.setItem('dna_llm_model', model);
    else localStorage.removeItem('dna_llm_model');

    if (baseUrl) localStorage.setItem('dna_llm_base_url', baseUrl);
    else localStorage.removeItem('dna_llm_base_url');

    setSaved(true);
    setTimeout(() => onClose(), 800);
  };

  const selectedProviderInfo = providers.find(p => p.id === selectedProvider);
  const needsApiKey = selectedProvider && selectedProvider !== 'local_graph';

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <h2>⚙️ AI Provider Settings</h2>
          <button onClick={onClose} style={styles.closeBtn}>✕</button>
        </div>
        
        <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
          Select an AI provider to power the Knowledge Graph's chat interface. Your API key is stored securely in your browser and sent per-request to the DNA backend.
        </p>

        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)' }}>
            <div className="spinner" style={{ width: 18, height: 18 }} />
            Loading providers...
          </div>
        ) : (
          <div style={styles.form}>
            <div style={styles.field}>
              <label style={styles.label}>Provider</label>
              <select value={selectedProvider} onChange={handleProviderChange} style={styles.input}>
                <option value="">— Select a Provider —</option>
                {providers.map(p => (
                  <option key={p.id} value={p.id}>{p.name} {p.free_tier ? '🎁 (Free)' : ''}</option>
                ))}
              </select>
            </div>

            {needsApiKey && (
              <>
                <div style={styles.field}>
                  <label style={styles.label}>
                    API Key
                    {selectedProviderInfo?.get_key_url && (
                      <a href={selectedProviderInfo.get_key_url} target="_blank" rel="noreferrer" style={styles.link}>
                        Get a free key ↗
                      </a>
                    )}
                  </label>
                  <input 
                    type="password" 
                    value={apiKey} 
                    onChange={e => { setApiKey(e.target.value); setSaved(false); }}
                    placeholder={`Enter your ${selectedProviderInfo?.name || ''} API key`}
                    style={styles.input}
                  />
                  {apiKey && (
                    <span style={{ fontSize: '0.75rem', color: 'var(--success)' }}>
                      ✓ Key entered ({apiKey.slice(0, 6)}...{apiKey.slice(-4)})
                    </span>
                  )}
                </div>

                <div style={styles.field}>
                  <label style={styles.label}>Model Name (Optional)</label>
                  <input 
                    type="text" 
                    value={model} 
                    onChange={e => { setModel(e.target.value); setSaved(false); }}
                    placeholder={selectedProviderInfo?.default_model || "Leave blank for default"}
                    style={styles.input}
                  />
                </div>

                {selectedProviderInfo?.requires_base_url && (
                  <div style={styles.field}>
                    <label style={styles.label}>Base URL</label>
                    <input 
                      type="text" 
                      value={baseUrl} 
                      onChange={e => { setBaseUrl(e.target.value); setSaved(false); }}
                      placeholder="e.g. http://localhost:8000/v1"
                      style={styles.input}
                    />
                  </div>
                )}
              </>
            )}

            {selectedProvider === 'local_graph' && (
              <div style={{ padding: '12px', borderRadius: '8px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', fontSize: '0.85rem', color: 'var(--success)' }}>
                🧬 Independent Graph Mode — No API key needed. The DNA Knowledge Graph will work using its own 12-dimensional vector engine without any LLM.
              </div>
            )}

            <div style={styles.actions}>
              <button onClick={onClose} style={styles.btnSecondary}>Cancel</button>
              <button onClick={handleSave} style={{
                ...styles.btnPrimary,
                ...(saved ? { background: 'var(--success)' } : {})
              }}>
                {saved ? '✓ Saved!' : 'Save Settings'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    backdropFilter: 'blur(4px)',
  },
  modal: { backgroundColor: 'var(--surface, #111827)', borderRadius: '12px', padding: '24px', width: '95%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 10px 25px rgba(0,0,0,0.5)', border: '1px solid var(--border)' },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--text-muted)',
    fontSize: '20px',
    cursor: 'pointer',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  label: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '0.85rem',
    fontWeight: 500,
    color: 'var(--text-secondary)',
  },
  input: {
    padding: '10px 12px',
    borderRadius: '6px',
    border: '1px solid var(--border)',
    backgroundColor: 'rgba(0,0,0,0.2)',
    color: 'var(--text-primary, #f1f5f9)',
    fontSize: '14px',
    fontFamily: 'inherit',
  },
  link: {
    color: '#6366f1',
    textDecoration: 'none',
    fontSize: '12px',
  },
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    marginTop: '16px',
  },
  btnSecondary: {
    padding: '8px 16px',
    borderRadius: '6px',
    background: 'transparent',
    border: '1px solid var(--border)',
    color: 'var(--text-primary, #f1f5f9)',
    cursor: 'pointer',
  },
  btnPrimary: {
    padding: '8px 16px',
    borderRadius: '6px',
    background: '#6366f1',
    border: 'none',
    color: '#fff',
    cursor: 'pointer',
    fontWeight: 'bold',
    transition: 'all 0.2s',
  },
};
