import { supabase } from './supabaseClient';
import type { Chat, Profile, Project, ProjectFile, GitHubConnection } from './types';

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
      title: 'New chat',
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

export async function getProjects(userId: string): Promise<Project[]> {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('Error fetching projects:', error);
    return [];
  }

  return (data || []) as Project[];
}

export async function getProject(projectId: string): Promise<Project | null> {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching project:', error);
    return null;
  }

  return data as Project | null;
}

export async function createProject(userId: string): Promise<Project | null> {
  const { data, error } = await supabase
    .from('projects')
    .insert({
      user_id: userId,
      title: 'New project',
      messages: [],
    })
    .select()
    .maybeSingle();

  if (error) {
    console.error('Error creating project:', error);
    return null;
  }

  return data as Project | null;
}

export async function deleteProject(projectId: string): Promise<boolean> {
  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', projectId);

  if (error) {
    console.error('Error deleting project:', error);
    return false;
  }

  return true;
}

export async function getProjectFiles(projectId: string): Promise<ProjectFile[]> {
  const { data, error } = await supabase
    .from('project_files')
    .select('*')
    .eq('project_id', projectId)
    .order('path', { ascending: true });

  if (error) {
    console.error('Error fetching project files:', error);
    return [];
  }

  return (data || []) as ProjectFile[];
}

export async function deleteProjectFile(fileId: string): Promise<boolean> {
  const { error } = await supabase
    .from('project_files')
    .delete()
    .eq('id', fileId);

  if (error) {
    console.error('Error deleting project file:', error);
    return false;
  }

  return true;
}

export async function getGitHubConnection(userId: string): Promise<GitHubConnection | null> {
  const { data, error } = await supabase
    .from('github_connections')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching GitHub connection:', error);
    return null;
  }

  return data as GitHubConnection | null;
}

export async function deleteGitHubConnection(userId: string): Promise<boolean> {
  const { error } = await supabase
    .from('github_connections')
    .delete()
    .eq('user_id', userId);

  if (error) {
    console.error('Error deleting GitHub connection:', error);
    return false;
  }

  return true;
}
