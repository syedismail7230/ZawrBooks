import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://idklgeipzkfdsznpkikq.supabase.co';
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    'sb_publishable_wyZlBfoyaqNU15-iSZ_LPQ_YKStA9J3';

  return createBrowserClient(supabaseUrl, supabaseKey);
}
