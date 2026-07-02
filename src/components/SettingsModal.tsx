import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

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

  const [selectedProvider, setSelectedProvider] = useState(localStorage.getItem('dna_llm_provider') || '');
  const [apiKey, setApiKey] = useState(localStorage.getItem('dna_llm_api_key') || '');
  const [model, setModel] = useState(localStorage.getItem('dna_llm_model') || '');
  const [baseUrl, setBaseUrl] = useState(localStorage.getItem('dna_llm_base_url') || '');

  useEffect(() => {
    // Fetch providers from backend if possible, else use fallback list
    fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://34.229.108.40:7860'}/providers`)
      .then(res => res.json())
      .then(data => {
        setProviders(data.providers || []);
        setLoading(false);
      })
      .catch(() => {
        // Fallback list
        setProviders([
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

    onClose();
  };

  const selectedProviderInfo = providers.find(p => p.id === selectedProvider);

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <h2>⚙️ AI Provider Settings</h2>
          <button onClick={onClose} style={styles.closeBtn}>✕</button>
        </div>
        
        <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
          Select an AI provider to power the Knowledge Graph's chat interface. Your API key is stored securely in your browser and never saved on our servers.
        </p>

        {loading ? (
          <p>Loading providers...</p>
        ) : (
          <div style={styles.form}>
            <div style={styles.field}>
              <label>Provider</label>
              <select value={selectedProvider} onChange={handleProviderChange} style={styles.input}>
                <option value="">Default (Server Configured)</option>
                {providers.map(p => (
                  <option key={p.id} value={p.id}>{p.name} {p.free_tier ? '🎁 (Free)' : ''}</option>
                ))}
              </select>
            </div>

            {selectedProvider && (
              <>
                <div style={styles.field}>
                  <label>
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
                    onChange={e => setApiKey(e.target.value)}
                    placeholder={`Enter your ${selectedProviderInfo?.name} API key`}
                    style={styles.input}
                  />
                </div>

                <div style={styles.field}>
                  <label>Model Name (Optional)</label>
                  <input 
                    type="text" 
                    value={model} 
                    onChange={e => setModel(e.target.value)}
                    placeholder={selectedProviderInfo?.default_model || "Leave blank for default"}
                    style={styles.input}
                  />
                </div>

                {selectedProviderInfo?.requires_base_url && (
                  <div style={styles.field}>
                    <label>Base URL</label>
                    <input 
                      type="text" 
                      value={baseUrl} 
                      onChange={e => setBaseUrl(e.target.value)}
                      placeholder="e.g. http://localhost:8000/v1"
                      style={styles.input}
                    />
                  </div>
                )}
              </>
            )}

            <div style={styles.actions}>
              <button onClick={onClose} style={styles.btnSecondary}>Cancel</button>
              <button onClick={handleSave} style={styles.btnPrimary}>Save Settings</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed' as const,
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    backdropFilter: 'blur(4px)',
  },
  modal: { backgroundColor: 'var(--surface)', borderRadius: '12px', padding: '24px', width: '95%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto' as const, boxShadow: '0 10px 25px rgba(0,0,0,0.5)', border: '1px solid var(--border)' },
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
    flexDirection: 'column' as const,
    gap: '16px',
  },
  field: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
  },
  input: {
    padding: '10px 12px',
    borderRadius: '6px',
    border: '1px solid var(--border)',
    backgroundColor: 'rgba(0,0,0,0.2)',
    color: 'var(--text)',
    fontSize: '14px',
    fontFamily: 'inherit',
  },
  link: {
    float: 'right' as const,
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
    color: 'var(--text)',
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
  }
};
