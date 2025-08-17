'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function JoinPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [consent, setConsent] = useState(false);
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState('');

  const handleJoin = async () => {
    if (!consent) {
      setError('You must agree to the consent.');
      return;
    }
    // Look up the session by code
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('id')
      .eq('code', code)
      .single();
    if (sessionError || !session) {
      setError('Invalid session code.');
      return;
    }
    // Insert participant
    const { data: participant, error: participantError } = await supabase
      .from('participant')
      .insert({
        display_name: name,
        session_id: session.id,
        consent_given: consent,
        is_visible: visible,
      })
      .select('id')
      .single();
    if (participantError || !participant) {
      setError('Error joining session.');
      return;
    }
    // Store IDs locally and navigate to /me
    localStorage.setItem('sessionId', session.id);
    localStorage.setItem('participantId', participant.id);
    router.push('/me');
  };

  return (
    <main className="flex flex-col items-center p-4">
      <h1>Join Session</h1>
      {error && <p className="text-red-500">{error}</p>}
      <label className="block mt-4">
        Display name
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="border p-2 rounded w-full"
        />
      </label>
      <label className="block mt-4">
        Session code
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          className="border p-2 rounded w-full"
        />
      </label>
      <label className="block mt-4">
        <input
          type="checkbox"
          checked={visible}
          onChange={(e) => setVisible(e.target.checked)}
        />{' '}
        Make me visible to others
      </label>
      <label className="block mt-4">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
        />{' '}
        I agree to share only what I enter. I can delete my data anytime.
      </label>
      <button
        onClick={handleJoin}
        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded"
      >
        Join
      </button>
    </main>
  );
}
