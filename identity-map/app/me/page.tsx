'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

type Lens = 'GIVEN' | 'CHOSEN' | 'CORE';

interface IdentityItem {
  id: string;
  lens: Lens;
  type: 'tag' | 'text';
  value: string;
  weight: number;
}

/**
 * My Identity page
 *
 * Provides forms for participants to add tags or text values under the
 * Given, Chosen, and Core lenses, assign weights (1–3), and delete
 * items. Data is persisted to Supabase via the identity_item table.
 *
 * Note: In Phase 2 we do not yet have authentication; instead,
 * participantId is loaded from localStorage. If none is found, a
 * random UUID will be used locally without persisting a participant
 * record. Later phases will replace this with a proper join flow.
 */
export default function MyIdentityPage() {
  const router = useRouter();
  const [participantId, setParticipantId] = useState<string | null>(null);
  const [items, setItems] = useState<IdentityItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Participant metadata (display name, visibility, consent) used for header controls
  const [participantInfo, setParticipantInfo] = useState<{
    display_name: string;
    is_visible: boolean;
    consent_given: boolean;
    session_id: string;
  } | null>(null);

  // Load participant and session ids from localStorage. Do not generate a random id here;
  // participants should be created via the join page. If no id is found, redirect to join.
  useEffect(() => {
    const pid = localStorage.getItem('participantId');
    const sid = localStorage.getItem('sessionId');
    if (!pid || !sid) {
      // No participant/session means user must join first
      router.push('/join');
      return;
    }
    setParticipantId(pid);
  }, [router]);

  // Fetch participant info (display name, visibility, consent) and identity items
  useEffect(() => {
    if (!participantId) return;
    const loadParticipantAndItems = async () => {
      setLoading(true);
      // Fetch participant info
      const { data: pData, error: pErr } = await supabase
        .from('participant')
        .select('display_name, is_visible, consent_given, session_id')
        .eq('id', participantId)
        .single();
      if (pErr || !pData) {
        setError(pErr?.message ?? 'Failed to load participant');
        setLoading(false);
        return;
      }
      // If the participant has not given consent, redirect them back to join
      if (!pData.consent_given) {
        router.push('/join');
        return;
      }
      setParticipantInfo({
        display_name: pData.display_name,
        is_visible: pData.is_visible,
        consent_given: pData.consent_given,
        session_id: pData.session_id,
      });
      // Load identity items
      const { data: itemsData, error: itemsErr } = await supabase
        .from('identity_item')
        .select('*')
        .eq('participant_id', participantId);
      if (itemsErr) {
        setError(itemsErr.message);
        setLoading(false);
        return;
      }
      setItems(
        (itemsData ?? []).map((d) => ({
          id: d.id,
          lens: d.lens as Lens,
          type: d.type as 'tag' | 'text',
          value: d.value,
          weight: d.weight,
        }))
      );
      setLoading(false);
    };
    loadParticipantAndItems();
  }, [participantId]);

  /**
   * Create a new identity item.
   */
  const addItem = async (lens: Lens, type: 'tag' | 'text', value: string) => {
    if (!participantId || !value.trim()) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('identity_item')
      .insert({
        participant_id: participantId,
        lens,
        type,
        value: value.trim(),
        weight: 1,
      })
      .select()
      .single();
    if (error) {
      setError(error.message);
    } else if (data) {
      setItems((prev) => [
        ...prev,
        {
          id: data.id,
          lens: data.lens as Lens,
          type: data.type as 'tag' | 'text',
          value: data.value,
          weight: data.weight,
        },
      ]);
    }
    setLoading(false);
  };

  /**
   * Update the weight of an identity item.
   */
  const updateWeight = async (id: string, newWeight: number) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, weight: newWeight } : item)));
    await supabase
      .from('identity_item')
      .update({ weight: newWeight })
      .eq('id', id);
  };

  /**
   * Delete an identity item.
   */
  const deleteItem = async (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
    await supabase.from('identity_item').delete().eq('id', id);
  };

  /**
   * Toggle visibility for the current participant. This updates the
   * participant record in Supabase and local state. Visibility
   * determines whether others can see you in People Map.
   */
  const toggleVisibility = async (newVisible: boolean) => {
    if (!participantId) return;
    // Optimistically update local state
    setParticipantInfo((prev) =>
      prev ? { ...prev, is_visible: newVisible } : prev
    );
    await supabase
      .from('participant')
      .update({ is_visible: newVisible })
      .eq('id', participantId);
  };

  /**
   * Delete the current participant and all their data. After
   * deletion, remove IDs from localStorage and redirect to join.
   */
  const deleteMyData = async () => {
    if (!participantId) return;
    // Delete participant; identity_item has ON DELETE CASCADE
    await supabase.from('participant').delete().eq('id', participantId);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('participantId');
      // Keep sessionId so user can rejoin quickly; but if leaving
      // session entirely, remove sessionId as well.
      // localStorage.removeItem('sessionId');
    }
    router.push('/join');
  };

  // Local form state for new values
  const [newValues, setNewValues] = useState<Record<Lens, { tag: string; text: string }>>({
    GIVEN: { tag: '', text: '' },
    CHOSEN: { tag: '', text: '' },
    CORE: { tag: '', text: '' },
  });

  const handleInputChange = (lens: Lens, type: 'tag' | 'text', value: string) => {
    setNewValues((prev) => ({ ...prev, [lens]: { ...prev[lens], [type]: value } }));
  };

  const handleAdd = (lens: Lens, type: 'tag' | 'text') => {
    const value = newValues[lens][type];
    addItem(lens, type, value);
    setNewValues((prev) => ({ ...prev, [lens]: { ...prev[lens], [type]: '' } }));
  };

  const renderLensSection = (lens: Lens) => {
    const lensItems = items.filter((item) => item.lens === lens);
    return (
      <section style={{ marginBottom: '1.5rem' }}>
        <h2
          style={{ fontSize: '1.25rem', fontWeight: 600, textTransform: 'capitalize', marginBottom: '0.5rem' }}
        >
          {`${lens.toLowerCase()} (${lensItems.length})`}
        </h2>
        <div style={{ marginBottom: '0.5rem' }}>
          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500 }}>Add tag</label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              type="text"
              style={{ border: '1px solid #d1d5db', borderRadius: '0.25rem', padding: '0.25rem 0.5rem', flex: 1 }}
              value={newValues[lens].tag}
              onChange={(e) => handleInputChange(lens, 'tag', e.target.value)}
            />
            <button
              style={{ backgroundColor: '#2563eb', color: 'white', padding: '0.25rem 0.75rem', borderRadius: '0.25rem' }}
              onClick={() => handleAdd(lens, 'tag')}
              disabled={loading || !newValues[lens].tag.trim()}
            >
              Add
            </button>
          </div>
        </div>
        <div style={{ marginBottom: '0.5rem' }}>
          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500 }}>Add text</label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              type="text"
              style={{ border: '1px solid #d1d5db', borderRadius: '0.25rem', padding: '0.25rem 0.5rem', flex: 1 }}
              value={newValues[lens].text}
              onChange={(e) => handleInputChange(lens, 'text', e.target.value)}
            />
            <button
              style={{ backgroundColor: '#2563eb', color: 'white', padding: '0.25rem 0.75rem', borderRadius: '0.25rem' }}
              onClick={() => handleAdd(lens, 'text')}
              disabled={loading || !newValues[lens].text.trim()}
            >
              Add
            </button>
          </div>
        </div>
        {lensItems.length === 0 ? (
          <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>No items added yet.</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {lensItems.map((item) => (
              <li
                key={item.id}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}
              >
                <span style={{ flex: 1 }}>
                  {item.type === 'tag' ? '#' : ''}
                  {item.value}
                </span>
                <input
                  type="range"
                  min={1}
                  max={3}
                  value={item.weight}
                  onChange={(e) => updateWeight(item.id, Number(e.target.value))}
                />
                <button
                  style={{ color: '#dc2626', border: 'none', background: 'none', cursor: 'pointer' }}
                  onClick={() => deleteItem(item.id)}
                  title="Delete"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    );
  };

  return (
    <main
      style={{ padding: '1.5rem', maxWidth: '40rem', marginLeft: 'auto', marginRight: 'auto' }}
    >
      <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>My Identity</h1>
      {error && (
        <p style={{ color: '#dc2626', marginBottom: '1rem' }}>Error: {error}</p>
      )}
      {/* Participant header with alias, visibility toggle and delete option */}
      {participantInfo && (
        <div style={{ marginBottom: '1rem' }}>
          <p style={{ fontSize: '0.875rem', fontWeight: 500 }}>Alias: {participantInfo.display_name}</p>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            <input
              type="checkbox"
              checked={participantInfo.is_visible}
              onChange={(e) => toggleVisibility(e.target.checked)}
            />
            Visible to others
          </label>
          <button
            onClick={deleteMyData}
            style={{
              marginTop: '0.5rem',
              padding: '0.25rem 0.75rem',
              backgroundColor: '#dc2626',
              color: 'white',
              borderRadius: '0.25rem',
              fontSize: '0.875rem',
            }}
          >
            Delete my data
          </button>
        </div>
      )}
      {renderLensSection('GIVEN')}
      {renderLensSection('CHOSEN')}
      {renderLensSection('CORE')}
    </main>
  );
}