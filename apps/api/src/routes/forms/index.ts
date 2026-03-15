/**
 * POST /forms/:formId/submit
 * Public endpoint — accepts form submissions from embedded forms on external websites.
 * No auth required (form ID is the secret). Inserts to sage_form_submissions and
 * triggers async AI analysis.
 */
import type { FastifyInstance } from 'fastify'
import { supabase }              from '../../lib/supabase.js'
import { analyzeFormSubmission } from '../../services/form-analyze.js'
import { syncContactToAllPlatforms } from '../../services/mailchimp-sync.js'

interface SubmitBody {
  name?:    string
  email?:   string
  phone?:   string
  company?: string
  message?: string
  [key: string]: string | undefined
}

interface AnalyzeBody { workspace_id: string; form_id?: string }

function authCheck(req: { headers: Record<string, string | string[] | undefined> }): boolean {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  return !!key && req.headers['x-service-key'] === key
}

export async function formRoutes(fastify: FastifyInstance) {
  /** POST /forms/analyze — batch-analyze pending submissions (service-key auth) */
  fastify.post<{ Body: AnalyzeBody }>('/analyze', async (request, reply) => {
    if (!authCheck(request)) return reply.status(401).send({ error: 'Unauthorised' })
    const { workspace_id, form_id } = request.body
    if (!workspace_id) return reply.status(400).send({ error: 'workspace_id is required' })

    let query = supabase
      .from('sage_form_submissions')
      .select('id')
      .eq('workspace_id', workspace_id)
      .is('ai_analyzed_at', null)
      .limit(50)

    if (form_id) query = query.eq('form_id', form_id) as typeof query

    const { data: rows } = await query
    if (!rows || rows.length === 0) return reply.send({ ok: true, analyzed: 0 })

    await Promise.all(
      (rows as { id: string }[]).map(r => analyzeFormSubmission(r.id))
    )
    return reply.send({ ok: true, analyzed: rows.length })
  })

  /** POST /forms/:formId/submit — public, no auth */
  fastify.post<{ Params: { formId: string }; Body: SubmitBody }>(
    '/:formId/submit',
    async (request, reply) => {
      const { formId } = request.params
      const body = request.body ?? {}

      // Verify the form exists and is active
      const { data: form } = await supabase
        .from('sage_forms')
        .select('id, workspace_id, is_active')
        .eq('id', formId)
        .single()

      if (!form || !(form as { is_active: boolean }).is_active) {
        return reply.status(404).send({ error: 'Form not found or inactive' })
      }

      const { workspace_id } = form as { workspace_id: string }

      // Sanitise fields — only allow string values
      const fields: Record<string, string> = {}
      for (const [key, value] of Object.entries(body)) {
        if (typeof value === 'string' && value.trim()) {
          fields[key] = value.trim()
        }
      }

      if (Object.keys(fields).length === 0) {
        return reply.status(400).send({ error: 'No form data provided' })
      }

      // Insert submission
      const { data: submission, error } = await supabase
        .from('sage_form_submissions')
        .insert({ workspace_id, form_id: formId, fields })
        .select('id')
        .single()

      if (error || !submission) {
        return reply.status(500).send({ error: 'Failed to save submission' })
      }

      const submissionId = (submission as { id: string }).id

      // Trigger async tasks — don't block the response
      setImmediate(() => {
        void analyzeFormSubmission(submissionId)
        void syncContactToAllPlatforms(workspace_id, fields)
      })

      return reply.send({ ok: true, id: submissionId })
    }
  )
}
