import type Anthropic from '@anthropic-ai/sdk'
import { retrieveContext, buildRagContext } from '../rag/retrieval.js'
import { supabase } from '../../lib/supabase.js'

// ---------------------------------------------------------------
// Tool definitions (declared to Claude)
// ---------------------------------------------------------------

export const BUILT_IN_TOOLS: Anthropic.Tool[] = [
  {
    name:        'rag_search',
    description: 'Search the workspace knowledge base for relevant information to answer the user\'s question. Use this before answering questions about products, policies, documentation, or anything that might be in the knowledge base.',
    input_schema: {
      type: 'object',
      properties: {
        query: {
          type:        'string',
          description: 'The search query — paraphrase the user\'s question into a clear, concise search query.',
        },
        max_results: {
          type:        'number',
          description: 'Maximum number of results to return (1–10, default 5).',
        },
      },
      required: ['query'],
    },
  },
  {
    name:        'http_request',
    description: 'Make an outbound HTTP GET or POST request to an external API or webhook. Only use when explicitly configured for this workspace.',
    input_schema: {
      type: 'object',
      properties: {
        url: {
          type:        'string',
          description: 'The URL to call.',
        },
        method: {
          type:        'string',
          enum:        ['GET', 'POST'],
          description: 'HTTP method.',
        },
        body: {
          type:        'object',
          description: 'JSON body for POST requests.',
        },
        headers: {
          type:        'object',
          description: 'Additional HTTP headers.',
        },
      },
      required: ['url', 'method'],
    },
  },
  {
    name:        'get_conversation_history',
    description: 'Retrieve recent messages from the current conversation for context.',
    input_schema: {
      type: 'object',
      properties: {
        limit: {
          type:        'number',
          description: 'Number of messages to retrieve (default 10).',
        },
      },
      required: [],
    },
  },
  {
    name:        'create_support_ticket',
    description: 'Create a support ticket when the user needs human assistance. Use when the bot cannot resolve the issue.',
    input_schema: {
      type: 'object',
      properties: {
        subject: {
          type:        'string',
          description: 'Brief subject line for the ticket.',
        },
        description: {
          type:        'string',
          description: 'Detailed description of the issue.',
        },
        priority: {
          type:        'string',
          enum:        ['low', 'medium', 'high', 'urgent'],
          description: 'Ticket priority.',
        },
      },
      required: ['subject', 'description'],
    },
  },
]

// ---------------------------------------------------------------
// Tool execution
// ---------------------------------------------------------------

export interface ToolExecutionContext {
  workspaceId:    string
  conversationId: string
  botId:          string
}

export interface ToolInput {
  query?:        string
  max_results?:  number
  url?:          string
  method?:       string
  body?:         Record<string, unknown>
  headers?:      Record<string, string>
  limit?:        number
  subject?:      string
  description?:  string
  priority?:     string
}

export async function executeTool(
  toolName: string,
  input:    ToolInput,
  ctx:      ToolExecutionContext,
): Promise<string> {
  switch (toolName) {
    case 'rag_search': {
      const chunks = await retrieveContext({
        workspaceId:    ctx.workspaceId,
        query:          input.query ?? '',
        matchCount:     Math.min(input.max_results ?? 5, 10),
        conversationId: ctx.conversationId,
      })
      if (chunks.length === 0) return 'No relevant information found in the knowledge base.'
      return buildRagContext(chunks)
    }

    case 'http_request': {
      if (!input.url || !input.method) return 'Error: url and method are required.'
      try {
        const res = await fetch(input.url, {
          method:  input.method,
          headers: { 'Content-Type': 'application/json', ...(input.headers ?? {}) },
          body:    input.method === 'POST' ? JSON.stringify(input.body ?? {}) : undefined,
          signal:  AbortSignal.timeout(15_000),
        })
        const text = await res.text()
        return `HTTP ${res.status}: ${text.slice(0, 2000)}`
      } catch (err) {
        return `Request failed: ${err instanceof Error ? err.message : String(err)}`
      }
    }

    case 'get_conversation_history': {
      const limit = Math.min(input.limit ?? 10, 20)
      const { data } = await supabase
        .from('messages')
        .select('role, content, created_at')
        .eq('conversation_id', ctx.conversationId)
        .in('role', ['user', 'assistant'])
        .order('created_at', { ascending: false })
        .limit(limit)

      if (!data || data.length === 0) return 'No conversation history yet.'
      return data.reverse().map((m) => `${m.role}: ${m.content}`).join('\n')
    }

    case 'create_support_ticket': {
      // Stub — integrate with Zendesk / Freshdesk / Linear in production
      const ticketId = `TKT-${Date.now().toString(36).toUpperCase()}`
      console.log(`[tool:create_support_ticket] workspace=${ctx.workspaceId} subject="${input.subject}" priority=${input.priority ?? 'medium'}`)
      return `Support ticket created successfully. Ticket ID: ${ticketId}. A human agent will follow up shortly.`
    }

    default:
      return `Unknown tool: ${toolName}`
  }
}
