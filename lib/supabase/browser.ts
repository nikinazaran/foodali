import { createBrowserClient } from "@supabase/ssr";

let browserClient: ReturnType<typeof createBrowserClient> | null = null;
let browserClientConfig: { supabaseUrl: string; supabaseAnonKey: string } | null = null;

type SupabaseBrowserClientConfig = {
  supabaseUrl?: string;
  supabaseAnonKey?: string;
};

export function getSupabaseBrowserClient(config: SupabaseBrowserClientConfig = {}) {
  const supabaseUrl = config.supabaseUrl ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = config.supabaseAnonKey ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  if (
    !browserClient ||
    browserClientConfig?.supabaseUrl !== supabaseUrl ||
    browserClientConfig?.supabaseAnonKey !== supabaseAnonKey
  ) {
    browserClient = createBrowserClient(supabaseUrl, supabaseAnonKey);
    browserClientConfig = { supabaseUrl, supabaseAnonKey };
  }

  return browserClient;
}
