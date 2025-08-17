import { supabase } from '../lib/supabaseClient';
import { generateSessionCode } from '../lib/codeGenerator';

/**
 * Seed script for populating the database with a sample session. To run
 * this, ensure your environment variables point to a valid Supabase
 * instance and run `npm run seed`. The script will create a single
 * session with a future expiry date. Extend this script to add
 * participants and identity items as needed.
 */
async function main() {
  // Generate a 7‑character code for the demo session
  const code = generateSessionCode(7);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const { data: session, error: sessionError } = await supabase
    .from('sessions')
    .insert({
      code,
      title: 'Demo Session',
      facilitator_email: 'facilitator@example.com',
      expires_at: expiresAt.toISOString(),
    })
    .select()
    .single();

  if (sessionError || !session) {
    console.error('Failed to create session:', sessionError?.message);
    return;
  }

  console.log('Created session:', session);

  // Insert three sample participants
  const participants = [
    { display_name: 'Alice', is_visible: true, consent_given: true },
    { display_name: 'Bob', is_visible: true, consent_given: true },
    { display_name: 'Charlie', is_visible: false, consent_given: true },
  ];
  const { data: insertedParticipants, error: participantErr } = await supabase
    .from('participant')
    .insert(
      participants.map((p) => ({
        session_id: session.id,
        display_name: p.display_name,
        is_visible: p.is_visible,
        consent_given: p.consent_given,
      }))
    )
    .select();

  if (participantErr || !insertedParticipants) {
    console.error('Failed to insert participants:', participantErr?.message);
    return;
  }
  console.log('Inserted participants:', insertedParticipants.map((p: any) => p.display_name));

  // Insert identity items for each participant
  const items: any[] = [];
  insertedParticipants.forEach((p: any, idx: number) => {
    // Basic sample data: each participant gets one item per lens
    const names = ['Alice', 'Bob', 'Charlie'];
    const base = names[idx];
    items.push(
      {
        participant_id: p.id,
        lens: 'GIVEN',
        type: 'tag',
        value: idx === 0 ? 'female' : idx === 1 ? 'male' : 'nonbinary',
        weight: 2,
      },
      {
        participant_id: p.id,
        lens: 'CHOSEN',
        type: 'text',
        value: `${base} loves hiking`,
        weight: 1,
      },
      {
        participant_id: p.id,
        lens: 'CORE',
        type: 'tag',
        value: idx === 0 ? 'introvert' : idx === 1 ? 'extrovert' : 'ambivert',
        weight: 3,
      }
    );
  });
  const { error: itemsErr } = await supabase.from('identity_item').insert(items);
  if (itemsErr) {
    console.error('Failed to insert identity items:', itemsErr.message);
    return;
  }
  console.log('Inserted identity items');
}

main().then(() => {
  console.log('Seed complete');
});