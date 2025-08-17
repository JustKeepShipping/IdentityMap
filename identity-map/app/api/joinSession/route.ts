import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

/**
 * POST /api/joinSession
 *
 * Join an existing session by code. This endpoint accepts a JSON body
 * containing `displayName`, `sessionCode`, `isVisible` and
 * `consentGiven`. It validates that the session exists, that consent
 * is provided, inserts a new participant row and returns the
 * participant and session IDs. If any step fails, a 400 or 500
 * response is returned with an error message.
 */
export async function POST(request: NextRequest) {
  try {
    const { displayName, sessionCode, isVisible, consentGiven } = await request.json();

    // Basic validation of input
    if (!displayName || !sessionCode) {
      return NextResponse.json({ error: 'Missing displayName or sessionCode' }, { status: 400 });
    }
    if (!consentGiven) {
      return NextResponse.json({ error: 'Consent must be given to join a session' }, { status: 400 });
    }
    // Look up the session by its join code
    const { data: session, error: sessionErr } = await supabase
      .from('sessions')
      .select('id')
      .eq('code', String(sessionCode).trim())
      .single();
    if (sessionErr || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 400 });
    }
    // Insert a new participant record
    const { data: participant, error: partErr } = await supabase
      .from('participant')
      .insert({
        session_id: session.id,
        display_name: String(displayName).trim(),
        is_visible: !!isVisible,
        consent_given: !!consentGiven,
      })
      .select('id')
      .single();
    if (partErr || !participant) {
      return NextResponse.json({ error: partErr?.message ?? 'Failed to create participant' }, { status: 500 });
    }
    return NextResponse.json({ participantId: participant.id, sessionId: session.id }, { status: 201 });
  } catch (err) {
    console.error('Error in POST /api/joinSession:', err);
    return NextResponse.json({ error: 'Unexpected server error' }, { status: 500 });
  }
}

// For any non‑POST method, return Method Not Allowed
export function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}
export const PUT = GET;
export const DELETE = GET;