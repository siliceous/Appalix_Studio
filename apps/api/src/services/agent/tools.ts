import type Anthropic from '@anthropic-ai/sdk'
import { retrieveContext, buildRagContext } from '../rag/retrieval.js'
import { supabase } from '../../lib/supabase.js'
import { sendEmailTool }         from '../email-sender.js'
import { generateDocumentTool }   from '../document-generator.js'
import { exportCsvTool }          from '../csv-exporter.js'
import { requestApprovalTool }    from '../approval-routing.js'
import { verifyWorkspaceMember }  from '../identity-verifier.js'

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
  // ── Identity verification (all plans — security feature) ─────────
  {
    name:        'verify_identity',
    description: 'Verify that the current user is a registered workspace member by checking their email address against the team roster. Call this immediately when the user provides an email for identity verification purposes.',
    input_schema: {
      type: 'object',
      properties: {
        email: {
          type:        'string',
          description: 'The email address provided by the user.',
        },
      },
      required: ['email'],
    },
  },
  // ── Pro+ automation tools ────────────────────────────────────────
  {
    name:        'send_email',
    description: 'Send an email to one or more recipients. Use when the user explicitly asks to email something — a summary, report, recap, or notification — to a specific address.',
    input_schema: {
      type: 'object',
      properties: {
        to: {
          type:        'string',
          description: 'Recipient email address.',
        },
        subject: {
          type:        'string',
          description: 'Email subject line.',
        },
        body: {
          type:        'string',
          description: 'Email body text. Use plain text unless html is true.',
        },
        html: {
          type:        'boolean',
          description: 'Set to true if body contains HTML markup.',
        },
      },
      required: ['to', 'subject', 'body'],
    },
  },
  {
    name:        'generate_document',
    description: 'Generate a formatted document (proposal, report, summary, or custom) from provided content. Uploads it and returns a shareable download link.',
    input_schema: {
      type: 'object',
      properties: {
        type: {
          type:        'string',
          enum:        ['proposal', 'report', 'summary', 'custom'],
          description: 'Document type.',
        },
        title: {
          type:        'string',
          description: 'Document title.',
        },
        content: {
          type:        'string',
          description: 'Document body in Markdown or plain text.',
        },
      },
      required: ['type', 'title', 'content'],
    },
  },
  {
    name:        'export_csv',
    description: 'Export conversation messages or captured lead data to CSV. Optionally POST the CSV to a webhook URL.',
    input_schema: {
      type: 'object',
      properties: {
        data_type: {
          type:        'string',
          enum:        ['leads', 'conversations'],
          description: 'What to export.',
        },
        webhook_url: {
          type:        'string',
          description: 'Optional — POST the CSV to this URL (e.g. a Zapier or Make webhook).',
        },
      },
      required: ['data_type'],
    },
  },
  {
    name:        'request_approval',
    description: 'Create an approval request and notify the designated approver via email or Slack. Use when the user needs a manager or admin to review and approve something.',
    input_schema: {
      type: 'object',
      properties: {
        title: {
          type:        'string',
          description: 'Short title for the approval request.',
        },
        description: {
          type:        'string',
          description: 'What needs to be approved and why.',
        },
        channel: {
          type:        'string',
          enum:        ['email', 'slack'],
          description: 'How to notify the approver.',
        },
        metadata: {
          type:        'object',
          description: 'Optional extra data (e.g. order_id, amount, requester name).',
        },
      },
      required: ['title', 'description', 'channel'],
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
  workspacePlan?: string
}

export interface ToolInput {
  // existing tools
  query?:        string
  max_results?:  number
  url?:          string
  method?:       string
  body?:         Record<string, unknown> | string
  headers?:      Record<string, string>
  limit?:        number
  subject?:      string
  description?:  string
  priority?:     string
  // verify_identity
  email?:        string
  // send_email
  to?:           string
  html?:         boolean
  // generate_document
  type?:         string
  title?:        string
  content?:      string
  // export_csv
  data_type?:    string
  webhook_url?:  string
  // request_approval
  channel?:      string
  metadata?:     Record<string, unknown>
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

    // ── Pro+ automation tools ──────────────────────────────────────

    case 'send_email': {
      if (!input.to || !input.subject || !input.body) return 'Error: to, subject, and body are required.'
      return sendEmailTool({ to: input.to, subject: input.subject, body: input.body as string, html: input.html }, ctx)
    }

    case 'generate_document': {
      if (!input.type || !input.title || !input.content) return 'Error: type, title, and content are required.'
      return generateDocumentTool({ type: input.type, title: input.title, content: input.content }, ctx)
    }

    case 'export_csv': {
      if (!input.data_type) return 'Error: data_type is required.'
      return exportCsvTool({ data_type: input.data_type as 'leads' | 'conversations', webhook_url: input.webhook_url }, ctx)
    }

    case 'request_approval': {
      if (!input.title || !input.description || !input.channel) return 'Error: title, description, and channel are required.'
      return requestApprovalTool({ title: input.title, description: input.description, channel: input.channel as 'email' | 'slack', metadata: input.metadata }, ctx)
    }

    case 'verify_identity': {
      if (!input.email) return 'Error: email is required.'
      const result = await verifyWorkspaceMember(input.email, ctx.workspaceId, ctx.conversationId)
      if (result.success) {
        return `Identity verified. Welcome, ${result.name} (${result.email}). You can now access sensitive information and share it with registered contacts via email.`
      }
      return `Verification failed: ${result.reason} Please check the email address and try again, or contact your administrator.`
    }

    default:
      return `Unknown tool: ${toolName}`
  }
}
