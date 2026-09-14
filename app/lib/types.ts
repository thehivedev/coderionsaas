export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  token_balance: number;
  preferred_model_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: string;
}

export interface Chat {
  id: string;
  user_id: string;
  title: string;
  messages: ChatMessage[];
  model: string | null;
  created_at: string;
  updated_at: string;
}

export interface AIModel {
  id: string;
  name: string;
  provider: string;
  model_id: string;
  input_price_per_token: number;
  output_price_per_token: number;
  markup_multiplier: number;
  token_cost_multiplier: number;
  is_active: boolean;
  sort_order: number;
  badge: string | null;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  user_id: string;
  title: string;
  model_id: string | null;
  status: 'active' | 'archived';
  messages: ChatMessage[];
  created_at: string;
  updated_at: string;
}

export interface ProjectFile {
  id: string;
  project_id: string;
  path: string;
  content: string;
  language: string | null;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface ParsedFile {
  path: string;
  content: string;
  language: string;
}

export interface GitHubConnection {
  id: string;
  user_id: string;
  github_username: string;
  github_access_token: string;
  github_avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  html_url: string;
  clone_url: string;
  default_branch: string;
  private: boolean;
  description: string | null;
  updated_at: string;
}

export interface GitHubTreeItem {
  path: string;
  mode: '100644' | '100755' | '040000';
  type: 'blob' | 'tree';
  sha?: string;
  content?: string;
}
