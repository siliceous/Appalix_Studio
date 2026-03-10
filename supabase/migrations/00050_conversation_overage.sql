-- Conversation overage billing support.
-- overage_item_id:      Stripe subscription item ID for the metered overage price.
--                       Stored so we can report usage records against it.
-- billing_period_start: Start of the current Stripe billing period.
--                       Used to count only this period's conversations for overage.

alter table workspaces
  add column if not exists overage_item_id      text,
  add column if not exists billing_period_start timestamptz;

comment on column workspaces.overage_item_id      is 'Stripe subscription item ID for the metered conversation-overage price';
comment on column workspaces.billing_period_start is 'Start of current Stripe billing period — used to count overage conversations';
