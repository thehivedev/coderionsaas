import { createServerClient } from '@supabase/ssr';
import { parse, serialize } from 'cookie';

const supabaseUrl = 'https://wscqlfgbloxmtwwmqokm.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndzY3FsZmdibG94bXR3d21xb2ttIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkyMzUxNjcsImV4cCI6MjEwNDgxMTE2N30.HyRLZHTqNBfFvZiMUnM3m8zTSdpTKDGgWmdjZjYU4nI';

export function createSupabaseServerClient(request: Request) {
  const cookies = parse(request.headers.get('Cookie') ?? '');

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(key: string) {
        return cookies[key];
      },
      set(key: string, value: string, options: any) {
        // This is handled by the response headers in Remix
      },
      remove(key: string, options: any) {
        // This is handled by the response headers in Remix
      },
    },
  });
}
