'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function JoinPage() {
  // state hooks omitted for brevity…

  const handleJoin = async () => {
    // look up the session by code, insert the participant,
    // store IDs in localStorage, and navigate to /me…
  };

  return (
    <main>
      {/* form fields for alias, code, visibility toggle, consent checkbox */}
    </main>
  );
}