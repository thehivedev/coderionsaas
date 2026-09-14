export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  token_balance: number;
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
