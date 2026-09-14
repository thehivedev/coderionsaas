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
