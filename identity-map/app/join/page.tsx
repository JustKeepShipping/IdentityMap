"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

/**
 * Join Session page
 *
 * Allows a participant to join an existing session by entering a
 * display name and join code, providing consent, and choosing
 * visibility. On success it creates a new participant record,
 * stores the participant and session IDs in localStorage, and
 * redirects to the My Identity page. Consent is required to
 * proceed.
 */
export default function JoinPage() {
  const [code, setCode] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isVisible, setIsVisible] = useState(false);
  const [consentGiven, setConsentGiven] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleJoin = async () => {
    if (loading) return;
    if (!consentGiven) {
      setError('You must agree to share what you enter to proceed.');
      return;
    }
    if (!displayName.trim() || !code.trim()) {
      setError('Please fill out your alias and session code.');
      return;
    }
    setError(null);
    setLoading(true);
    // Look up session by code
    const { data: session, error: sessionErr } = await supabase
      .from('sessions')
      .select('id')
      .eq('code', code.trim())
      .single();
    if (sessionErr || !session) {
      setError('Session not found. Please check your code.');
      setLoading(false);
      return;
    }
    // Insert participant record. We rely on public insert policy for now.
    const { data: participant, error: partErr } = await supabase
      .from('participant')
      .insert({
        session_id: session.id,
        display_name: displayName.trim(),
        is_visible: isVisible,
        consent_given: consentGiven,
      })
      .select()
      .single();
    if (partErr || !participant) {
      setError(partErr?.message ?? 'Failed to join the session.');
      setLoading(false);
      return;
    }
    // Persist IDs in localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('participantId', participant.id);
      localStorage.setItem('sessionId', session.id);
    }
    setLoading(false);
    router.push('/me');
  };

  return (
    <main style={{ padding: '1.5rem', maxWidth: '32rem', margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>Join Session</h1>
      <div style={{ marginBottom: '0.75rem' }}>
        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>
          Alias
        </label>
        <input
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          style={{ border: '1px solid #d1d5db', borderRadius: '0.25rem', padding: '0.5rem', width: '100%' }}
        />
      </div>
      <div style={{ marginBottom: '0.75rem' }}>
        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>
          Session code
        </label>
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          style={{ border: '1px solid #d1d5db', borderRadius: '0.25rem', padding: '0.5rem', width: '100%' }}
        />
      </div>
      <div style={{ marginBottom: '0.75rem' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <input
            type="checkbox"
            checked={isVisible}
            onChange={(e) => setIsVisible(e.target.checked)}
          />
          Be visible to others now
        </label>
      </div>
      <div style={{ marginBottom: '0.75rem' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <input
            type="checkbox"
            checked={consentGiven}
            onChange={(e) => setConsentGiven(e.target.checked)}
          />
          I agree to share only what I enter. I can delete my data anytime.
        </label>
      </div>
      {error && <p style={{ color: '#dc2626', marginBottom: '0.75rem' }}>{error}</p>}
      <button
        onClick={handleJoin}
        disabled={loading}
        style={{
          backgroundColor: '#2563eb',
          color: 'white',
          padding: '0.5rem 1rem',
          borderRadius: '0.25rem',
          cursor: 'pointer',
          width: '100%',
        }}
      >
        {loading ? 'Joining...' : 'Join Session'}
      </button>
    </main>
  );
}