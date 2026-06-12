import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
// Use the lib directly — avoids pdf-parse loading test files on import (Next.js serverless bug)
const pdfParse = require('pdf-parse/lib/pdf-parse.js') as (buf: Buffer) => Promise<{ text: string }> // eslint-disable-line

const GROQ_API_KEY = process.env.GROQ_API_KEY!
const GROQ_BASE    = 'https://api.groq.com/openai/v1'

interface ParsedQuote {
  amount:      number | null
  description: string | null
  valid_until: string | null  // ISO date string or null if not found
}

/**
 * POST /api/parse-quote-pdf
 * Accepts multipart/form-data with a "file" field (PDF only).
 * Returns extracted amount, description, valid_until from the PDF.
 */
export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get('file') as File | null

  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  if (file.type !== 'application/pdf') {
    return NextResponse.json({ error: 'Only PDF files supported for auto-fill' }, { status: 400 })
  }

  // Extract text from PDF
  const buffer = Buffer.from(await file.arrayBuffer())
  let pdfText = ''
  try {
    const parsed = await pdfParse(buffer)
    pdfText = parsed.text.trim()
  } catch {
    return NextResponse.json({ error: 'Could not read PDF' }, { status: 422 })
  }

  if (!pdfText) {
    return NextResponse.json({ error: 'PDF appears to be empty or scanned (no text layer)' }, { status: 422 })
  }

  // Use Groq LLaMA to extract quote fields
  const today = new Date().toISOString().split('T')[0]

  const res = await fetch(`${GROQ_BASE}/chat/completions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${GROQ_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `You are a quote document parser for a South African maintenance platform. Today's date is ${today}.
Extract the following fields from the quote/invoice text and return ONLY a JSON object:
- "amount": the total amount as a number (no currency symbol, e.g. 1500.00). null if not found.
- "description": a concise summary of what the quote covers (1-3 sentences). null if not found.
- "valid_until": the quote expiry/valid-until date as ISO format YYYY-MM-DD. null if not found or not mentioned.

Currency is ZAR (South African Rand). Look for "Total", "Grand Total", "Amount Due", "Invoice Total" for the amount.
Look for "Valid until", "Expiry", "Quote valid for X days" for the date.`,
        },
        {
          role: 'user',
          content: pdfText.slice(0, 8000), // cap tokens
        },
      ],
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    console.error('[parse-quote-pdf] Groq error:', err)
    return NextResponse.json({ error: 'AI extraction failed' }, { status: 502 })
  }

  const json = await res.json() as { choices: Array<{ message: { content: string } }> }
  const raw  = JSON.parse(json.choices[0].message.content) as Partial<ParsedQuote>

  return NextResponse.json({
    amount:      typeof raw.amount === 'number' ? raw.amount : null,
    description: typeof raw.description === 'string' ? raw.description : null,
    valid_until: typeof raw.valid_until === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw.valid_until)
      ? raw.valid_until
      : null,
  } satisfies ParsedQuote)
}
