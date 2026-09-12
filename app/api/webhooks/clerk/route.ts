import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { Webhook } from 'svix';
import { getSupabaseAdminClient } from '@/lib/supabaseClient';

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    console.error('Missing CLERK_WEBHOOK_SECRET environment variable');
    return new NextResponse('Webhook secret not configured', { status: 500 });
  }

  // Get the headers
  const headerPayload = await headers();
  const svix_id = headerPayload.get('svix-id');
  const svix_timestamp = headerPayload.get('svix-timestamp');
  const svix_signature = headerPayload.get('svix-signature');

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new NextResponse('Missing svix headers', { status: 400 });
  }

  // Get raw body
  const payload = await req.json();
  const body = JSON.stringify(payload);

  // Create a new Svix instance with secret
  const wh = new Webhook(WEBHOOK_SECRET);
  let evt: any;

  try {
    evt = wh.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    });
  } catch (err) {
    console.error('Error verifying Clerk webhook:', err);
    return new NextResponse('Invalid signature', { status: 400 });
  }

  const eventType = evt.type;
  const supabaseAdmin = getSupabaseAdminClient();

  if (eventType === 'user.created' || eventType === 'user.updated') {
    const { id, email_addresses } = evt.data;
    const primaryEmail = email_addresses?.[0]?.email_address;

    if (!id || !primaryEmail) {
      return new NextResponse('Missing user id or email', { status: 400 });
    }

    const { error } = await supabaseAdmin.from('profiles').upsert(
      {
        id,
        email: primaryEmail,
      },
      { onConflict: 'id' },
    );

    if (error) {
      console.error('Error syncing user profile to Supabase:', error);
      return new NextResponse(`Database error: ${error.message}`, {
        status: 500,
      });
    }
  } else if (eventType === 'user.deleted') {
    const { id } = evt.data;
    if (id) {
      const { error } = await supabaseAdmin
        .from('profiles')
        .delete()
        .eq('id', id);
      if (error) {
        console.error('Error deleting user profile from Supabase:', error);
      }
    }
  }

  return NextResponse.json({ success: true });
}

