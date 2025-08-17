import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/join
 *
 * Stub endpoint for participants to join an existing session. In
 * future phases this will validate the session code, record
 * consent/visibility, and create a participant record. Currently it
 * returns a 501 Not Implemented status.
 */
export async function POST(_request: NextRequest) {
  return NextResponse.json({ error: 'Not implemented' }, { status: 501 });
}