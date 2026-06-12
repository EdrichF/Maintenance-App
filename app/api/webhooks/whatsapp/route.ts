import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/webhooks/whatsapp
 * Meta webhook verification handshake.
 * Meta sends hub.mode, hub.verify_token, and hub.challenge.
 * We echo back the challenge if the token matches WHATSAPP_VERIFY_TOKEN.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode      = searchParams.get('hub.mode');
  const token     = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    console.log('[WhatsApp] Webhook verified');
    return new NextResponse(challenge, { status: 200 });
  }

  console.warn('[WhatsApp] Webhook verification failed — token mismatch or wrong mode');
  return new NextResponse('Forbidden', { status: 403 });
}

/**
 * POST /api/webhooks/whatsapp
 * Receives incoming WhatsApp events from Meta.
 * Full message handling to be implemented later.
 */
export async function POST(_req: NextRequest) {
  // TODO: parse and handle incoming message events
  return NextResponse.json({ status: 'ok' });
}
