/**
 * Form Submission AI Analysis
 * Analyses a sage_form_submission and assigns priority, summary, insights, action, entities.
 */
import { supabase }                                   from '../lib/supabase.js'
import { callClaude }                                 from './ai/claude.js'
import { getWorkspaceAutoSettings, isFullAutomation } from '../lib/auto-settings.js'
import { executeAutoAction }                          from './sage-auto-execute.js'

interface FormAnalysis {
  priority: 'high' | 'medium' | 'low'
  summary:  string | null
  insights: string[]
  action:   'create_lead' | 'create_ticket' | 'ignore'
  entities: {
    name?:             string
    email?:            string
    phone?:            string
    product_interest?: string
  }
}

export async function analyzeFormSubmission(submissionId: string): Promise<void> {
  const { data: submission } = await supabase
    .from('sage_form_submissions')
    .select('id, workspace_id, fields')
    .eq('id', submissionId)
    .single()

  if (!submission) return

  const fields = (submission as { id: string; workspace_id: string; fields: Record<string, string> }).fields
  const workspaceId = (submission as { id: string; workspace_id: string; fields: Record<string, string> }).workspace_id
  const lines = Object.entries(fields)
    .filter(([, v]) => v && String(v).trim())
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n')

  if (!lines) return

  const prompt = `You are an AI assistant that analyses website form submissions for a business.

Classify the submission, extract a summary, key insights, best next action, and entities.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PRIORITY RULES:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
HIGH  — submitter provided email or phone AND their message shows buying intent, pricing inquiry, demo request, or partnership interest
MEDIUM — genuine inquiry or question; has name + message but may lack contact details
LOW   — no substantive message, test submission, or insufficient information to act on

ACTION RULES:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"create_lead"   — HIGH or MEDIUM with contact info and sales/inquiry intent
"create_ticket" — submitter describes a bug, problem, or needs support
"ignore"        — LOW priority, test, or spam

FORM SUBMISSION:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${lines}

OUTPUT — return ONLY this JSON, nothing else:
{
  "priority": "high" | "medium" | "low",
  "summary": "1–2 sentence summary",
  "insights": ["insight 1", "insight 2"],
  "action": "create_lead" | "create_ticket" | "ignore",
  "entities": {
    "name": "full name if provided",
    "email": "email if provided",
    "phone": "phone if provided",
    "product_interest": "what they are enquiring about"
  }
}`

  try {
    const result = await callClaude({
      model:        'claude-haiku-4-5-20251001',
      maxTokens:    600,
      systemPrompt: 'You are a CRM assistant. Respond only with valid JSON.',
      messages:     [{ role: 'user', content: prompt }],
    })
    const jsonMatch = result.content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return

    const analysis = JSON.parse(jsonMatch[0]) as FormAnalysis

    await supabase
      .from('sage_form_submissions')
      .update({
        ai_priority:    analysis.priority,
        ai_summary:     analysis.summary ?? null,
        ai_insights:    analysis.insights ?? [],
        ai_action:      analysis.action,
        ai_entities:    analysis.entities ?? {},
        ai_analyzed_at: new Date().toISOString(),
      })
      .eq('id', submissionId)

    // Fire auto-action if full automation is enabled for the forms channel
    if (analysis.action !== 'ignore' && workspaceId) {
      try {
        const settings = await getWorkspaceAutoSettings(workspaceId)
        if (isFullAutomation(settings, 'forms')) {
          await executeAutoAction({
            workspaceId,
            channel:  'forms',
            action:   analysis.action,
            sourceId: submissionId,
            entities:          analysis.entities ?? {},
            summary:           analysis.summary ?? null,
            priority:          analysis.priority ?? null,
            defaultPipelineId: settings.default_pipeline_id,
          })
        }
      } catch (autoErr) {
        console.error('[form-analyze] auto-execute error:', autoErr)
      }
    }
  } catch (err) {
    console.error('[form-analyze] Error:', err instanceof Error ? err.message : String(err))
  }
}
