export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://dna-modal.onrender.com';

export interface AgentResponse {
  response: string;
  tool_calls: { tool: string; result: string }[];
}

export interface Concept {
  name: string;
  domain?: string;
  importance?: number;
}

export interface ConceptsResponse {
  [key: string]: {
    domain: string;
    importance: number;
    physical_features: number[];
    semantic_features: number[];
  };
}

export interface GlobalContextResponse {
  total_concepts: number;
  total_relationships: number;
  global_centroid?: number[];
}

export interface PredictResponse {
  fuzzy_predictions: Record<string, number>;
}

export interface HealthResponse {
  status: string;
  concepts_loaded?: number;
}

export interface SentenceResponse {
  sentence: string;
}

export interface SearchResult {
  concept: string;
  score: number;
}

export interface SearchResponse {
  results: SearchResult[];
}

export interface AddRelationshipResponse {
  status: string;
  from: string;
  to: string;
  weight: number;
  color: string;
}

export interface GraphNode {
  id: string;
  domain: string;
  importance: number;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
}

export interface GraphLink {
  source: string | GraphNode;
  target: string | GraphNode;
  weight: number;
  color: string;
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}
