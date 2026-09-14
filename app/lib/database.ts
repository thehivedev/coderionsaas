import { supabase } from './supabaseClient';
import type { Chat, ChatMessage, Profile } from './types';

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching profile:', error);
    return null;
  }

  return data as Profile | null;
}

export async function getChats(userId: string): Promise<Chat[]> {
  const { data, error } = await supabase
    .from('chats')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('Error fetching chats:', error);
    return [];
  }

  return (data || []) as Chat[];
}

export async function getChat(chatId: string): Promise<Chat | null> {
  const { data, error } = await supabase
    .from('chats')
    .select('*')
    .eq('id', chatId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching chat:', error);
    return null;
  }

  return data as Chat | null;
}

export async function createChat(userId: string): Promise<Chat | null> {
  const { data, error } = await supabase
    .from('chats')
    .insert({
      user_id: userId,
      title: 'Nuevo chat',
      messages: [],
    })
    .select()
    .maybeSingle();

  if (error) {
    console.error('Error creating chat:', error);
    return null;
  }

  return data as Chat | null;
}

export async function updateChatMessages(
  chatId: string,
  messages: ChatMessage[],
  title?: string
): Promise<boolean> {
  const updateData: Record<string, unknown> = {
    messages,
    updated_at: new Date().toISOString(),
  };

  if (title) {
    updateData.title = title;
  }

  const { error } = await supabase
    .from('chats')
    .update(updateData)
    .eq('id', chatId);

  if (error) {
    console.error('Error updating chat:', error);
    return false;
  }

  return true;
}

export async function deleteChat(chatId: string): Promise<boolean> {
  const { error } = await supabase
    .from('chats')
    .delete()
    .eq('id', chatId);

  if (error) {
    console.error('Error deleting chat:', error);
    return false;
  }

  return true;
}

export async function deductTokens(userId: string, amount: number): Promise<number | null> {
  const { data, error } = await supabase.rpc('deduct_tokens', {
    p_user_id: userId,
    p_amount: amount,
  });

  if (error) {
    console.error('Error deducting tokens:', error);
    return null;
  }

  return data as number;
}

export async function addTokens(userId: string, amount: number): Promise<number | null> {
  const { data, error } = await supabase.rpc('add_tokens', {
    p_user_id: userId,
    p_amount: amount,
  });

  if (error) {
    console.error('Error adding tokens:', error);
    return null;
  }

  return data as number;
}
