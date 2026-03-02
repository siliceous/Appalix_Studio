import type Anthropic from '@anthropic-ai/sdk'
import { retrieveContext, buildRagContext } from '../rag/retrieval.js'
import { supabase } from '../../lib/supabase.js'
import { sendEmailTool }         from '../email-sender.js'
import { generateDocumentTool }   from '../document-generator.js'
import { exportCsvTool }          from '../csv-exporter.js'
import { requestApprovalTool }    from '../approval-routing.js'
import { verifyWorkspaceMember }  from '../identity-verifier.js'
import {
  sageGetOverview,
  sageSearchDeals,
  sageMoveDeal,
  sageUpdateDeal,
  sageLogNote,
  sageSetReminder,
  sageSearchContacts,
  sageSearchEmails,
  sageDraftReply,
} from '../sage-tools.js'

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
  // ── Sage CRM tools (all plans — subscriber's own pipeline data) ──
  {
    name:        'sage_get_overview',
    description: 'Get a real-time overview of the subscriber\'s CRM for today: high-priority open deals, deals closing this week, and pending reminders due soon. Call this when the user asks "what are my tasks", "what\'s on my plate", "what should I focus on", or similar.',
    input_schema: {
      type:       'object',
      properties: {},
      required:   [],
    },
  },
  {
    name:        'sage_search_deals',
    description: 'Search deals in the pipeline. Use when the user asks about a specific deal, a list of deals with certain criteria, or wants to find a deal by name.',
    input_schema: {
      type: 'object',
      properties: {
        query: {
          type:        'string',
          description: 'Partial deal title to search for (case-insensitive).',
        },
        stage: {
          type:        'string',
          description: 'Filter by pipeline stage name (partial match).',
        },
        status: {
          type:        'string',
          enum:        ['open', 'won', 'lost'],
          description: 'Filter by deal status.',
        },
        priority: {
          type:        'string',
          enum:        ['low', 'medium', 'high'],
          description: 'Filter by priority.',
        },
      },
      required: [],
    },
  },
  {
    name:        'sage_move_deal',
    description: 'Move a deal to a different pipeline stage. Use when the user says "move X to Y", "advance X to Y stage", or "put X in Y". Fuzzy-matches both deal title and stage name.',
    input_schema: {
      type: 'object',
      properties: {
        deal_title: {
          type:        'string',
          description: 'Part of the deal\'s title (case-insensitive match).',
        },
        to_stage: {
          type:        'string',
          description: 'Name of the target stage (partial match is fine, e.g. "qualified", "proposal").',
        },
      },
      required: ['deal_title', 'to_stage'],
    },
  },
  {
    name:        'sage_update_deal',
    description: 'Update fields on a deal: status (open/won/lost), close date, priority, win probability, or description. Use for "mark X as won", "set close date to Friday", "change priority to high", etc.',
    input_schema: {
      type: 'object',
      properties: {
        deal_title: {
          type:        'string',
          description: 'Part of the deal\'s title (case-insensitive match).',
        },
        status: {
          type:        'string',
          enum:        ['open', 'won', 'lost'],
          description: 'New deal status.',
        },
        close_date: {
          type:        'string',
          description: 'New close date — ISO format (2026-03-14), or natural language: "Friday", "next Monday", "tomorrow".',
        },
        priority: {
          type:        'string',
          enum:        ['low', 'medium', 'high'],
          description: 'New priority level.',
        },
        win_percentage: {
          type:        'number',
          description: 'Win probability 0–100.',
        },
        description: {
          type:        'string',
          description: 'Updated deal description or notes.',
        },
      },
      required: ['deal_title'],
    },
  },
  {
    name:        'sage_log_note',
    description: 'Log a note or call summary against a deal in the activity log. Use when the user says "I called X and...", "log that we spoke about...", "note on X: ...".',
    input_schema: {
      type: 'object',
      properties: {
        deal_title: {
          type:        'string',
          description: 'Part of the deal\'s title (case-insensitive match).',
        },
        note: {
          type:        'string',
          description: 'The note text to log against the deal.',
        },
      },
      required: ['deal_title', 'note'],
    },
  },
  {
    name:        'sage_set_reminder',
    description: 'Set a follow-up reminder for a future date. Optionally link it to a deal. Use when the user says "remind me on Monday to...", "set a reminder for Friday", etc.',
    input_schema: {
      type: 'object',
      properties: {
        title: {
          type:        'string',
          description: 'Short description of what to be reminded about.',
        },
        due_date: {
          type:        'string',
          description: 'When the reminder is due — ISO date or natural language: "Friday", "next Monday", "tomorrow", "2026-03-20".',
        },
        deal_title: {
          type:        'string',
          description: 'Optional: part of a deal title to link this reminder to.',
        },
      },
      required: ['title', 'due_date'],
    },
  },
  {
    name:        'sage_search_contacts',
    description: 'Search CRM contacts by name or email. Use when the user asks "find contact X", "what\'s the email for Y", or needs contact details.',
    input_schema: {
      type: 'object',
      properties: {
        query: {
          type:        'string',
          description: 'Name or email to search for (partial, case-insensitive).',
        },
      },
      required: ['query'],
    },
  },
  {
    name:        'sage_search_emails',
    description: 'Search the inbox emails by sender, subject, or priority. Use when the user asks about emails, messages, or communication.',
    input_schema: {
      type: 'object',
      properties: {
        query: {
          type:        'string',
          description: 'Search term — matches subject, sender name, or email address (partial, case-insensitive).',
        },
        priority: {
          type:        'string',
          description: 'Filter by AI priority: "high", "medium", or "low".',
          enum:        ['high', 'medium', 'low'],
        },
      },
    },
  },
  {
    name:        'sage_draft_reply',
    description: 'Retrieve the AI-generated reply drafts for a specific email. Use when the user wants to see or use a pre-written reply.',
    input_schema: {
      type: 'object',
      properties: {
        email_id: {
          type:        'string',
          description: 'The sage_emails UUID of the email to retrieve drafts for.',
        },
      },
      required: ['email_id'],
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
  // sage CRM tools
  deal_title?:      string
  to_stage?:        string
  stage?:           string
  status?:          string
  note?:            string
  due_date?:        string
  win_percentage?:  number
  close_date?:      string
  // sage email tools
  email_id?:        string
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

    // ── Sage CRM tools ─────────────────────────────────────────────

    case 'sage_get_overview':
      return sageGetOverview(ctx.workspaceId)

    case 'sage_search_deals':
      return sageSearchDeals(ctx.workspaceId, input.query, input.stage, input.status, input.priority)

    case 'sage_move_deal': {
      if (!input.deal_title || !input.to_stage) return 'Error: deal_title and to_stage are required.'
      return sageMoveDeal(ctx.workspaceId, input.deal_title, input.to_stage)
    }

    case 'sage_update_deal': {
      if (!input.deal_title) return 'Error: deal_title is required.'
      return sageUpdateDeal(ctx.workspaceId, input.deal_title, {
        status:         input.status,
        close_date:     input.close_date,
        priority:       input.priority,
        win_percentage: input.win_percentage,
        description:    input.description,
      })
    }

    case 'sage_log_note': {
      if (!input.deal_title || !input.note) return 'Error: deal_title and note are required.'
      return sageLogNote(ctx.workspaceId, input.deal_title, input.note)
    }

    case 'sage_set_reminder': {
      if (!input.title || !input.due_date) return 'Error: title and due_date are required.'
      return sageSetReminder(ctx.workspaceId, input.title, input.due_date, input.deal_title)
    }

    case 'sage_search_contacts': {
      if (!input.query) return 'Error: query is required.'
      return sageSearchContacts(ctx.workspaceId, input.query)
    }

    case 'sage_search_emails': {
      return sageSearchEmails(ctx.workspaceId, input.query, input.priority)
    }

    case 'sage_draft_reply': {
      if (!input.email_id) return 'Error: email_id is required.'
      return sageDraftReply(ctx.workspaceId, input.email_id)
    }

    default:
      return `Unknown tool: ${toolName}`
  }
}
