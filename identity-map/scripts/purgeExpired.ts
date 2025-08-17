/**
 * Purge expired sessions and all related data.
 *
 * This script deletes any sessions whose expires_at is in the past
 * along with their participants and identity items (due to ON
 * DELETE CASCADE). It can be scheduled via cron or invoked
 * manually. To run it, set the SUPABASE_SERVICE_ROLE_KEY and
 * SUPABASE_URL environment variables. Example:
 *
 *   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key \
 *   SUPABASE_URL=https://abc.supabase.co \
 *   ts-node scripts/purgeExpired.ts
 */
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  console.error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
  process.exit(1);
}

const supabase = createClient(url, serviceRoleKey, {
  auth: {
    persistSession: false,
  },
});

async function purgeExpired() {
  const now = new Date().toISOString();
  const { error } = await supabase
    .from('sessions')
    .delete()
    .lte('expires_at', now);
  if (error) {
    console.error('Failed to purge expired sessions:', error.message);
  } else {
    console.log('Expired sessions purged');
  }
}

purgeExpired().then(() => process.exit());