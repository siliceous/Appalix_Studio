import { redirect } from 'next/navigation'

// This page has been merged into /bots. Redirect anyone who navigates here directly.
export default function AgentBotsRedirect() {
  redirect('/bots')
}
