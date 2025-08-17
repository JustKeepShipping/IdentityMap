 'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { computeSimilarity, Identity, Lens } from '@/lib/similarity';

interface ParticipantInfo {
  id: string;
  display_name: string;
}

interface MatchResult {
  participant: ParticipantInfo;
  score: number | null;
}

/**
 * People Map page
 *
 * Displays all visible participants in the current session along with
 * their overall similarity to the current participant. Also shows
 * Top 3 similar and Top 3 different matches. This implementation
 * computes similarity client‑side for simplicity; later phases may
 * move this to a server route or edge function.
 */
export default function MapPage() {
  const [participantId, setParticipantId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [participants, setParticipants] = useState<ParticipantInfo[]>([]);
  // Similarities keyed by participant id. Each entry holds the overall
  // score and per‑lens scores. A lens score is null when both
  // participants have no data for that lens.
  const [similarities, setSimilarities] = useState<
    Record<string, { overall: number; GIVEN: number | null; CHOSEN: number | null; CORE: number | null }>
  >({});
  const [topSimilar, setTopSimilar] = useState<MatchResult[]>([]);
  const [topDifferent, setTopDifferent] = useState<MatchResult[]>([]);
  // Selected scope for ranking. 'overall' uses the weighted blend.
  // Initialise from localStorage so the choice persists across reloads.
  const [scope, setScopeState] = useState<'overall' | 'GIVEN' | 'CHOSEN' | 'CORE'>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('selectedScope');
      if (stored === 'GIVEN' || stored === 'CHOSEN' || stored === 'CORE' || stored === 'overall') {
        return stored as any;
      }
    }
    return 'overall';
  });

  /**
   * Wrapper around state setter to persist the selected scope. When
   * the scope changes, save it into localStorage so it remains
   * selected on future page loads. This is a small but scalable
   * improvement because it does not require database writes and
   * leverages the browser’s storage for per-user preferences.
   */
  const setScope = (newScope: 'overall' | 'GIVEN' | 'CHOSEN' | 'CORE') => {
    setScopeState(newScope);
    if (typeof window !== 'undefined') {
      localStorage.setItem('selectedScope', newScope);
    }
  };
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Track whether the current participant has at least one item per lens
  const [hasMyItems, setHasMyItems] = useState<{ GIVEN: boolean; CHOSEN: boolean; CORE: boolean }>({
    GIVEN: false,
    CHOSEN: false,
    CORE: false,
  });

  // Load participant and session IDs from localStorage
  useEffect(() => {
    const pid = localStorage.getItem('participantId');
    const sid = localStorage.getItem('sessionId');
    if (pid) setParticipantId(pid);
    if (sid) setSessionId(sid);
  }, []);

  useEffect(() => {
    if (!participantId || !sessionId) return;
    const load = async () => {
      setLoading(true);
      setError(null);
      // Fetch visible participants in the same session
      const { data: participantRows, error: partErr } = await supabase
        .from('participant')
        .select('id, display_name')
        .eq('session_id', sessionId)
        .eq('is_visible', true);
      if (partErr || !participantRows) {
        setError(partErr?.message ?? 'Failed to fetch participants');
        setLoading(false);
        return;
      }
      setParticipants(participantRows);
      // Fetch identity items for these participants
      const ids = participantRows.map((p) => p.id);
      // Always include the current participant even if invisible (for computing my identity)
      if (!ids.includes(participantId)) ids.push(participantId);
      const { data: items, error: itemsErr } = await supabase
        .from('identity_item')
        .select('*')
        .in('participant_id', ids);
      if (itemsErr || !items) {
        setError(itemsErr?.message ?? 'Failed to fetch identity items');
        setLoading(false);
        return;
      }
      // Build identity map keyed by participant id
      const identities: Record<string, Identity> = {};
      ids.forEach((id) => {
        identities[id] = {
          tags: { GIVEN: [], CHOSEN: [], CORE: [] },
          texts: { GIVEN: [], CHOSEN: [], CORE: [] },
        };
      });
      items.forEach((item: any) => {
        const lens = item.lens as Lens;
        if (item.type === 'tag') {
          identities[item.participant_id].tags[lens].push({ value: item.value, weight: item.weight });
        } else {
          identities[item.participant_id].texts[lens].push(item.value);
        }
      });
      const myIdentity = identities[participantId];
      if (!myIdentity) {
        setError('Current participant has no identity');
        setLoading(false);
        return;
      }
      // Determine whether the current participant has items per lens
      const myHas: { GIVEN: boolean; CHOSEN: boolean; CORE: boolean } = { GIVEN: false, CHOSEN: false, CORE: false };
      (['GIVEN', 'CHOSEN', 'CORE'] as Lens[]).forEach((lens) => {
        myHas[lens] =
          (myIdentity.tags[lens] && myIdentity.tags[lens].length > 0) ||
          (myIdentity.texts[lens] && myIdentity.texts[lens].length > 0);
      });
      setHasMyItems(myHas);
      // Compute similarity against each other participant and gather lens scores
      const simMap: Record<string, { overall: number; GIVEN: number | null; CHOSEN: number | null; CORE: number | null }> = {};
      const matchList: { participant: ParticipantInfo; score: number | null }[] = [];
      participantRows.forEach((p) => {
        if (p.id === participantId) return;
        const other = identities[p.id];
        const { scores, scoreOverall } = computeSimilarity(myIdentity, other);
        // Determine if each lens has data (either participant has items)
        const lensScores: { GIVEN: number | null; CHOSEN: number | null; CORE: number | null } = {
          GIVEN: null,
          CHOSEN: null,
          CORE: null,
        };
        (['GIVEN', 'CHOSEN', 'CORE'] as Lens[]).forEach((lens) => {
          const aHasItems =
            (myIdentity.tags[lens] && myIdentity.tags[lens].length > 0) ||
            (myIdentity.texts[lens] && myIdentity.texts[lens].length > 0);
          const bHasItems =
            (other.tags[lens] && other.tags[lens].length > 0) ||
            (other.texts[lens] && other.texts[lens].length > 0);
          if (aHasItems || bHasItems) {
            lensScores[lens] = scores[lens];
          } else {
            lensScores[lens] = null;
          }
        });
        simMap[p.id] = { overall: scoreOverall, ...lensScores };
        // Determine score for current scope
        const selectedScore =
          scope === 'overall'
            ? scoreOverall
            : lensScores[scope as Lens];
        matchList.push({ participant: p, score: selectedScore });
      });
      setSimilarities(simMap);
      // Compute matches based on selected scope
      updateMatches(matchList);
      setLoading(false);
    };
    load();
  }, [participantId, sessionId, scope]);

  /**
   * Update top similar and top different lists based on the current
   * scope. Entries with `null` scores are excluded. Called after
   * similarities are recomputed or when the scope changes.
   */
  function updateMatches(list: { participant: ParticipantInfo; score: number | null }[]) {
    const valid = list.filter((m) => m.score !== null) as { participant: ParticipantInfo; score: number }[];
    // Sort descending for most similar
    const sortedDesc = [...valid].sort((a, b) => b.score - a.score);
    setTopSimilar(sortedDesc.slice(0, 3));
    // Sort ascending for most different
    const sortedAsc = [...valid].sort((a, b) => a.score - b.score);
    setTopDifferent(sortedAsc.slice(0, 3));
  }

  if (!participantId || !sessionId) {
    return (
      <main style={{ padding: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>People Map</h1>
        <p>Please join a session first.</p>
      </main>
    );
  }

  return (
    <main style={{ padding: '1.5rem' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>People Map</h1>
      {/* Scope selector chips */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        {['overall', 'GIVEN', 'CHOSEN', 'CORE'].map((opt) => (
          <button
            key={opt}
            onClick={() => setScope(opt as any)}
            style={{
              padding: '0.25rem 0.75rem',
              borderRadius: '9999px',
              border: '1px solid #d1d5db',
              backgroundColor: scope === opt ? '#2563eb' : '#ffffff',
              color: scope === opt ? '#ffffff' : '#374151',
              cursor: 'pointer',
              fontSize: '0.875rem',
            }}
          >
            {opt === 'overall' ? 'Overall' : opt.charAt(0) + opt.slice(1).toLowerCase()}
          </button>
        ))}
      </div>
      {error && <p style={{ color: '#dc2626' }}>Error: {error}</p>}
      {loading ? (
        <p>Loading...</p>
      ) : (
        <>
          {/* Empty-lens notice */}
          {scope !== 'overall' && !hasMyItems[scope as Lens] && (
            <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '1rem' }}>
              Add at least one item in this lens to see lens‑specific matches.
            </p>
          )}
          {/* Top similar */}
          <section style={{ marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>Top 3 Similar</h2>
            {topSimilar.length === 0 ? (
              <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>Not enough data.</p>
            ) : (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {topSimilar.map(({ participant, score }) => (
                  <li key={participant.id} style={{ marginBottom: '0.25rem' }}>
                    {participant.display_name} — {Math.round((score ?? 0) * 100)}%
                  </li>
                ))}
              </ul>
            )}
          </section>
          {/* Top different */}
          <section style={{ marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>Top 3 Different</h2>
            {topDifferent.length === 0 ? (
              <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>Not enough data.</p>
            ) : (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {topDifferent.map(({ participant, score }) => (
                  <li key={participant.id} style={{ marginBottom: '0.25rem' }}>
                    {participant.display_name} — {Math.round((1 - (score ?? 0)) * 100)}% different
                  </li>
                ))}
              </ul>
            )}
          </section>
          {/* People list */}
          <section>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>All Participants</h2>
            {participants.length === 0 ? (
              <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>No visible participants yet.</p>
            ) : (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {participants.map((p) => (
                  <li
                    key={p.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '0.5rem 0',
                      borderBottom: '1px solid #e5e7eb',
                    }}
                  >
                    <span>{p.id === participantId ? `${p.display_name} (you)` : p.display_name}</span>
                    {p.id !== participantId && (
                      <span
                        style={{
                          backgroundColor: '#e5e7eb',
                          padding: '0.125rem 0.5rem',
                          borderRadius: '0.25rem',
                          fontSize: '0.875rem',
                        }}
                      >
                        {(() => {
                          const sim = similarities[p.id];
                          if (!sim) return '--';
                          const val = scope === 'overall' ? sim.overall : (sim[scope as Lens] as number | null);
                          return val === null ? '--' : `${Math.round(val * 100)}%`;
                        })()}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </main>
  );
}