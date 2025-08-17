import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { generateSessionCode } from '@/lib/codeGenerator';

/**
 * POST /api/session
 *
 * Create a new session. The request body should contain `title`,
 * `facilitatorEmail` and an optional `expiresAt` ISO timestamp.
 * A unique join code between 6–8 characters will be generated and
 * returned along with the new session record.
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body || !body.title) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const { title, facilitatorEmail, expiresAt } = body as {
    title: string;
    facilitatorEmail?: string;
    expiresAt?: string;
  };

  // Generate a random code length between 6 and 8
  const length = 6 + Math.floor(Math.random() * 3);
  const code = generateSessionCode(length);

  const { data, error } = await supabase
    .from('sessions')
    .insert({
      code,
      title,
      facilitator_email: facilitatorEmail ?? null,
      expires_at: expiresAt ?? null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ session: data }, { status: 201 });
}