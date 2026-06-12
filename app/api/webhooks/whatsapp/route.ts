import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { sendPushToMany, sendPushToUser } from '@/lib/push';
import type { Priority } from '@/lib/types';
import https from 'https';

// ─── ENV ────────────────────────────────────────────────────────────────────
const WA_TOKEN      = process.env.WHATSAPP_ACCESS_TOKEN!;
const WA_PHONE_ID   = process.env.WHATSAPP_PHONE_NUMBER_ID!;
const GROQ_API_KEY  = process.env.GROQ_API_KEY!;
const GROQ_BASE     = 'https://api.groq.com/openai/v1';

// ─── Types ───────────────────────────────────────────────────────────────────
interface WaPayload {
  object: string;
  entry: Array<{
    changes: Array<{
      value: {
        metadata: { phone_number_id: string };
        messages?: Array<{
          from: string;
          type: string;
          audio?: { id: string };
          text?: { body: string };
        }>;
      };
    }>;
  }>;
}

interface ExtractedTicket {
  title: string;
  description: string;
  priority: Priority;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Normalise the sender number from WhatsApp (e.g. "27712345678")
 * to E.164 format ("+27712345678") so it matches profiles.phone.
 */
function normalisePhone(from: string): string {
  const digits = from.replace(/\D/g, '');
  // SA local format: leading 0, 10 digits
  if (digits.startsWith('0') && digits.length === 10) return `+27${digits.slice(1)}`;
  // Already has country code without +
  return `+${digits}`;
}

/** Download a Meta media file as an ArrayBuffer */
async function downloadMedia(mediaId: string): Promise<{ arrayBuffer: ArrayBuffer; mimeType: string }> {
  // 1. Get the download URL from Graph API
  const metaRes = await fetch(
    `https://graph.facebook.com/v21.0/${mediaId}`,
    { headers: { Authorization: `Bearer ${WA_TOKEN}` } }
  );
  if (!metaRes.ok) throw new Error(`Meta media lookup failed: ${metaRes.status}`);
  const { url, mime_type } = await metaRes.json() as { url: string; mime_type: string };

  // 2. Download via Node's https module — undici (native fetch) has a known
  //    TLS socket issue with Meta's media CDN that causes "other side closed".
  const arrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
    https.get(url, { headers: { Authorization: `Bearer ${WA_TOKEN}` } }, (res) => {
      if (res.statusCode && res.statusCode >= 400) {
        reject(new Error(`Media download failed: ${res.statusCode}`));
        res.resume();
        return;
      }
      const chunks: Uint8Array[] = [];
      res.on('data', (chunk: Buffer) => chunks.push(new Uint8Array(chunk)));
      res.on('end', () => {
        const total  = chunks.reduce((n, c) => n + c.length, 0);
        const merged = new Uint8Array(total);
        let offset   = 0;
        for (const chunk of chunks) { merged.set(chunk, offset); offset += chunk.length; }
        resolve(merged.buffer);
      });
      res.on('error', reject);
    }).on('error', reject);
  });

  return { arrayBuffer, mimeType: mime_type };
}

