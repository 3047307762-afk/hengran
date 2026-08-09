import { createClient } from "@supabase/supabase-js";

export function hasSupabaseConfig(config) {
  return Boolean(config?.url && config?.anonKey);
}

export function createBrowserSupabase(config) {
  if (!hasSupabaseConfig(config)) return null;
  return createClient(config.url, config.anonKey);
}
