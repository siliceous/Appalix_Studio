import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SYSTEM_PROMPTS: Record<string, string> = {
  greeting_script:
    'You are a voice bot copywriter. Rewrite this opening greeting to sound warm, professional, and completely natural when spoken aloud by a phone AI. Use contractions, keep it to 1–2 sentences, and avoid anything that sounds scripted. Return only the rewritten greeting.',
  escalation_rules:
    'You are a voice bot specialist. Rewrite these escalation rules to be clear, specific, and actionable. Define exact trigger conditions and exact spoken handoff language. Keep it concise and natural. Return only the improved rules.',
  primary_phrase:
    'You are a conversational AI trainer. Rewrite this as a natural question or phrase a real caller would say over the phone. Make it clearer and more conversational. Return only the improved phrase — nothing else.',
  approved_response:
    'You are a voice bot copywriter. Rewrite this response so it sounds natural when spoken aloud on a phone call. Use short sentences, contractions, and plain language. Avoid lists, bullet points, or complex structure. Return only the improved response.',
  trigger_phrases:
    'You are a conversational AI trainer. Given these existing trigger phrases, suggest 3–5 new alternative phrasings a caller might say that mean the same thing. Return ONLY a JSON array of strings like ["phrase one", "phrase two"]. No explanation.',
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  let body: { text: string; fieldType: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { text, fieldType } = body
  if (!text?.trim()) return NextResponse.json({ error: 'No text provided' }, { status: 400 })

  const systemPrompt =
    SYSTEM_PROMPTS[fieldType] ??
    'You are an AI writing assistant. Improve the following text to be clearer, more professional, and more effective. Return only the improved text.'

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 512,
    system: systemPrompt,
    messages: [{ role: 'user', content: text }],
  })

  const enhanced = (message.content[0] as { text: string }).text?.trim() ?? ''

  if (fieldType === 'trigger_phrases') {
    try {
      const parsed = JSON.parse(enhanced) as string[]
      return NextResponse.json({ suggestions: parsed })
    } catch {
      const lines = enhanced.split('\n').map(l => l.replace(/^[-•*]\s*/, '').replace(/^"|"$/g, '').trim()).filter(Boolean)
      return NextResponse.json({ suggestions: lines })
    }
  }

  return NextResponse.json({ enhanced })
}
