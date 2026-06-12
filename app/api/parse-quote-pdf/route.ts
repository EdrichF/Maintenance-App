import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { extractText } from 'unpdf'

const GROQ_API_KEY = process.env.GROQ_API_KEY!
const GROQ_BASE    = 'https://api.groq.com/openai/v1'

const IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']

interface ParsedQuote {
  amount:      number | null
  description: string | null
  valid_until: string | null
}

const SYSTEM_PROMPT = (today: string) => `You are a quote document parser for a South African maintenance platform. Today's date is ${today}.
Extract the following fields and return ONLY a valid JSON object with these exact keys — no other text:
- "amount": the TOTAL EXCLUDING VAT as a plain number (no currency symbol, no spaces, e.g. 1064758.18).
  Search order: "Total Excl. VAT" > "Total before VAT" > "Subtotal" > "Nett" > "Net Total" > "Amount excl" > "Total excl" > "Quote Total" > any grand total.
  ZAR numbers may be written as "R 45 000.00", "R45,000", "45 000,00" — strip R, spaces, commas and return a plain float.
  NEVER use the VAT line amount or Total Including VAT / Total Incl. VAT.
  If no excl-VAT total exists, use the largest single monetary total on the document.
  null only if truly no monetary amount is anywhere on the document.
- "description": 1–3 sentence summary of what work/items the quote covers. null if not found.
- "valid_until": quote expiry as ISO YYYY-MM-DD. Check "Valid until", "Quote valid", "Expiry date", "Valid for X days/weeks" (compute from today). null if not found.

Return ONLY the JSON object. No markdown, no explanation.`

/**
 * POST /api/parse-quote-pdf
 * Accepts multipart/form-data with a "file" field (PDF or image).
 * Returns extracted amount, description, valid_until.
 */
export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  const today = new Date().toISOString().split('T')[0]
  const isPdf   = file.type === 'application/pdf'
  const isImage = IMAGE_TYPES.includes(file.type)

  if (!isPdf && !isImage) {
    return NextResponse.json({ error: 'Only PDF or image files supported for auto-fill' }, { status: 400 })
  }

  let raw: Partial<ParsedQuote>

  try {
    if (isPdf) {
      raw = await extractFromPdf(file, today)
    } else {
      raw = await extractFromImage(file, today)
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : ''
    if (msg === 'SCANNED_PDF') {
      return NextResponse.json({ error: 'SCANNED_PDF' }, { status: 422 })
    }
    console.error('[parse-quote-pdf] extraction error:', err)
    return NextResponse.json({ error: 'AI extraction failed' }, { status: 502 })
  }

  return NextResponse.json({
    amount:      typeof raw.amount === 'number' ? raw.amount : null,
    description: typeof raw.description === 'string' ? raw.description : null,
    valid_until: typeof raw.valid_until === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw.valid_until)
      ? raw.valid_until
      : null,
  } satisfies ParsedQuote)
}

// ─── PDF: extract text then LLaMA ────────────────────────────────────────────
async function extractFromPdf(file: File, today: string): Promise<Partial<ParsedQuote>> {
  let pdfText = ''
  try {
    const buffer = new Uint8Array(await file.arrayBuffer())
    const { text } = await extractText(buffer, { mergePages: true })
    pdfText = (typeof text === 'string' ? text : (text as string[]).join('\n')).trim()
  } catch (err) {
    console.error('[parse-quote-pdf] extractText error:', err)
    throw new Error('Could not read PDF')
  }

  if (!pdfText) throw new Error('SCANNED_PDF')

  const res = await fetch(`${GROQ_BASE}/chat/completions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${GROQ_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT(today) },
        { role: 'user',   content: pdfText.slice(0, 8000) },
      ],
    }),
  })

  if (!res.ok) throw new Error(`Groq LLM error: ${await res.text()}`)

  const json = await res.json() as { choices: Array<{ message: { content: string } }> }
  return parseJsonResponse(json.choices[0].message.content)
}

// ─── Image: vision model ──────────────────────────────────────────────────────
async function extractFromImage(file: File, today: string): Promise<Partial<ParsedQuote>> {
  const base64 = Buffer.from(await file.arrayBuffer()).toString('base64')
  const dataUrl = `data:${file.type};base64,${base64}`

  const res = await fetch(`${GROQ_BASE}/chat/completions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${GROQ_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'meta-llama/llama-4-scout-17b-16e-instruct',
      // No response_format — vision models may not support json_object mode; parse robustly below
      messages: [
        { role: 'system', content: SYSTEM_PROMPT(today) },
        {
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: dataUrl } },
            { type: 'text', text: 'Extract the quote fields from this image. Return ONLY the JSON object, nothing else.' },
          ],
        },
      ],
    }),
  })

  if (!res.ok) throw new Error(`Groq vision error: ${await res.text()}`)

  const json = await res.json() as { choices: Array<{ message: { content: string } }> }
  return parseJsonResponse(json.choices[0].message.content)
}

// Robustly extract JSON from a model response that may contain surrounding text
function parseJsonResponse(content: string): Partial<ParsedQuote> {
  const trimmed = content.trim()
  try { return JSON.parse(trimmed) } catch {}
  // Model sometimes wraps in markdown code block or adds preamble text
  const match = trimmed.match(/\{[\s\S]*\}/)
  if (match) {
    try { return JSON.parse(match[0]) } catch {}
  }
  throw new Error('Could not parse JSON from model response')
}
