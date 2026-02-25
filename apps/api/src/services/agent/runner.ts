import type Anthropic from '@anthropic-ai/sdk'
import { callClaude, type ChatMessage } from '../ai/claude.js'
import { BUILT_IN_TOOLS, executeTool, type ToolExecutionContext } from './tools.js'
import { supabase } from '../../lib/supabase.js'
import { recordUsage } from '../../lib/usage.js'

const MAX_STEPS = 10  // hard cap on tool call iterations

const PRO_TOOLS = new Set(['send_email', 'generate_document', 'export_csv', 'request_approval'])

export interface AgentRunParams {
  workspaceId:    string
  conversationId: string
  botId:          string
  model:          string
  systemPrompt:   string
  messages:       ChatMessage[]
  maxTokens?:     number
  temperature?:   number
  workspacePlan?: string
}

export interface AgentRunResult {
  reply:        string
  agentRunId:   string
  steps:        number
  tokensInput:  number
  tokensOutput: number
}

/**
 * Multi-step agentic loop.
 *
 * 1. Create an agent_run record.
 * 2. Call Claude with tools enabled.
 * 3. If stop_reason = 'tool_use' → execute each tool → append results → repeat.
 * 4. When stop_reason = 'end_turn' → return final text response.
 * 5. Update agent_run with final status, steps, tokens.
 */
export async function runAgent(params: AgentRunParams): Promise<AgentRunResult> {
  const {
    workspaceId, conversationId, botId,
    model, systemPrompt, messages,
    maxTokens = 1024, temperature = 0.7,
    workspacePlan = 'starter',
  } = params

  const planAllowsAutomation = ['pro', 'scale', 'enterprise'].includes(workspacePlan)
  const enabledTools = planAllowsAutomation
    ? BUILT_IN_TOOLS
    : BUILT_IN_TOOLS.filter((t) => !PRO_TOOLS.has(t.name))

  const startedAt = Date.now()

  // Create agent_run record
  const { data: runRecord, error: runError } = await supabase
    .from('agent_runs')
    .insert({
      workspace_id:    workspaceId,
      conversation_id: conversationId,
      bot_id:          botId,
      status:          'running',
      input:           { messages: messages.slice(-2) },
    })
    .select('id')
    .single()

  if (runError) throw new Error(`Failed to create agent_run: ${runError.message}`)
  const agentRunId = runRecord.id

  const toolCtx: ToolExecutionContext = { workspaceId, conversationId, botId, workspacePlan }

  // Working copy of message history — will grow with tool results
  const workingMessages: Anthropic.MessageParam[] = messages.map((m) => ({
    role:    m.role,
    content: m.content,
  }))

  let steps        = 0
  let totalIn      = 0
  let totalOut     = 0
  let finalReply   = ''

  try {
    while (steps < MAX_STEPS) {
      steps++

      const result = await callClaude({
        model,
        systemPrompt,
        messages: workingMessages as never,
        maxTokens,
        temperature,
        tools: enabledTools,
      })

      totalIn  += result.tokensInput
      totalOut += result.tokensOutput

      if (result.stopReason === 'end_turn' || !result.toolUses?.length) {
        finalReply = result.content
        break
      }

      // Append the assistant's message (with tool_use blocks)
      workingMessages.push({
        role:    'assistant',
        content: [
          ...(result.content ? [{ type: 'text' as const, text: result.content }] : []),
          ...(result.toolUses ?? []),
        ],
      })

      // Execute all tool calls in this step
      const toolResults: Anthropic.ToolResultBlockParam[] = []

      for (const toolUse of result.toolUses ?? []) {
        const invocationStart = Date.now()

        // Log tool invocation
        const { data: invRow } = await supabase
          .from('tool_invocations')
          .insert({
            agent_run_id: agentRunId,
            workspace_id: workspaceId,
            tool_name:    toolUse.name,
            input:        toolUse.input as Record<string, unknown>,
            status:       'running',
            step_index:   steps - 1,
          })
          .select('id')
          .single()

        let toolOutput: string
        let toolStatus: 'completed' | 'failed' = 'completed'

        try {
          toolOutput = await executeTool(toolUse.name, toolUse.input as never, toolCtx)
        } catch (err) {
          toolOutput = `Tool error: ${err instanceof Error ? err.message : String(err)}`
          toolStatus = 'failed'
        }

        const durationMs = Date.now() - invocationStart

        // Update invocation record
        if (invRow) {
          await supabase
            .from('tool_invocations')
            .update({
              output:       { text: toolOutput },
              status:       toolStatus,
              duration_ms:  durationMs,
              completed_at: new Date().toISOString(),
            })
            .eq('id', invRow.id)
        }

        // Record tool_call usage event
        await recordUsage({
          workspaceId,
          eventType:   'tool_call',
          agentRunId,
          metadata:    { tool_name: toolUse.name, duration_ms: durationMs },
        })

        toolResults.push({
          type:        'tool_result',
          tool_use_id: toolUse.id,
          content:     toolOutput,
        })
      }

      // Append tool results so Claude can continue
      workingMessages.push({ role: 'user', content: toolResults })
    }

    if (!finalReply) {
      finalReply = 'I was unable to complete this request within the allowed number of steps.'
    }

    // Finalise agent_run
    await supabase
      .from('agent_runs')
      .update({
        status:       'completed',
        output:       { reply: finalReply },
        steps,
        tokens_input:  totalIn,
        tokens_output: totalOut,
        duration_ms:   Date.now() - startedAt,
        completed_at:  new Date().toISOString(),
      })
      .eq('id', agentRunId)

    // Record agent_run usage event
    await recordUsage({
      workspaceId,
      eventType:    'agent_run',
      model,
      tokensInput:  totalIn,
      tokensOutput: totalOut,
      conversationId,
      agentRunId,
      metadata:     { steps },
    })

    return { reply: finalReply, agentRunId, steps, tokensInput: totalIn, tokensOutput: totalOut }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)

    await supabase
      .from('agent_runs')
      .update({
        status:        'failed',
        error_message: message,
        duration_ms:   Date.now() - startedAt,
        completed_at:  new Date().toISOString(),
      })
      .eq('id', agentRunId)

    throw err
  }
}
