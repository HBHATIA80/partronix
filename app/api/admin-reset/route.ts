import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Uses the service-role key — only ever referenced here, server-side.
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export async function POST(req: NextRequest) {
  const { adminAccessToken, userId, newPassword } = await req.json();
  if (!adminAccessToken || !userId || !newPassword) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  // Verify the caller is a signed-in, approved admin before doing anything.
  const { data: caller } = await admin.auth.getUser(adminAccessToken);
  if (!caller.user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { data: adminRow } = await admin.from('admins').select('status').eq('id', caller.user.id).single();
  if (adminRow?.status !== 'approved') return NextResponse.json({ error: 'Not an approved admin' }, { status: 403 });

  const { error } = await admin.auth.admin.updateUserById(userId, { password: newPassword });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await admin.from('profiles').update({ status: 'active' }).eq('id', userId);
  await admin.from('reset_requests').update({ status: 'completed' }).eq('user_id', userId).eq('status', 'pending');

  return NextResponse.json({ ok: true });
}
