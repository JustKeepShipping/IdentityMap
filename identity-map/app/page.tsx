/**
 * Landing page for the Identity Map application.
 *
 * Provides an overview of the tool’s purpose and offers
 * navigation to join an existing session or manage sessions as a
 * facilitator. Copy emphasises consent and respect for
 * participants’ data.
 */
export default function Home() {
  return (
    <main style={{ padding: '1.5rem', maxWidth: '40rem', margin: '0 auto' }}>
      <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.75rem' }}>Identity Map</h1>
      <p style={{ marginBottom: '1rem', lineHeight: 1.5 }}>
        Identity Map helps groups gently explore the ways they see
        themselves—what’s given to us, what we choose, and what
        sits at our core. Compare your own self‑described tags and
        phrases to see who is most similar and most different, with
        respect and consent at the centre.
      </p>
      <p style={{ marginBottom: '1rem', lineHeight: 1.5 }}>
        You can join an existing session with a code provided by a
        facilitator. Facilitators can create and manage sessions in
        the admin area. Your participation is entirely optional:
        you choose what to share and whether others can see you.
      </p>
      <div style={{ display: 'flex', gap: '1rem' }}>
        <a
          href="/join"
          style={{
            backgroundColor: '#2563eb',
            color: 'white',
            padding: '0.5rem 1rem',
            borderRadius: '0.25rem',
            textDecoration: 'none',
          }}
        >
          Join a Session
        </a>
        <a
          href="/admin"
          style={{
            backgroundColor: '#4b5563',
            color: 'white',
            padding: '0.5rem 1rem',
            borderRadius: '0.25rem',
            textDecoration: 'none',
          }}
        >
          Session Admin
        </a>
      </div>
      <p style={{ marginTop: '1rem', fontSize: '0.875rem', color: '#6b7280' }}>
        By joining, you agree to share only what you enter. You can
        change your visibility at any time and delete your data when
        you’re done.
      </p>
    </main>
  );
}