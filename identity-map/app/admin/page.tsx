"use client";
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { generateCode } from '@/lib/codeGenerator';

/**
 * Session Admin page
 *
 * Allows a facilitator to create new sessions and manage existing
 * sessions. Creating a session generates a unique join code. For
 * each session, the admin can view the current participant count
 * and end the session (set an expiry) immediately. In a production
 * deployment, access to this page should be restricted via
 * authentication; here it is publicly accessible for demo purposes.
 */
export default function AdminPage() {
  const [title, setTitle] = useState('');
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  /**
   * Load existing sessions from Supabase. For each session, fetch
   * the participant count separately. In a real app this could be
   * optimized with a view or RPC.
   */
  const loadSessions = async () => {
    const { data: sess, error } = await supabase
      .from('sessions')
      .select('id, code, title, expires_at, created_at')
      .order('created_at', { ascending: false });
    if (error || !sess) {
      return;
    }
    // Fetch participant counts in parallel
    const counts = await Promise.all(
      sess.map(async (s: any) => {
        const { count } = await supabase
          .from('participant')
          .select('*', { count: 'exact', head: true })
          .eq('session_id', s.id);
        return count ?? 0;
      }),
    );
    const withCounts = sess.map((s: any, idx: number) => ({ ...s, participantCount: counts[idx] }));
    setSessions(withCounts);
  };

  useEffect(() => {
    loadSessions();
  }, []);

  /**
   * Create a new session using the provided title. A 6–8 character
   * code is generated via generateCode(). On success, refresh the
   * list and display the join code.
   */
  const handleCreateSession = async () => {
    if (!title.trim()) return;
    setLoading(true);
    const code = generateCode();
    const { data, error } = await supabase
      .from('sessions')
      .insert({ code, title: title.trim() })
      .select()
      .single();
    if (error || !data) {
      setMessage(error?.message ?? 'Failed to create session');
      setLoading(false);
      return;
    }
    setMessage(`Created session with code: ${data.code}`);
    setTitle('');
    await loadSessions();
    setLoading(false);
  };

  /**
   * End a session immediately by setting its expires_at to now.
   */
  const endSession = async (id: string) => {
    await supabase
      .from('sessions')
      .update({ expires_at: new Date().toISOString() })
      .eq('id', id);
    await loadSessions();
  };

  return (
    <main style={{ padding: '1.5rem', maxWidth: '40rem', margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>Session Admin</h1>
      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>Create a new session</h2>
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Session title"
            style={{ flex: 1, border: '1px solid #d1d5db', borderRadius: '0.25rem', padding: '0.5rem' }}
          />
          <button
            onClick={handleCreateSession}
            disabled={loading}
            style={{ backgroundColor: '#2563eb', color: 'white', padding: '0.5rem 1rem', borderRadius: '0.25rem' }}
          >
            {loading ? 'Creating...' : 'Create'}
          </button>
        </div>
        {message && <p style={{ color: '#065f46', fontSize: '0.875rem' }}>{message}</p>}
      </section>
      <section>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>Active Sessions</h2>
        {sessions.length === 0 ? (
          <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>No sessions yet.</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {sessions.map((s) => (
              <li
                key={s.id}
                style={{ borderBottom: '1px solid #e5e7eb', padding: '0.5rem 0' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <p style={{ margin: 0, fontWeight: 500 }}>{s.title}</p>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: '#6b7280' }}>
                      Code: {s.code} · Participants: {s.participantCount}
                    </p>
                    {s.expires_at && (
                      <p style={{ margin: 0, fontSize: '0.75rem', color: '#dc2626' }}>
                        Ended at {new Date(s.expires_at).toLocaleString()}
                      </p>
                    )}
                  </div>
                  <div>
                    {!s.expires_at && (
                      <button
                        onClick={() => endSession(s.id)}
                        style={{
                          backgroundColor: '#dc2626',
                          color: 'white',
                          padding: '0.25rem 0.75rem',
                          borderRadius: '0.25rem',
                          fontSize: '0.875rem',
                        }}
                      >
                        End Session
                      </button>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}