import { createSupabaseServiceClient } from './supabaseServer';

export async function getSetting(key: string): Promise<string | null> {
  const envValue = process.env[key.toUpperCase()] || process.env[key];
  console.log(`[settings] getSetting('${key}'): env value present=${!!envValue}, includes 'your-'=${envValue?.includes('your-')}`);
  if (envValue && envValue.trim() !== '' && !envValue.includes('your-')) {
    console.log(`[settings] Using env value for '${key}'`);
    return envValue;
  }

  try {
    const serviceClient = createSupabaseServiceClient();
    const { data, error } = await serviceClient
      .from('app_settings')
      .select('value')
      .eq('key', key)
      .maybeSingle();

    if (error) {
      console.error(`[settings] DB error for '${key}':`, error.message);
    }

    if (data?.value && data.value.trim() !== '') {
      console.log(`[settings] Using DB value for '${key}'`);
      return data.value;
    }
  } catch (err) {
    console.error(`[settings] Service client error for '${key}':`, err instanceof Error ? err.message : err);
  }

  console.log(`[settings] No value found for '${key}'`);
  return null;
}

export async function getSettings(keys: string[]): Promise<Record<string, string | null>> {
  const result: Record<string, string | null> = {};
  for (const key of keys) {
    result[key] = await getSetting(key);
  }
  return result;
}
