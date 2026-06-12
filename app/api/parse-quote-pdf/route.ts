import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { extractText } from 'unpdf'

const GROQ_API_KEY = process.env.GROQ_API_KEY!
const GROQ_BASE    = 'https://api.groq.com/openai/v1'

const IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']

interface ParsedQuote {
  amount:          number | null   // excl VAT (or full amount if supplier not VAT-registered)
  amount_incl_vat: number | null   // incl VAT total; null if supplier not VAT-registered
  description:     string | null
  valid_until:     string | null
}

const SYSTEM_PROMPT = (today: string) => `You are a quote parser for ConnexServ, a South African facilities-management and maintenance platform. Today is ${today}. Quotes come from contractors doing retail fitouts, building maintenance, and renovation work (electrical, plumbing, tiling, painting, ceilings, partitioning, shopfitting, HVAC, fire, security, etc.).

IMPORTANT: Some suppliers are NOT VAT-registered and will have no VAT breakdown — do NOT calculate or infer VAT amounts. Only extract numbers that are explicitly printed on the document.
If you are not certain about a value, return null — do not guess.

Return ONLY a valid JSON object with exactly these four keys — no markdown, no explanation:

"amount": Amount EXCLUDING VAT as a plain float (e.g. 45000.00).
  Look for: "Total Excl. VAT", "Excl. VAT", "Total before VAT", "Nett", "Net Total", "Subtotal", "Amount excl", "Quote Total".
  If no excl-VAT label exists but only a single total appears (no VAT line on the document), use that total here and set amount_incl_vat to null.
  ZAR formatting: "R 45 000.00", "R45,000", "45 000,00" — strip R, spaces, thousand separators; return a plain float.
  null if not clearly found.

"amount_incl_vat": Amount INCLUDING VAT as a plain float.
  Look for: "Total Incl. VAT", "Incl. VAT", "Grand Total", "Total Including VAT", "Amount incl".
  Only set if a VAT line is explicitly present on the document (supplier is VAT-registered).
  null if the supplier shows no VAT breakdown.

"description": 1–3 sentence plain-English summary of the scope of work and/or materials quoted (e.g. "Electrical installation for new Crazy Store fitout at Midrand 2, including DB board, lighting, and power points."). null if content is unreadable.

"valid_until": Quote expiry as ISO YYYY-MM-DD.
  Look for: "Valid until / till", "Quote valid", "Validity", "Expiry", "Valid for X days/weeks" (add X to today).
  SA dates appear as DD/MM/YYYY or "5 July 2026" — convert to YYYY-MM-DD.
  null if not found.`

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
    amount:          typeof raw.amount === 'number'          ? raw.amount          : null,
    amount_incl_vat: typeof raw.amount_incl_vat === 'number' ? raw.amount_incl_vat : null,
    description:     typeof raw.description === 'string'     ? raw.description     : null,
    valid_until:     typeof raw.valid_until === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw.valid_until)
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
      temperature: 0,
      max_tokens: 256,
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
      response_format: { type: 'json_object' },
      temperature: 0,
      max_tokens: 256,
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
