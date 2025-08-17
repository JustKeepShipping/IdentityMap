import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/matches?scope=overall|given|chosen|core
 *
 * Placeholder endpoint to return top similar and different matches
 * for the requesting participant within their session. The `scope`
 * query parameter will determine which lens to use for ranking.
 * Currently this endpoint returns 501 Not Implemented.
 */
export async function GET(_request: NextRequest) {
  return NextResponse.json({ error: 'Not implemented' }, { status: 501 });
}