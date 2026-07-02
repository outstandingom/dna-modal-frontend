import {
  API_BASE_URL,
  AgentResponse,
  ConceptsResponse,
  GlobalContextResponse,
  PredictResponse,
  HealthResponse,
  SentenceResponse,
  SearchResponse,
  AddRelationshipResponse,
} from '../types/api';

const request = async <T>(path: string, options?: RequestInit): Promise<T> => {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`API Error ${res.status}: ${err}`);
  }
  return res.json();
};

export const api = {
  ping: () => request<{ message: string }>('/ping'),

  health: () => request<HealthResponse>('/health'),

  getConcepts: () => request<ConceptsResponse>('/concepts'),

  getGlobalContext: () => request<GlobalContextResponse>('/global-context'),

  predict: (concept: string) =>
    request<PredictResponse>(`/predict?concept=${encodeURIComponent(concept)}`),

  sendAgentMessage: (message: string, sessionId?: string) =>
    request<AgentResponse>('/agent', {
      method: 'POST',
      body: JSON.stringify({ message, session_id: sessionId }),
    }),


  generateSentence: (concept: string) =>
    request<SentenceResponse>('/sentence', {
      method: 'POST',
      body: JSON.stringify({ concept }),
    }),

  searchEssence: (query: string, top_k = 5) =>
    request<SearchResponse>('/search/essence', {
      method: 'POST',
      body: JSON.stringify({ query, top_k }),
    }),

  searchIdentity: (query: string, top_k = 5) =>
    request<SearchResponse>('/search/identity', {
      method: 'POST',
      body: JSON.stringify({ query, top_k }),
    }),

  addRelationship: (
    concept_a: string,
    concept_b: string,
    weight: number,
    color: string
  ) =>
    request<AddRelationshipResponse>('/relationships/add', {
      method: 'POST',
      body: JSON.stringify({ concept_a, concept_b, weight, color }),
    }),

  evaluate: (condition: object, action: string) =>
    request<object>('/evaluate', {
      method: 'POST',
      body: JSON.stringify({ condition, action }),
    }),
};
