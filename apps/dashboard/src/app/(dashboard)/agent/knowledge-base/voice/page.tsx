import { redirect } from 'next/navigation'
export default function VoiceKnowledgePage() {
  redirect('/bots?tab=knowledge-base&subtab=voice')
}
