/**
 * Gemini Live function declarations for Sage voice assistant.
 * Types must be UPPERCASE for v1alpha Live API.
 */

export const SAGE_LIVE_FUNCTION_DECLARATIONS = [
  {
    name: 'get_workspace_stats',
    description: "Get counts of all workspace entities: deals, contacts, tickets, forms, bots, conversations. Call this for: 'how many', 'count', 'total', 'how many forms/tickets/contacts/deals/bots do we have'.",
    parameters: { type: 'OBJECT', properties: {} },
  },
  {
    name: 'get_today_plate',
    description: "Get today's briefing: high-priority deals, deals closing soon, open tickets, and pending reminders. Call this for: 'what's on my plate', 'morning briefing', 'what should I focus on today', 'catch me up'.",
    parameters: { type: 'OBJECT', properties: {} },
  },
  {
    name: 'navigate_to',
    description: "Navigate the user to a page in the Appalix app. Use this when the user explicitly says 'go to', 'take me to', 'open the X page', or 'navigate to'. Do NOT call this just because the user asks about data — use the query tools instead. NOTE: If the user says 'open pipeline X' by name, use open_pipeline instead. If the user says 'open deal X', use open_deal instead. Available paths and their labels — Dashboard: /dashboard, Emails (triage): /dashboard/email, Bots activity: /dashboard/bots, Forms activity: /dashboard/forms, Tickets activity: /dashboard/tickets, SMS: /dashboard/sms, Phone Calls: /dashboard/calls, Pipelines/CRM: /sage/pipelines, Contacts: /sage/contacts, Projects: /sage/projects, Quotes & Invoices: /sage/quotes, Tickets: /sage/tickets, Emails (inbox): /sage/emails, ROI: /sage/roi, Rules/Automation: /sage/rules, Integrations (Sage): /sage/integrations, Bots: /bots, Conversations: /conversations, SMS Conversations: /conversations?platform=sms, Phone Calls page: /conversations?platform=voice, Integrations: /integrations, Knowledge Base/Sources: /sources, Forms: /dashboard/forms, Analytics: /analytics, My Activity: /my-activity, Settings (general): /settings — NOTE: there is NO /settings/general path, always use /settings for the main settings page. Settings > Profile: /settings/profile, Settings > Sage Voice: /settings/sage-voice, Settings > Automation: /settings/automation, Settings > Branding: /settings/branding, Settings > Invite: /settings/invite, Settings > Upgrade/billing: /settings/upgrade.",
    parameters: {
      type: 'OBJECT',
      properties: {
        path: { type: 'STRING', description: "App path to navigate to, e.g. '/sage/contacts' or '/dashboard'" },
      },
      required: ['path'],
    },
  },
  {
    name: 'find_contact',
    description: 'Search for a contact or lead by name, email, or company. Pass just the name — e.g. "Sarah", "John Smith", or "Acme Corp". Also use this when the user says "who is this", "show me this contact", or "details on this contact" when a contact is focused.',
    parameters: {
      type: 'OBJECT',
      properties: {
        query:      { type: 'STRING', description: 'Contact name, email, or company to search for — extract only the name/email, not the full sentence' },
        contact_id: { type: 'STRING', description: 'Contact ID if known from focusedEntity context — use instead of query' },
      },
    },
  },
  {
    name: 'list_deals',
    description: "List deals in the CRM. Call this when the user asks about deals, pipeline status, 'what deals do we have', 'show me our pipeline', or wants an overview of sales activity.",
    parameters: {
      type: 'OBJECT',
      properties: {
        status:  { type: 'STRING', description: "Filter by status: 'open', 'won', 'lost'. Omit for all." },
        limit:   { type: 'STRING', description: 'Max deals to return (default 10)' },
      },
    },
  },
  {
    name: 'list_tickets',
    description: "List support or internal tickets. Call this when the user asks about tickets, support queue, 'what tickets are open', or wants to see workload.",
    parameters: {
      type: 'OBJECT',
      properties: {
        status:   { type: 'STRING', description: "Filter by status: 'open', 'in_progress', 'resolved'. Omit for open tickets." },
        priority: { type: 'STRING', description: "Filter by priority: 'high', 'medium', 'low'. Omit for all." },
      },
    },
  },
  {
    name: 'list_projects',
    description: "List delivery projects. Call this when the user asks about projects, client delivery, 'what projects are active', or project status.",
    parameters: {
      type: 'OBJECT',
      properties: {
        status: { type: 'STRING', description: "Filter by status: 'onboarding', 'active', 'completed'. Omit for all active." },
      },
    },
  },
  {
    name: 'create_reminder',
    description: 'Create a follow-up reminder for a future date, optionally linked to a deal.',
    parameters: {
      type: 'OBJECT',
      properties: {
        title:      { type: 'STRING', description: 'What to remember — the reminder title' },
        due_date:   { type: 'STRING', description: "Due date — e.g. 'Friday', 'next Monday', '2026-04-01'" },
        deal_title: { type: 'STRING', description: 'Optional: deal name to link the reminder to' },
      },
      required: ['title', 'due_date'],
    },
  },
  {
    name: 'assign_deal',
    description: 'Assign a deal to a specific team member.',
    parameters: {
      type: 'OBJECT',
      properties: {
        deal_name:     { type: 'STRING', description: 'Deal name or part of it to search for' },
        deal_id:       { type: 'STRING', description: 'Deal ID if known (from focusedEntity context) — use instead of deal_name' },
        assignee_name: { type: 'STRING', description: 'Name of the team member to assign the deal to' },
      },
      required: ['assignee_name'],
    },
  },
  {
    name: 'move_deal_stage',
    description: 'Move a deal to a different stage in its pipeline.',
    parameters: {
      type: 'OBJECT',
      properties: {
        deal_name:  { type: 'STRING', description: 'Deal name or part of it to search for' },
        deal_id:    { type: 'STRING', description: 'Deal ID if known (from focusedEntity context) — use instead of deal_name' },
        stage_name: { type: 'STRING', description: 'Target pipeline stage name' },
      },
      required: ['stage_name'],
    },
  },
  {
    name: 'update_contact',
    description: 'Update a contact\'s details — email, phone, company, or notes.',
    parameters: {
      type: 'OBJECT',
      properties: {
        contact_name: { type: 'STRING', description: 'Contact name or part of it to search for' },
        contact_id:   { type: 'STRING', description: 'Contact ID if known (from focusedEntity context)' },
        field:        { type: 'STRING', description: 'Field to update: email, phone, company_name, or notes' },
        value:        { type: 'STRING', description: 'New value for the field' },
      },
      required: ['field', 'value'],
    },
  },
  {
    name: 'update_ticket',
    description: 'Update a ticket\'s status, priority, or assignee.',
    parameters: {
      type: 'OBJECT',
      properties: {
        ticket_title:  { type: 'STRING', description: 'Ticket title or part of it to search for' },
        ticket_id:     { type: 'STRING', description: 'Ticket ID if known (from focusedEntity context)' },
        status:        { type: 'STRING', description: 'New status: open, in_progress, resolved, closed' },
        priority:      { type: 'STRING', description: 'New priority: low, medium, high, urgent' },
        assignee_name: { type: 'STRING', description: 'Name of team member to assign ticket to' },
      },
    },
  },
  {
    name: 'add_note',
    description: 'Add a note to a deal, contact, or ticket.',
    parameters: {
      type: 'OBJECT',
      properties: {
        entity_type: { type: 'STRING', description: 'Entity type: deal, contact, or ticket' },
        entity_name: { type: 'STRING', description: 'Entity name to search for' },
        entity_id:   { type: 'STRING', description: 'Entity ID if known (from focusedEntity context)' },
        note:        { type: 'STRING', description: 'Note text to attach' },
      },
      required: ['entity_type', 'note'],
    },
  },
  {
    name: 'list_reminders',
    description: 'List upcoming and overdue reminders for this workspace.',
    parameters: {
      type: 'OBJECT',
      properties: {
        include_overdue: { type: 'STRING', description: 'Set to "true" to show only overdue reminders' },
      },
    },
  },
  {
    name: 'snooze_reminder',
    description: 'Snooze or reschedule a reminder to a new date.',
    parameters: {
      type: 'OBJECT',
      properties: {
        reminder_title: { type: 'STRING', description: 'Reminder title or part of it to search for' },
        snooze_until:   { type: 'STRING', description: 'New due date — e.g. "tomorrow", "next Monday", "2026-04-15"' },
      },
      required: ['reminder_title', 'snooze_until'],
    },
  },
  {
    name: 'create_ticket',
    description: 'Create a new support or internal ticket.',
    parameters: {
      type: 'OBJECT',
      properties: {
        title:       { type: 'STRING', description: 'Ticket title' },
        description: { type: 'STRING', description: 'Ticket details or body' },
        priority:    { type: 'STRING', description: 'Priority level: low, medium, or high (default: medium)' },
      },
      required: ['title'],
    },
  },
  {
    name: 'create_deal',
    description: 'Create a new contact and deal in the CRM pipeline.',
    parameters: {
      type: 'OBJECT',
      properties: {
        name:       { type: 'STRING', description: 'Contact / lead name' },
        email:      { type: 'STRING', description: 'Contact email address' },
        phone:      { type: 'STRING', description: 'Contact phone number' },
        company:    { type: 'STRING', description: 'Company name' },
        deal_title: { type: 'STRING', description: 'Deal title (defaults to contact name if omitted)' },
        notes:      { type: 'STRING', description: 'Any notes about this lead' },
      },
      required: ['name'],
    },
  },
  {
    name: 'open_deal',
    description: "Open a deal and navigate to its pipeline board. Use this when the user says 'open deal', 'show me the deal', 'pull up the deal', or 'show deal details' for a specific deal by name.",
    parameters: {
      type: 'OBJECT',
      properties: {
        deal_name: { type: 'STRING', description: 'Deal name or part of it to search for' },
      },
      required: ['deal_name'],
    },
  },
  {
    name: 'create_project_from_won_deal',
    description: 'Create a delivery project from a won deal to kick off work and track milestones.',
    parameters: {
      type: 'OBJECT',
      properties: {
        deal_name: { type: 'STRING', description: 'Won deal name or part of it' },
      },
      required: ['deal_name'],
    },
  },
  {
    name: 'list_emails',
    description: "List inbound emails. Call this when the user asks about emails, 'show me emails from X', 'emails today', 'high priority emails', or wants to find a specific email. Always call this first before read/reply/delete so the user can see email IDs.",
    parameters: {
      type: 'OBJECT',
      properties: {
        sender_name: { type: 'STRING', description: "Filter by sender name or email address — e.g. 'John', 'acme.com'" },
        priority:    { type: 'STRING', description: "Filter by AI priority: 'high', 'medium', or 'low'" },
        date_filter: { type: 'STRING', description: "Filter by date: 'today', 'yesterday', or 'this week'" },
        limit:       { type: 'STRING', description: 'Max emails to return (default 10)' },
      },
    },
  },
  {
    name: 'read_email',
    description: "Read the content and AI summary of a specific email. Use this when the user says 'read this email', 'what does it say', 'read the email from X', or wants details of an email.",
    parameters: {
      type: 'OBJECT',
      properties: {
        email_id:    { type: 'STRING', description: 'Email ID from list_emails result — use this when known' },
        sender_name: { type: 'STRING', description: 'Sender name to find the most recent email from them' },
      },
    },
  },
  {
    name: 'reply_to_email',
    description: "Reply to an email. Call this when the user says 'reply to this email', 'send a reply', or 'respond to X'. First call list_emails to get the email_id if not known.",
    parameters: {
      type: 'OBJECT',
      properties: {
        email_id:   { type: 'STRING', description: 'Email ID to reply to' },
        reply_body: { type: 'STRING', description: 'Optional: the reply message body if the user dictated it' },
      },
      required: ['email_id'],
    },
  },
  {
    name: 'ignore_email',
    description: "Ignore/archive an email — removes it from inbox. Use when the user says 'ignore this email', 'archive it', or 'dismiss it'.",
    parameters: {
      type: 'OBJECT',
      properties: {
        email_id: { type: 'STRING', description: 'Email ID to ignore' },
      },
      required: ['email_id'],
    },
  },
  {
    name: 'set_email_priority',
    description: "Set the priority of an email to high, medium, or low. Use when the user says 'mark this as high priority', 'set priority to medium', etc.",
    parameters: {
      type: 'OBJECT',
      properties: {
        email_id: { type: 'STRING', description: 'Email ID' },
        priority: { type: 'STRING', description: "Priority level: 'high', 'medium', or 'low'" },
      },
      required: ['email_id', 'priority'],
    },
  },
  {
    name: 'assign_email',
    description: "Assign an email to a team member. Use when the user says 'assign this to X', 'send this to X to handle'.",
    parameters: {
      type: 'OBJECT',
      properties: {
        email_id:      { type: 'STRING', description: 'Email ID' },
        assignee_name: { type: 'STRING', description: 'Name of the team member to assign the email to' },
      },
      required: ['email_id', 'assignee_name'],
    },
  },
  {
    name: 'delete_email',
    description: "Delete (trash) an email. Use when the user says 'delete this email', 'trash it'. This is irreversible via voice — always confirm first.",
    parameters: {
      type: 'OBJECT',
      properties: {
        email_id: { type: 'STRING', description: 'Email ID to delete' },
      },
      required: ['email_id'],
    },
  },
  {
    name: 'open_email',
    description: "Open a specific email in the email panel. Use when the user says 'open this email', 'show me this email', 'open the email from X'.",
    parameters: {
      type: 'OBJECT',
      properties: {
        email_id:    { type: 'STRING', description: 'Email ID to open' },
        sender_name: { type: 'STRING', description: 'Sender name — used to find the email if ID not known' },
      },
    },
  },
  {
    name: 'assign_lead',
    description: "Assign a form submission / lead to a team member. Use when the user says 'assign this lead to X', 'give this form submission to X', 'assign lead from Y to X'.",
    parameters: {
      type: 'OBJECT',
      properties: {
        assignee_name: { type: 'STRING', description: 'Name of the team member to assign to' },
        lead_id:       { type: 'STRING', description: 'Form submission ID if known (from focusedEntity context)' },
        lead_query:    { type: 'STRING', description: "Submitter name or email to search for if ID not known — e.g. 'Sarah Johnson'" },
      },
      required: ['assignee_name'],
    },
  },
  {
    name: 'set_lead_priority',
    description: "Change the priority of a form submission / lead. Use when the user says 'set this lead to high priority', 'mark the lead from X as low priority'.",
    parameters: {
      type: 'OBJECT',
      properties: {
        priority:   { type: 'STRING', description: "New priority: 'high', 'medium', or 'low'" },
        lead_id:    { type: 'STRING', description: 'Form submission ID if known (from focusedEntity context)' },
        lead_query: { type: 'STRING', description: 'Submitter name or email to search for if ID not known' },
      },
      required: ['priority'],
    },
  },
  {
    name: 'create_ticket_from_lead',
    description: "Create a support ticket from a form submission / lead. Use when the user says 'create a ticket from this lead', 'turn this form submission into a ticket', 'raise a ticket for this lead'.",
    parameters: {
      type: 'OBJECT',
      properties: {
        lead_id:    { type: 'STRING', description: 'Form submission ID if known (from focusedEntity context)' },
        lead_query: { type: 'STRING', description: 'Submitter name or email to search for if ID not known' },
        title:      { type: 'STRING', description: 'Optional ticket title override — defaults to the lead subject/summary' },
        priority:   { type: 'STRING', description: "Ticket priority: 'low', 'medium', 'high' (default: medium)" },
      },
    },
  },
  {
    name: 'create_deal_from_lead',
    description: "Create a contact and deal in the CRM from a form submission / lead. Use when the user says 'create a deal from this lead', 'add this lead to the pipeline', 'convert this form submission to a deal'.",
    parameters: {
      type: 'OBJECT',
      properties: {
        lead_id:    { type: 'STRING', description: 'Form submission ID if known (from focusedEntity context)' },
        lead_query: { type: 'STRING', description: 'Submitter name or email to search for if ID not known' },
      },
    },
  },
  {
    name: 'delete_lead',
    description: "Delete / ignore a form submission lead. Use when the user says 'delete this lead', 'ignore this form submission', 'remove this lead'.",
    parameters: {
      type: 'OBJECT',
      properties: {
        lead_id:    { type: 'STRING', description: 'Form submission ID if known (from focusedEntity context)' },
        lead_query: { type: 'STRING', description: 'Submitter name or email to search for if ID not known' },
      },
    },
  },
  {
    name: 'open_feed_item',
    description: "Open the detail popup for a specific email, bot conversation, form submission, or ticket directly on the current page without navigating away. ALWAYS use this on the dashboard when the user says 'open', 'show me', 'pull up', or 'show the [email/bot/form/ticket] from X'. Do NOT call list_emails first — call this directly with the sender name or subject as query. This is the primary tool for opening items on the dashboard.",
    parameters: {
      type: 'OBJECT',
      properties: {
        kind:    { type: 'STRING', description: "Item type: 'email', 'bot', 'form', or 'ticket'" },
        query:   { type: 'STRING', description: "Search term — sender name, subject, contact name, ticket title, etc." },
        item_id: { type: 'STRING', description: "Item ID if known — use instead of query" },
      },
      required: ['kind'],
    },
  },
  {
    name: 'open_pipeline',
    description: "Open a specific pipeline by name and navigate to its board. Use when the user says 'open pipeline X', 'go to the X pipeline', 'show me the X pipeline'.",
    parameters: {
      type: 'OBJECT',
      properties: {
        pipeline_name: { type: 'STRING', description: 'Pipeline name or part of it to search for' },
      },
      required: ['pipeline_name'],
    },
  },
  {
    name: 'list_tasks',
    description: "List pending or upcoming tasks from deals and projects. Call this when the user asks 'what tasks do I have', 'show me pending tasks', 'what's coming up', or wants to see their task list.",
    parameters: {
      type: 'OBJECT',
      properties: {
        status:      { type: 'STRING', description: "Filter by status: 'pending', 'in_progress', 'completed'. Omit for pending and in_progress." },
        entity_type: { type: 'STRING', description: "Filter by source: 'deal' or 'project'. Omit for both." },
      },
    },
  },
  {
    name: 'complete_task',
    description: "Mark a task as complete. Use when the user says 'mark task X as done', 'complete the task', 'finish task X', 'tick off task X'.",
    parameters: {
      type: 'OBJECT',
      properties: {
        task_title: { type: 'STRING', description: 'Task title or part of it to search for' },
        task_id:    { type: 'STRING', description: 'Task ID if known — use instead of task_title' },
      },
    },
  },
  {
    name: 'add_deal_task',
    description: "Add a task or to-do to a deal. Use when the user says 'add a task to deal X', 'create a task for X deal', 'remind me to do Y on deal X'.",
    parameters: {
      type: 'OBJECT',
      properties: {
        deal_name:  { type: 'STRING', description: 'Deal name or part of it to search for' },
        deal_id:    { type: 'STRING', description: 'Deal ID if known (from focusedEntity context) — use instead of deal_name' },
        task_title: { type: 'STRING', description: 'Task title / description' },
        due_date:   { type: 'STRING', description: "Optional due date — e.g. 'tomorrow', 'next Friday', '2026-04-10'" },
      },
      required: ['task_title'],
    },
  },
  {
    name: 'filter_activity_feed',
    description: "Filter the dashboard activity feed to show a specific channel type, optionally within a date range. Use when the user says 'show emails on the feed', 'filter to SMS', 'show phone calls', 'show only tickets', 'show conversations today', 'filter to forms this week', or 'show all activity'.",
    parameters: {
      type: 'OBJECT',
      properties: {
        filter:     { type: 'STRING', description: "One of: 'email', 'bot', 'sms', 'call', 'form', 'ticket', 'all'" },
        date_range: { type: 'STRING', description: "Optional date range — e.g. 'today', 'yesterday', 'this week', 'last week', 'this month', 'last month', 'past 7 days', 'past 30 days', 'from YYYY-MM-DD to YYYY-MM-DD'" },
      },
      required: ['filter'],
    },
  },
  {
    name: 'update_lead',
    description: "Update a lead/form submission's contact details. Use when the user says 'update the phone number', 'change the company name', 'add phone to lead X', 'set company to Y for this lead'.",
    parameters: {
      type: 'OBJECT',
      properties: {
        lead_id:    { type: 'STRING', description: 'Lead ID if known' },
        lead_query: { type: 'STRING', description: 'Lead name or email to search for if ID not known' },
        phone:      { type: 'STRING', description: 'New phone number' },
        company:    { type: 'STRING', description: 'New company name' },
        name:       { type: 'STRING', description: 'New contact name' },
        email:      { type: 'STRING', description: 'New contact email' },
      },
    },
  },
  {
    name: 'rename_conversation',
    description: "Rename or change the title of a conversation on the bots/conversations page. Use when the user says 'rename this conversation', 'change the title to X', 'call this conversation X'.",
    parameters: {
      type: 'OBJECT',
      properties: {
        conversation_id:    { type: 'STRING', description: 'Conversation ID if known (from focusedEntity context)' },
        conversation_title: { type: 'STRING', description: "Current conversation title or part of it to search for. Pass 'no title' if the conversation has no title or is untitled." },
        new_title:          { type: 'STRING', description: 'New title for the conversation' },
      },
      required: ['new_title'],
    },
  },
  {
    name: 'list_sms',
    description: "List recent SMS conversations. Call this when the user asks about text messages, SMS, 'show me texts', 'any SMS today', 'who texted us', or wants to see incoming SMS activity.",
    parameters: {
      type: 'OBJECT',
      properties: {
        contact_name: { type: 'STRING', description: "Filter by contact name or phone number — e.g. 'John', '+1555'" },
        date_range:   { type: 'STRING', description: "Filter by date: 'today', 'yesterday', 'this week', 'last week', 'past N days'" },
        priority:     { type: 'STRING', description: "Filter by AI priority: 'high', 'medium', or 'low'" },
        limit:        { type: 'STRING', description: 'Max results to return (default 10)' },
      },
    },
  },
  {
    name: 'list_phone_calls',
    description: "List recent phone/voice call conversations. Call this when the user asks about calls, 'show me calls', 'any calls today', 'who called us', or wants to see incoming call activity.",
    parameters: {
      type: 'OBJECT',
      properties: {
        contact_name: { type: 'STRING', description: "Filter by contact name or phone number" },
        date_range:   { type: 'STRING', description: "Filter by date: 'today', 'yesterday', 'this week', 'last week', 'past N days'" },
        priority:     { type: 'STRING', description: "Filter by AI priority: 'high', 'medium', or 'low'" },
        limit:        { type: 'STRING', description: 'Max results to return (default 10)' },
      },
    },
  },
]
