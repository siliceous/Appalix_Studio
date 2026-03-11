-- Back-fill user_id on sage_emails rows that still have NULL.
-- Assigns them to the workspace owner so they only appear for the owner,
-- not for newly-invited team members.

UPDATE sage_emails se
SET user_id = wm.user_id
FROM workspace_members wm
WHERE wm.workspace_id = se.workspace_id
  AND wm.role = 'owner'
  AND se.user_id IS NULL;