/** Transcribe audio using Groq Whisper */
async function transcribe(arrayBuffer: ArrayBuffer, mimeType: string): Promise<string> {
  const ext = mimeType.split('/')[1]?.split(';')[0] ?? 'ogg';
  const form = new FormData();
  form.append('file', new Blob([arrayBuffer], { type: mimeType }), `audio.${ext}`);
  form.append('model', 'whisper-large-v3');
  form.append('response_format', 'text');
  // No language hint — Whisper auto-detects SA English/Afrikaans mix better than forced lang

  const res = await fetch(`${GROQ_BASE}/audio/transcriptions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${GROQ_API_KEY}` },
    body: form,
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Groq transcription failed: ${err}`);
  }
  return res.text();
}

/** Use Groq LLM to extract structured ticket fields from a transcript */
async function extractTicketFields(transcript: string): Promise<ExtractedTicket> {
  const res = await fetch(`${GROQ_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `You are a maintenance ticket assistant. Extract structured fields from a voice-note transcript.
Return ONLY a JSON object with these exact keys:
- "title": short one-line summary (max 80 chars)
- "description": detailed description of the issue
- "priority": one of "low", "medium", "high", "urgent"

Priority guide: urgent = safety/no service, high = major disruption, medium = moderate issue, low = minor/cosmetic.`,
        },
        { role: 'user', content: transcript },
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Groq extraction failed: ${err}`);
  }

  const json = await res.json() as { choices: Array<{ message: { content: string } }> };
  const raw = JSON.parse(json.choices[0].message.content) as Partial<ExtractedTicket>;

  const validPriorities: Priority[] = ['low', 'medium', 'high', 'urgent'];
  return {
    title: raw.title ?? 'Maintenance request',
    description: raw.description ?? transcript,
    priority: validPriorities.includes(raw.priority as Priority)
      ? (raw.priority as Priority)
      : 'medium',
  };
}

/** Send a WhatsApp text reply to a phone number */
async function sendWhatsAppReply(to: string, text: string): Promise<void> {
  await fetch(
    `https://graph.facebook.com/v21.0/${WA_PHONE_ID}/messages`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${WA_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { body: text },
      }),
    }
  );
}

// ─── GET — Meta webhook verification ────────────────────────────────────────

/**
 * GET /api/webhooks/whatsapp
 * Meta sends hub.mode, hub.verify_token, hub.challenge.
 * Echo back the challenge if token matches WHATSAPP_VERIFY_TOKEN.
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

// ─── POST — Incoming messages ─────────────────────────────────────────────

/**
 * POST /api/webhooks/whatsapp
 *
 * Flow for audio/voice messages:
 * 1. Parse Meta webhook payload
 * 2. Download voice note from Meta CDN
 * 3. Transcribe with Groq Whisper
 * 4. Extract ticket fields with Groq LLaMA
 * 5. Look up sender phone → profiles (must be store_manager or client)
 * 6. Create ticket in Supabase
 * 7. Fan out in-app notifications + push
 * 8. Reply to sender with ticket ID + summary
 */
export async function POST(req: NextRequest) {
  const payload = await req.json() as WaPayload;

  // Await the handler — Vercel serverless functions terminate after the
  // response is sent, so fire-and-forget doesn't reliably complete.
  // Meta waits up to 20s for a response, which is enough time for the full flow.
  await handleWebhook(payload);

  return NextResponse.json({ status: 'ok' });
}

