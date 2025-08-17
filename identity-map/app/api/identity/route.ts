import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/identity
 *
 * Placeholder for creating or updating identity items for a
 * participant. In later phases this will persist tags and text items
 * per lens along with their weights. For now it returns 501.
 */
export async function POST(_request: NextRequest) {
  return NextResponse.json({ error: 'Not implemented' }, { status: 501 });
}

/**
 * DELETE /api/identity
 *
 * Placeholder for deleting a participant’s identity data. Later
 * phases will enforce RLS and cascade deletions. Returns 501.
 */
export async function DELETE(_request: NextRequest) {
  return NextResponse.json({ error: 'Not implemented' }, { status: 501 });
}