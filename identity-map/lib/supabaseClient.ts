import { createClient } from '@supabase/supabase-js';

/**
 * Initialise a Supabase client using environment variables. The
 * `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` must
 * be set in your environment (e.g. in `.env.local`) for the client
 * to connect to your Supabase instance. See README for details.
 */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);