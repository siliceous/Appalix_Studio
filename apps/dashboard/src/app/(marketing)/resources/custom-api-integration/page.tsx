import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Custom API Integration — Connect Appalix to Any Platform | Developer Guide',
  description:
    'Use the Appalix Custom API to power chat in any app, mobile app, or internal tool. Full REST API reference, authentication, request/response formats, and code examples.',
  keywords: [
    'Appalix custom API',
    'chatbot REST API',
    'AI chat API integration',
    'custom chatbot backend',
    'Appalix developer guide',
  ],
}

export default function CustomApiIntegrationPage() {
  return (
    <div className="pt-24 pb-24 px-6">
      <div className="max-w-3xl mx-auto">

        <div className="flex items-center gap-2 text-sm text-gray-500 mb-10">
          <Link href="/resources" className="hover:text-brand-400 transition-colors">Resources</Link>
          <span>/</span>
          <span className="text-gray-400">Custom API Integration</span>
        </div>

        <div className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-xs px-2 py-0.5 rounded-full bg-brand-600/15 text-brand-400 border border-brand-600/20 font-medium">Developer Guide</span>
            <span className="text-xs text-gray-500">10 min read · All plans</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white leading-tight mb-4">
            Custom API Integration — Connect Appalix to Any Platform
          </h1>
          <p className="text-gray-400 text-lg leading-relaxed">
            The Appalix Custom API lets you integrate AI chat into any application — mobile apps, internal tools, CRMs, or completely custom frontends. Send a message, get a reply. Everything else (RAG, memory, lead capture, human handoff) happens automatically behind the scenes.
          </p>
        </div>

        <div className="border-t border-white/10 mb-10" />

        <div className="prose prose-invert prose-brand max-w-none space-y-10 text-gray-300">

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">What you&apos;ll need</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>An <strong className="text-white">Appalix account</strong> on any plan</li>
              <li>A <strong className="text-white">Custom API integration</strong> created in your dashboard</li>
              <li>The ability to make <strong className="text-white">HTTP POST requests</strong> from your application</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Step 1 — Create a Custom API integration</h2>
            <ol className="list-decimal pl-5 space-y-3">
              <li>Go to <strong className="text-white">Integrations → Add integration</strong> and choose <strong className="text-white">Custom API</strong>.</li>
              <li>Name the integration and select a bot. Click <strong className="text-white">Create integration</strong>.</li>
              <li>Open the integration setup page — you&apos;ll find your <strong className="text-white">API Key</strong> and <strong className="text-white">Endpoint URL</strong> there.</li>
            </ol>
            <p className="mt-3 text-sm text-gray-400">
              The API key is generated automatically when you create the integration. It cannot be recovered after creation, so copy it to a secure location. If you lose it, delete and recreate the integration.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">API Reference</h2>

            <h3 className="text-base font-semibold text-white mt-5 mb-2">POST /chat/custom/:integrationId</h3>
            <p>Send a message and receive the AI reply synchronously.</p>

            <h4 className="text-sm font-semibold text-white mt-4 mb-2">Request headers</h4>
            <pre className="bg-white/5 border border-white/10 rounded-xl p-4 text-sm text-brand-300 overflow-x-auto">{`Content-Type: application/json
x-api-key: sk-YourApiKeyHere`}</pre>

            <h4 className="text-sm font-semibold text-white mt-4 mb-2">Request body</h4>
            <pre className="bg-white/5 border border-white/10 rounded-xl p-4 text-sm text-brand-300 overflow-x-auto">{`{
  "message": "What are your pricing plans?",   // required
  "user_id": "user_abc123",                    // optional — identifies the user
  "conversation_id": "conv_xyz789"             // optional — resumes an existing conversation
}`}</pre>

            <h4 className="text-sm font-semibold text-white mt-4 mb-2">Response body</h4>
            <pre className="bg-white/5 border border-white/10 rounded-xl p-4 text-sm text-brand-300 overflow-x-auto">{`{
  "reply": "We offer four plans: Starter, Core, Pro, and Scale...",
  "conversation_id": "conv_xyz789"
}`}</pre>

            <p className="mt-3">
              Pass the returned <code className="bg-white/10 px-1.5 py-0.5 rounded text-brand-300">conversation_id</code> back in subsequent requests to maintain conversation history and memory.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Code examples</h2>

            <h3 className="text-base font-semibold text-white mt-5 mb-2">cURL</h3>
            <pre className="bg-white/5 border border-white/10 rounded-xl p-4 text-sm text-brand-300 overflow-x-auto">{`curl -X POST 'https://api.appalix.ai/chat/custom/your-integration-id' \\
  -H 'Content-Type: application/json' \\
  -H 'x-api-key: sk-YourApiKey' \\
  -d '{"message":"Hello!","user_id":"user_123"}'`}</pre>

            <h3 className="text-base font-semibold text-white mt-6 mb-2">JavaScript / TypeScript</h3>
            <pre className="bg-white/5 border border-white/10 rounded-xl p-4 text-sm text-brand-300 overflow-x-auto">{`const ENDPOINT = 'https://api.appalix.ai/chat/custom/your-integration-id'
const API_KEY  = 'sk-YourApiKey'

async function chat(message: string, conversationId?: string) {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY,
    },
    body: JSON.stringify({ message, conversation_id: conversationId }),
  })
  if (!res.ok) throw new Error(\`Appalix error: \${res.status}\`)
  return res.json() as Promise<{ reply: string; conversation_id: string }>
}

// Usage
const { reply, conversation_id } = await chat('What can you help with?')
console.log(reply)
// Continue the conversation
const next = await chat('Tell me more', conversation_id)`}</pre>

            <h3 className="text-base font-semibold text-white mt-6 mb-2">Python</h3>
            <pre className="bg-white/5 border border-white/10 rounded-xl p-4 text-sm text-brand-300 overflow-x-auto">{`import requests

ENDPOINT = 'https://api.appalix.ai/chat/custom/your-integration-id'
API_KEY  = 'sk-YourApiKey'

def chat(message, conversation_id=None):
    res = requests.post(
        ENDPOINT,
        headers={'Content-Type': 'application/json', 'x-api-key': API_KEY},
        json={'message': message, 'conversation_id': conversation_id},
        timeout=30,
    )
    res.raise_for_status()
    return res.json()

data = chat('What services do you offer?')
print(data['reply'])
followup = chat('How much does it cost?', data['conversation_id'])`}</pre>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Error codes</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-2 pr-6 text-white font-semibold">Status</th>
                    <th className="text-left py-2 text-white font-semibold">Meaning</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {[
                    ['200', 'Success — reply returned'],
                    ['400', 'Missing or empty message field'],
                    ['401', 'Invalid or missing x-api-key header'],
                    ['404', 'Integration not found — check the integration ID'],
                    ['429', 'Rate limit or monthly message quota exceeded'],
                    ['500', 'Internal server error — retry with exponential back-off'],
                  ].map(([code, desc]) => (
                    <tr key={code}>
                      <td className="py-2 pr-6">
                        <code className="bg-white/10 px-1.5 py-0.5 rounded text-brand-300">{code}</code>
                      </td>
                      <td className="py-2 text-gray-400">{desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Tips &amp; best practices</h2>
            <ul className="list-disc pl-5 space-y-3">
              <li><strong className="text-white">Always pass conversation_id</strong> — store it client-side after the first message and include it in every subsequent request to enable memory and context.</li>
              <li><strong className="text-white">Keep the API key server-side</strong> — never expose it in browser JavaScript or mobile app bundles. Route all API calls through your backend.</li>
              <li><strong className="text-white">Set a timeout</strong> — AI responses typically arrive within 3–8 seconds, but set a 30-second timeout to handle rare slow responses gracefully.</li>
              <li><strong className="text-white">Handle 429 gracefully</strong> — on rate limit errors, surface a friendly &quot;I&apos;m busy right now, try again in a moment&quot; message and retry after 5 seconds.</li>
              <li><strong className="text-white">Allowed IPs</strong> — in the integration edit page you can restrict API calls to specific IP addresses (e.g. your server IPs) for an extra layer of security.</li>
            </ul>
          </section>

          <section className="rounded-2xl bg-brand-600/10 border border-brand-600/20 p-6 text-center mt-12">
            <p className="text-2xl mb-3">⚙️</p>
            <h3 className="text-lg font-semibold text-white mb-2">Build your custom integration</h3>
            <p className="text-sm text-gray-400 mb-5">
              Create a Custom API integration in Appalix, grab your endpoint and key, and start making API calls from your application.
            </p>
            <Link
              href="/integrations/new"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-xl transition-colors"
            >
              Go to Integrations →
            </Link>
          </section>

        </div>

        <div className="mt-16 pt-8 border-t border-white/10 flex items-center justify-between flex-wrap gap-4">
          <Link href="/resources" className="text-sm text-brand-400 hover:text-brand-300 transition-colors">
            ← Back to Resources
          </Link>
          <Link href="/platforms" className="text-sm text-brand-400 hover:text-brand-300 transition-colors">
            View all platforms →
          </Link>
        </div>

      </div>
    </div>
  )
}
