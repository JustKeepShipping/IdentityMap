import { createClient } from '@supabase/supabase-js';

/**
 * Initialise a Supabase client using environment variables. The
 * `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` must
 * be set in your environment (e.g. in `.env.local`) for the client
 * to connect to your Supabase instance. See README for details.
 */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string | undefined;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string | undefined;

// Ensure the Supabase credentials are defined at runtime. Without these values the
// Supabase client will silently connect to `undefined` and all requests will fail.
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Supabase environment variables are missing. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your deployment.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);