async function handleWebhook(payload: WaPayload) {
  try {
    // DEBUG: log full raw payload so we can see exactly what Meta sends
    console.log('[WhatsApp] Raw payload:', JSON.stringify(payload, null, 2));

    const change  = payload.entry?.[0]?.changes?.[0]?.value;
    const message = change?.messages?.[0];

    if (!message) {
      console.log('[WhatsApp] No message in payload (status update or other event)');
      return;
    }

    console.log(`[WhatsApp] Message received — type: ${message.type}, from: ${message.from}`);

    const from = message.from; // e.g. "27831234567"

    if (message.type !== 'audio') {
      console.log(`[WhatsApp] Ignored message type: ${message.type}`);
      return;
    }

    const mediaId = message.audio?.id;
    if (!mediaId) return;

    console.log(`[WhatsApp] Voice note received from ${from}, media: ${mediaId}`);

    await sendWhatsAppReply(from, '🎙️ Voice note received! Processing your request, please hold on...');

    // 1. Download media
    const { arrayBuffer, mimeType } = await downloadMedia(mediaId);

    // 2. Transcribe
    const transcript = (await transcribe(arrayBuffer, mimeType)).trim();
    console.log(`[WhatsApp] Transcript: ${transcript}`);

    if (!transcript) {
      await sendWhatsAppReply(from, '⚠️ Could not understand the voice note. Please try again or send a text message.');
      return;
    }

    // 3. Extract ticket fields
    const { title, description, priority } = await extractTicketFields(transcript);

    // 4. Look up sender in profiles
    const adminClient = createAdminClient();
    const normalisedPhone = normalisePhone(from);

    const { data: senderProfile, error: profileError } = await adminClient
      .from('profiles')
      .select('id, full_name, company_name, sub_store, regional_manager_id, role')
      .eq('phone', normalisedPhone)
      .single();

    console.log(`[WhatsApp] Profile lookup — searching for phone: "${normalisedPhone}", found: ${senderProfile ? senderProfile.full_name : 'none'}, error: ${profileError?.message ?? 'none'}`);

    if (!senderProfile) {
      console.warn(`[WhatsApp] No profile found for ${normalisedPhone}`);
      await sendWhatsAppReply(
        from,
        '⚠️ Your number is not registered in Motiv. Please contact your administrator.'
      );
      return;
    }

    if (senderProfile.role !== 'client' && senderProfile.role !== 'store_manager') {
      console.warn(`[WhatsApp] Role ${senderProfile.role} not allowed to submit tickets via WhatsApp`);
      await sendWhatsAppReply(from, '⚠️ Only store managers and clients can submit tickets via WhatsApp.');
      return;
    }

    // 5. Create ticket
    const { data: ticket, error: ticketError } = await adminClient
      .from('tickets')
      .insert({
        client_id:   senderProfile.id,
        title,
        description: `${description}\n\n_Submitted via WhatsApp voice note_`,
        priority,
        photo_urls:  [],
      })
      .select()
      .single();

    if (ticketError || !ticket) {
      console.error('[WhatsApp] Ticket creation failed:', ticketError);
      await sendWhatsAppReply(from, '❌ Sorry, there was an error creating your ticket. Please try again.');
      return;
    }

    console.log(`[WhatsApp] Ticket created: ${ticket.id}`);

    // 6. Fan out notifications (same pattern as POST /api/tickets)
    const [{ data: adminProfiles }] = await Promise.all([
      adminClient.from('profiles').select('id').eq('role', 'admin'),
    ]);

    await Promise.all([
      adminProfiles?.length
        ? adminClient.from('notifications').insert(
            adminProfiles.map((admin: { id: string }) => ({
              user_id: admin.id,
              type:    'new_ticket',
              title:   'New Maintenance Ticket',
              message: `A new ${priority} priority ticket has been submitted: "${title}"`,
              link:    `/admin/tickets/${ticket.id}`,
            }))
          )
        : Promise.resolve(),
      senderProfile.regional_manager_id
        ? adminClient.from('notifications').insert({
            user_id: senderProfile.regional_manager_id,
            type:    'new_ticket',
            title:   'New Ticket from Your Region',
            message: `${senderProfile.company_name ?? 'A store'} (${senderProfile.sub_store ?? ''}) submitted a new ${priority} priority ticket: "${title}"`,
            link:    `/regional/tickets/${ticket.id}`,
          })
        : Promise.resolve(),
    ]);

    // Push notifications — non-blocking
    if (adminProfiles?.length) {
      void sendPushToMany(
        adminProfiles.map((a: { id: string }) => a.id),
        { title: 'New Maintenance Ticket', body: `A new ${priority} ticket: "${title}"`, url: `/admin/tickets/${ticket.id}` }
      );
    }
    if (senderProfile.regional_manager_id) {
      void sendPushToUser(senderProfile.regional_manager_id, {
        title: 'New Ticket from Your Region',
        body:  `${senderProfile.company_name ?? 'A store'} submitted a new ${priority} ticket: "${title}"`,
        url:   `/regional/tickets/${ticket.id}`,
      });
    }

    revalidatePath('/client');
    revalidatePath('/admin');
    revalidatePath('/regional');

    // 7. Reply to sender
    const priorityEmoji: Record<Priority, string> = {
      low: '🟢', medium: '🟡', high: '🟠', urgent: '🔴',
    };
    await sendWhatsAppReply(
      from,
      `✅ *Ticket created successfully!*\n\n` +
      `*ID:* ${ticket.id}\n` +
      `*Title:* ${title}\n` +
      `*Priority:* ${priorityEmoji[priority]} ${priority.charAt(0).toUpperCase() + priority.slice(1)}\n\n` +
      `Your ticket has been logged and the team has been notified.`
    );
  } catch (err) {
    console.error('[WhatsApp] handleWebhook error:', err);
  }
}
