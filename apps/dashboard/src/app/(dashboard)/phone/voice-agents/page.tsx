import { redirect } from 'next/navigation'
export default function VoiceAgentsPage() {
  redirect('/bots?tab=phone-agents')
}
