import { createSupabaseServiceClient } from './supabaseServer';

export async function getSetting(key: string): Promise<string | null> {
  const envValue = process.env[key.toUpperCase()] || process.env[key];
  if (envValue && envValue.trim() !== '' && !envValue.includes('your-')) {
    return envValue;
  }

  try {
    const serviceClient = createSupabaseServiceClient();
    const { data } = await serviceClient
      .from('app_settings')
      .select('value')
      .eq('key', key)
      .maybeSingle();

    if (data?.value && data.value.trim() !== '') {
      return data.value;
    }
  } catch {
    // Service client might throw if key is not configured
  }

  return null;
}

export async function getSettings(keys: string[]): Promise<Record<string, string | null>> {
  const result: Record<string, string | null> = {};
  for (const key of keys) {
    result[key] = await getSetting(key);
  }
  return result;
}
