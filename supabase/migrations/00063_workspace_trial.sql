-- Ensure trial_ends_at is set for all trialing workspaces that don't have it yet.
-- New workspaces get trial_ends_at set by the createWorkspace server action.

update workspaces
  set trial_ends_at = created_at + interval '7 days'
  where subscription_status = 'trialing'
    and trial_ends_at is null;
